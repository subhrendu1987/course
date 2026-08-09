import json
import os
import config

# ==========================================
# 🌐 CONFIGURATION & PATH SETUP
# ==========================================
ANNOTATION_PATH = getattr(config, "ANNOTATION_PATH", "Dataset/Annotated/")
IOU_THRESHOLD = getattr(config, "IOU_THRESHOLD", 0.05)  # Max allowed IoU overlap
ROW_TOLERANCE = getattr(config, "ROW_TOLERANCE", 0.08)
ImageName = getattr(config, "IMAGE_NAME", "")

# Safely construct Full Paths
if hasattr(config, "get_annotation_path"):
    FULL_ANNOTATION_PATH = config.get_annotation_path(ImageName)
else:
    FULL_ANNOTATION_PATH = os.path.join(ANNOTATION_PATH, ImageName + ".json")

CLEANED_ANNOTATION_PATH = FULL_ANNOTATION_PATH


def yolo_to_corner_bbox(box_str):
    """Converts normalized YOLO format string (cls x_c y_c w h) to corner format [x1, y1, x2, y2]."""
    parts = box_str.strip().split()
    cls_id = int(parts[0])
    x_c, y_c, w, h = map(float, parts[1:])

    x1 = x_c - (w / 2.0)
    y1 = y_c - (h / 2.0)
    x2 = x_c + (w / 2.0)
    y2 = y_c + (h / 2.0)

    return cls_id, [x1, y1, x2, y2], (x_c, y_c, w, h)


def convert_body_box_to_face_box(x_c, y_c, w, h, face_ratio=0.35):
    """Refines a full/upper-body bounding box to isolate only the student's face area."""
    y_top = y_c - (h / 2.0)
    new_h = h * face_ratio
    new_w = w * 0.85
    new_y_c = y_top + (new_h / 2.0)

    return x_c, new_y_c, new_w, new_h


def calculate_iou(boxA, boxB):
    """Calculates Intersection over Union (IoU) between two bounding boxes [x1, y1, x2, y2]."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
    if interArea == 0:
        return 0.0

    boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])

    return interArea / float(boxAArea + boxBArea - interArea)


def resolve_overlap_shrink(boxA, boxB, shrink_factor=0.95):
    """Shrinks two overlapping boxes towards their respective centers until IoU decreases."""
    # Compute center for boxA
    wA = boxA[2] - boxA[0]
    hA = boxA[3] - boxA[1]
    cxA = boxA[0] + wA / 2.0
    cyA = boxA[1] + hA / 2.0

    # Compute center for boxB
    wB = boxB[2] - boxB[0]
    hB = boxB[3] - boxB[1]
    cxB = boxB[0] + wB / 2.0
    cyB = boxB[1] + hB / 2.0

    # Apply shrinkage symmetrically
    new_wA, new_hA = wA * shrink_factor, hA * shrink_factor
    new_wB, new_hB = wB * shrink_factor, hB * shrink_factor

    new_boxA = [
        cxA - new_wA / 2.0,
        cyA - new_hA / 2.0,
        cxA + new_wA / 2.0,
        cyA + new_hA / 2.0,
    ]
    new_boxB = [
        cxB - new_wB / 2.0,
        cyB - new_hB / 2.0,
        cxB + new_wB / 2.0,
        cyB + new_hB / 2.0,
    ]

    return new_boxA, new_boxB


def minimize_overlaps_without_removal(yolo_list, target_iou=IOU_THRESHOLD, face_ratio=0.35, max_iterations=50):
    """Keeps 100% of bounding boxes and iteratively contracts overlapping box dimensions."""
    if not yolo_list:
        return []

    parsed_boxes = []
    for item in yolo_list:
        if isinstance(item, str):
            parts = item.strip().split()
            if len(parts) < 5:
                continue
            cls_id, corner_box, (x_c, y_c, w, h) = yolo_to_corner_bbox(item)
        elif isinstance(item, dict):
            bbox = item.get("bbox", item.get("box", []))
            if len(bbox) == 4:
                cls_id = int(item.get("class", 0))
                x_c, y_c, w, h = map(float, bbox)
            else:
                continue
        else:
            continue

        # Convert to face region
        face_xc, face_yc, face_w, face_h = convert_body_box_to_face_box(
            x_c, y_c, w, h, face_ratio=face_ratio
        )

        x1 = face_xc - (face_w / 2.0)
        y1 = face_yc - (face_h / 2.0)
        x2 = face_xc + (face_w / 2.0)
        y2 = face_yc + (face_h / 2.0)

        parsed_boxes.append({
            "class": cls_id,
            "corner": [x1, y1, x2, y2],
        })

    # Iterative overlap resolution pass
    for _ in range(max_iterations):
        has_overlap = False
        for i in range(len(parsed_boxes)):
            for j in range(i + 1, len(parsed_boxes)):
                box1 = parsed_boxes[i]["corner"]
                box2 = parsed_boxes[j]["corner"]

                iou = calculate_iou(box1, box2)
                if iou > target_iou:
                    has_overlap = True
                    # Shrink both boxes slightly to minimize overlap area
                    parsed_boxes[i]["corner"], parsed_boxes[j]["corner"] = resolve_overlap_shrink(
                        box1, box2, shrink_factor=0.96
                    )

        if not has_overlap:
            break

    # Reconstruct updated YOLO representations
    final_boxes = []
    for b in parsed_boxes:
        x1, y1, x2, y2 = b["corner"]
        w = max(0.001, x2 - x1)
        h = max(0.001, y2 - y1)
        x_c = x1 + (w / 2.0)
        y_c = y1 + (h / 2.0)

        yolo_str = f"{b['class']} {x_c:.4f} {y_c:.4f} {w:.4f} {h:.4f}"

        final_boxes.append({
            "class": b["class"],
            "corner": [x1, y1, x2, y2],
            "yolo_str": yolo_str,
            "x_center": x_c,
            "y_center": y_c,
        })

    return final_boxes


def sort_boxes_by_position(boxes, row_tolerance=ROW_TOLERANCE):
    """Sorts bounding boxes top-to-bottom, left-to-right row by row."""
    if not boxes:
        return []

    boxes_sorted_y = sorted(boxes, key=lambda b: b["y_center"])

    rows = []
    current_row = [boxes_sorted_y[0]]

    for box in boxes_sorted_y[1:]:
        if abs(box["y_center"] - current_row[0]["y_center"]) <= row_tolerance:
            current_row.append(box)
        else:
            rows.append(sorted(current_row, key=lambda b: b["x_center"]))
            current_row = [box]

    if current_row:
        rows.append(sorted(current_row, key=lambda b: b["x_center"]))

    final_sorted_yolo_strings = []
    for row in rows:
        for box in row:
            final_sorted_yolo_strings.append(box["yolo_str"])

    return final_sorted_yolo_strings


def cleanup_and_sort_json(iou_threshold=IOU_THRESHOLD, row_tolerance=ROW_TOLERANCE):
    if not os.path.exists(FULL_ANNOTATION_PATH):
        print(f"❌ Error: File '{FULL_ANNOTATION_PATH}' not found.")
        return

    with open(FULL_ANNOTATION_PATH, "r") as f:
        raw_data = json.load(f)

    if isinstance(raw_data, dict):
        raw_data = raw_data.get("annotations", raw_data.get("labels", []))

    initial_count = len(raw_data)

    # 1. Adjust overlapping bounding boxes without dropping any boxes
    adjusted_boxes = minimize_overlaps_without_removal(raw_data, target_iou=iou_threshold)

    # 2. Sort by spatial positions (Row by Row, Left to Right)
    sorted_yolo_strings = sort_boxes_by_position(adjusted_boxes, row_tolerance=row_tolerance)

    final_count = len(sorted_yolo_strings)

    os.makedirs(os.path.dirname(CLEANED_ANNOTATION_PATH), exist_ok=True)

    with open(CLEANED_ANNOTATION_PATH, "w") as f:
        json.dump(sorted_yolo_strings, f, indent=2)

    print(f"🧹 Overlap Reduction & Position Sorting Complete for '{ImageName}.json':")
    print(f"   ├─ Initial Box Count : {initial_count}")
    print(f"   ├─ Final Box Count   : {final_count} (No Boxes should be removed)")
    print(f"   └─ Position Sorting  : Top-to-Bottom, Left-to-Right (row-by-row)")


if __name__ == "__main__":
    cleanup_and_sort_json(iou_threshold=IOU_THRESHOLD, row_tolerance=ROW_TOLERANCE)