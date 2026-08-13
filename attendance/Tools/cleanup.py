import json
import os
import config

# ==========================================
# 🌐 CONFIGURATION & PATH SETUP
# ==========================================
ANNOTATION_PATH = getattr(config, "ANNOTATION_PATH", "Dataset/Annotated/")
IOU_THRESHOLD = getattr(config, "IOU_THRESHOLD", 0.45)
ROW_TOLERANCE = getattr(config, "ROW_TOLERANCE", 0.08)
ImageName = getattr(config, "IMAGE_NAME", "")

# Safely construct Full Paths
if hasattr(config, "get_annotation_path"):
    FULL_ANNOTATION_PATH = config.get_annotation_path(ImageName)
else:
    FULL_ANNOTATION_PATH = os.path.join(ANNOTATION_PATH, ImageName + ".json")

CLEANED_ANNOTATION_PATH = FULL_ANNOTATION_PATH


def yolo_to_corner_bbox(box_str):
    """Converts normalized YOLO format string (x_center, y_center, width, height)
    to corner format (x1, y1, x2, y2).
    """
    parts = box_str.strip().split()
    cls_id = int(parts[0])
    x_c, y_c, w, h = map(float, parts[1:])

    x1 = x_c - (w / 2.0)
    y1 = y_c - (h / 2.0)
    x2 = x_c + (w / 2.0)
    y2 = y_c + (h / 2.0)

    return cls_id, [x1, y1, x2, y2], (x_c, y_c, w, h)


def convert_body_box_to_face_box(x_c, y_c, w, h, face_ratio=0.35):
    """Refines a full/upper-body bounding box to isolate only the student's face.
    
    `face_ratio`: Percentage of original box height estimated to be the face (default 35%).
    """
    y_top = y_c - (h / 2.0)
    new_h = h * face_ratio
    new_w = w * 0.85
    new_y_c = y_top + (new_h / 2.0)

    return x_c, new_y_c, new_w, new_h


def parse_raw_yolo_item(item):
    """Parses a string or dict annotation entry into a standardized dictionary."""
    if isinstance(item, str):
        parts = item.strip().split()
        if len(parts) < 5:
            return None
        cls_id = int(parts[0])
        x_c, y_c, w, h = map(float, parts[1:])
    elif isinstance(item, dict):
        bbox = item.get("bbox", item.get("box", []))
        if len(bbox) == 4:
            cls_id = int(item.get("class", 0))
            x_c, y_c, w, h = map(float, bbox)
        else:
            return None
    else:
        return None

    x1 = x_c - (w / 2.0)
    y1 = y_c - (h / 2.0)
    x2 = x_c + (w / 2.0)
    y2 = y_c + (h / 2.0)

    return {
        "class": cls_id,
        "corner": [x1, y1, x2, y2],
        "yolo_str": f"{cls_id} {x_c:.4f} {y_c:.4f} {w:.4f} {h:.4f}",
        "x_center": x_c,
        "y_center": y_c,
        "area": (x2 - x1) * (y2 - y1),
    }


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


def non_max_suppression_yolo(yolo_list, iou_threshold=IOU_THRESHOLD, face_ratio=0.35, convert_faces=True):
    """Filters out overlapping bounding boxes and optionally converts body boxes to face-only areas."""
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

        if convert_faces:
            # 🎯 Refine Box -> Keep Only Face Region
            face_xc, face_yc, face_w, face_h = convert_body_box_to_face_box(
                x_c, y_c, w, h, face_ratio=face_ratio
            )
            x1 = face_xc - (face_w / 2.0)
            y1 = face_yc - (face_h / 2.0)
            x2 = face_xc + (face_w / 2.0)
            y2 = face_yc + (face_h / 2.0)
            yolo_str = f"{cls_id} {face_xc:.4f} {face_yc:.4f} {face_w:.4f} {face_h:.4f}"
            xc, yc = face_xc, face_yc
        else:
            x1 = x_c - (w / 2.0)
            y1 = y_c - (h / 2.0)
            x2 = x_c + (w / 2.0)
            y2 = y_c + (h / 2.0)
            yolo_str = f"{cls_id} {x_c:.4f} {y_c:.4f} {w:.4f} {h:.4f}"
            xc, yc = x_c, y_c

        parsed_boxes.append({
            "class": cls_id,
            "corner": [x1, y1, x2, y2],
            "yolo_str": yolo_str,
            "x_center": xc,
            "y_center": yc,
            "area": (x2 - x1) * (y2 - y1),
        })

    # Sort boxes by area before NMS to prioritize larger/clearer boxes
    parsed_boxes = sorted(parsed_boxes, key=lambda b: b["area"], reverse=True)

    keep_boxes = []
    while len(parsed_boxes) > 0:
        current = parsed_boxes.pop(0)
        keep_boxes.append(current)

        remaining = []
        for box in parsed_boxes:
            iou = calculate_iou(current["corner"], box["corner"])
            if iou < iou_threshold:
                remaining.append(box)

        parsed_boxes = remaining

    return keep_boxes


def sort_boxes_by_position(boxes, row_tolerance=ROW_TOLERANCE):
    """Sorts bounding boxes top-to-bottom, left-to-right row by row."""
    if not boxes:
        return []

    # If list consists of raw JSON items/strings, parse them into dict objects
    if isinstance(boxes[0], (str, dict)):
        parsed = []
        for item in boxes:
            p = parse_raw_yolo_item(item)
            if p:
                parsed.append(p)
        boxes = parsed

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


def load_annotation_file():
    """Helper to safely read JSON input file."""
    if not os.path.exists(FULL_ANNOTATION_PATH):
        print(f"❌ Error: File '{FULL_ANNOTATION_PATH}' not found.")
        return None

    with open(FULL_ANNOTATION_PATH, "r") as f:
        raw_data = json.load(f)

    if isinstance(raw_data, dict):
        raw_data = raw_data.get("annotations", raw_data.get("labels", []))

    return raw_data


def save_annotation_file(yolo_strings):
    """Helper to save output JSON file."""
    os.makedirs(os.path.dirname(CLEANED_ANNOTATION_PATH), exist_ok=True)
    with open(CLEANED_ANNOTATION_PATH, "w") as f:
        json.dump(yolo_strings, f, indent=2)


# ==========================================
# ⚙️ INDIVIDUAL TASK EXECUTORS
# ==========================================

def sort_only(row_tolerance=ROW_TOLERANCE):
    """Task 1: Performs ONLY spatial sorting without modifying box dimensions or removing overlaps."""
    raw_data = load_annotation_file()
    if raw_data is None:
        return

    sorted_yolo_strings = sort_boxes_by_position(raw_data, row_tolerance=row_tolerance)
    save_annotation_file(sorted_yolo_strings)

    print(f"📌 Position Sorting Complete for '{ImageName}.json':")
    print(f"   ├─ Total Boxes Sorted : {len(sorted_yolo_strings)}")
    print(f"   └─ Order               : Top-to-Bottom, Left-to-Right (row-by-row)")


def cleanup_only(iou_threshold=IOU_THRESHOLD, face_ratio=0.35):
    """Task 2: Performs ONLY face box refinement and overlap removal without spatial sorting."""
    raw_data = load_annotation_file()
    if raw_data is None:
        return

    initial_count = len(raw_data)
    cleaned_boxes = non_max_suppression_yolo(
        raw_data, iou_threshold=iou_threshold, face_ratio=face_ratio, convert_faces=True
    )
    cleaned_yolo_strings = [box["yolo_str"] for box in cleaned_boxes]
    save_annotation_file(cleaned_yolo_strings)

    final_count = len(cleaned_yolo_strings)
    print(f"🧹 Cleanup Only Complete for '{ImageName}.json':")
    print(f"   ├─ Initial Box Count : {initial_count}")
    print(f"   ├─ Overlaps Removed  : {initial_count - final_count}")
    print(f"   └─ Final Face Count  : {final_count}")


def cleanup_and_sort_json(iou_threshold=IOU_THRESHOLD, row_tolerance=ROW_TOLERANCE):
    """Task 3: Performs BOTH face cleanup (NMS + face conversion) AND row-by-row spatial sorting."""
    raw_data = load_annotation_file()
    if raw_data is None:
        return

    initial_count = len(raw_data)

    # 1. Convert to face-only + Remove IoU Overlaps
    cleaned_boxes = non_max_suppression_yolo(raw_data, iou_threshold=iou_threshold, convert_faces=True)

    # 2. Sort by spatial positions (Row by Row, Left to Right)
    sorted_yolo_strings = sort_boxes_by_position(cleaned_boxes, row_tolerance=row_tolerance)

    final_count = len(sorted_yolo_strings)
    save_annotation_file(sorted_yolo_strings)

    removed_count = initial_count - final_count
    print(f"🧹 Full Cleanup & Position Sorting Complete for '{ImageName}.json':")
    print(f"   ├─ Initial Box Count : {initial_count}")
    print(f"   ├─ Overlaps Removed  : {removed_count}")
    print(f"   ├─ Final Face Count  : {final_count}")
    print(f"   └─ Position Sorting  : Top-to-Bottom, Left-to-Right (row-by-row)")


if __name__ == "__main__":
    # Example execution: Runs full cleanup and sorting
    cleanup_and_sort_json(iou_threshold=IOU_THRESHOLD, row_tolerance=ROW_TOLERANCE)