import json
import os
import cv2
import config
import tkinter as tk

# ==========================================
# 🌐 CONFIGURATION & PATH SETUP
# ==========================================
IMAGE_PATH = getattr(config, "IMAGE_PATH", "Dataset/RawPicture/")
ANNOTATION_PATH = getattr(config, "ANNOTATION_PATH", "Dataset/Annotated/")
IMAGE_EXTN = getattr(config, "IMAGE_EXTN", ".jpg")
ImageName = getattr(config, "IMAGE_NAME", "")

# Safely construct Full Paths
if hasattr(config, "get_image_path"):
    FULL_IMAGE_PATH = config.get_image_path(ImageName)
else:
    FULL_IMAGE_PATH = os.path.join(IMAGE_PATH, ImageName + IMAGE_EXTN)

if hasattr(config, "get_annotation_path"):
    FULL_ANNOTATION_PATH = config.get_annotation_path(ImageName)
else:
    FULL_ANNOTATION_PATH = os.path.join(ANNOTATION_PATH, ImageName + ".json")

# Global tracking variables
drawing = False
ix, iy = -1, -1
temp_image = None
current_image = None
raw_image = None

# Separate tracking lists for existing and new annotations
existing_boxes = []  # Drawn in GREEN
new_yolo_boxes = []  # Drawn in RED


def load_existing_annotations(json_path):
    """Loads existing annotations from JSON file into normalized YOLO strings."""
    if not os.path.exists(json_path):
        print(f"⚠️ Notice: '{json_path}' not found. A new file will be created on save.")
        return []

    with open(json_path, "r") as f:
        data = json.load(f)

    if isinstance(data, dict):
        data = data.get("annotations", data.get("labels", []))

    normalized = []
    for item in data:
        if isinstance(item, str):
            parts = item.strip().split()
            if len(parts) >= 5:
                normalized.append(" ".join(parts[:5]))
        elif isinstance(item, dict):
            bbox = item.get("bbox", item.get("box", []))
            if len(bbox) == 4:
                cls_id = item.get("class", 0)
                normalized.append(
                    f"{cls_id} {bbox[0]:.4f} {bbox[1]:.4f} {bbox[2]:.4f} {bbox[3]:.4f}"
                )

    return normalized


def yolo_to_pixels(box_str, img_w, img_h):
    """Converts normalized YOLO string into pixel coordinates [x1, y1, x2, y2]."""
    parts = box_str.strip().split()
    _, x_c, y_c, w, h = map(float, parts[:5])

    x1 = int((x_c - w / 2.0) * img_w)
    y1 = int((y_c - h / 2.0) * img_h)
    x2 = int((x_c + w / 2.0) * img_w)
    y2 = int((y_c + h / 2.0) * img_h)

    return x1, y1, x2, y2


def redraw_canvas():
    """Renders existing (GREEN) and newly added (RED) bounding boxes."""
    global current_image, temp_image, raw_image, existing_boxes, new_yolo_boxes

    current_image = raw_image.copy()
    img_h, img_w, _ = current_image.shape

    # 1. Render Existing Annotations (GREEN)
    for idx, box_str in enumerate(existing_boxes, start=1):
        x1, y1, x2, y2 = yolo_to_pixels(box_str, img_w, img_h)
        cv2.rectangle(current_image, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(
            current_image,
            f"#{idx}",
            (x1, max(y1 - 5, 12)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.4,
            (0, 255, 0),
            1,
            cv2.LINE_AA,
        )

    # 2. Render Newly Added Annotations (RED)
    for idx, box_str in enumerate(new_yolo_boxes, start=1):
        x1, y1, x2, y2 = yolo_to_pixels(box_str, img_w, img_h)
        cv2.rectangle(current_image, (x1, y1), (x2, y2), (0, 0, 255), 2)
        cv2.putText(
            current_image,
            f"NEW #{idx}",
            (x1, max(y1 - 5, 12)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.4,
            (0, 0, 255),
            1,
            cv2.LINE_AA,
        )

    temp_image = current_image.copy()


def handle_right_click_delete(click_x, click_y):
    """Deletes a bounding box if right-clicked inside its bounds."""
    global existing_boxes, new_yolo_boxes, current_image

    img_h, img_w, _ = current_image.shape

    # 1. Check NEW boxes (RED) in reverse order
    for idx in range(len(new_yolo_boxes) - 1, -1, -1):
        x1, y1, x2, y2 = yolo_to_pixels(new_yolo_boxes[idx], img_w, img_h)
        if x1 <= click_x <= x2 and y1 <= click_y <= y2:
            removed = new_yolo_boxes.pop(idx)
            print(f"🗑️ Deleted New Box #{idx + 1}: {removed}")
            redraw_canvas()
            return

    # 2. Check EXISTING boxes (GREEN) in reverse order
    for idx in range(len(existing_boxes) - 1, -1, -1):
        x1, y1, x2, y2 = yolo_to_pixels(existing_boxes[idx], img_w, img_h)
        if x1 <= click_x <= x2 and y1 <= click_y <= y2:
            removed = existing_boxes.pop(idx)
            print(f"🗑️ Deleted Existing Box #{idx + 1}: {removed}")
            redraw_canvas()
            return


def draw_mouse_bbox(event, x, y, flags, param):
    """Mouse callback to handle click-and-drag drawing and right-click deletion."""
    global ix, iy, drawing, temp_image, current_image, new_yolo_boxes

    img_h, img_w, _ = current_image.shape

    # 🟢 Left Click: Start Box
    if event == cv2.EVENT_LBUTTONDOWN:
        drawing = True
        ix, iy = x, y

    # 🟡 Drag: Draw Preview Box
    elif event == cv2.EVENT_MOUSEMOVE:
        if drawing:
            temp_image = current_image.copy()
            cv2.rectangle(temp_image, (ix, iy), (x, y), (0, 0, 255), 2)

    # 🔴 Left Release: Commit Box
    elif event == cv2.EVENT_LBUTTONUP:
        if drawing:
            drawing = False
            x1, y1 = min(ix, x), min(iy, y)
            x2, y2 = max(ix, x), max(iy, y)

            if (x2 - x1) > 5 and (y2 - y1) > 5:
                width = (x2 - x1) / img_w
                height = (y2 - y1) / img_h
                x_center = (x1 + (x2 - x1) / 2) / img_w
                y_center = (y1 + (y2 - y1) / 2) / img_h

                yolo_str = f"0 {x_center:.4f} {y_center:.4f} {width:.4f} {height:.4f}"
                new_yolo_boxes.append(yolo_str)
                print(f"➕ Added Box #{len(new_yolo_boxes)}: {yolo_str}")

                redraw_canvas()

    # 🔴 Right Click: Delete Box under cursor
    elif event == cv2.EVENT_RBUTTONDOWN:
        handle_right_click_delete(x, y)


def run_interactive_annotator():
    global current_image, temp_image, raw_image, existing_boxes, new_yolo_boxes

    # 1. Read Input Image
    raw_image = cv2.imread(FULL_IMAGE_PATH)
    if raw_image is None:
        print(f"❌ Error: Could not open image at '{FULL_IMAGE_PATH}'")
        return

    # 2. Load Existing Annotations
    existing_boxes = load_existing_annotations(FULL_ANNOTATION_PATH)
    new_yolo_boxes = []

    redraw_canvas()

    # 3. GUI Controls Setup
    window_name = f"Annotator | 'S': Save | Right-Click: Delete | 'Z': Undo | 'Q': Quit"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    # ---------------------------------------------------------
    # 🪟 MAXIMIZE WINDOW WITH TOOLBARS VISIBLE
    # ---------------------------------------------------------
    root = tk.Tk()
    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()
    root.destroy()

    # Reserve offset for system toolbars/taskbar (e.g., ~70px vertically)
    window_width = screen_width
    window_height = screen_height - 70

    cv2.resizeWindow(window_name, window_width, window_height)
    cv2.moveWindow(window_name, 0, 0)
    # ---------------------------------------------------------
    cv2.setMouseCallback(window_name, draw_mouse_bbox)

    print("\n" + "=" * 50)
    print(" 🖱️ INTERACTIVE ANNOTATOR CONTROLS")
    print("=" * 50)
    print("• Left-Click & Drag : Draw a new box (RED)")
    print("• Right-Click Box   : Delete box under cursor")
    print("• Press 'Z'         : Undo last drawn box")
    print("• Press 'R'         : Reset newly added boxes")
    print("• Press 'S'         : Save changes to JSON file")
    print("• Press 'Q' or ESC  : Exit without saving\n")

    while True:
        cv2.imshow(window_name, temp_image)
        key = cv2.waitKey(20) & 0xFF

        # Save Changes ('S')
        if key in (ord("s"), ord("S")):
            all_annotations = existing_boxes + new_yolo_boxes

            os.makedirs(os.path.dirname(FULL_ANNOTATION_PATH), exist_ok=True)
            with open(FULL_ANNOTATION_PATH, "w") as f:
                json.dump(all_annotations, f, indent=2)

            print(f"\n✅ SUCCESS! Updated file: '{FULL_ANNOTATION_PATH}'")
            print(f"   └─ Total Saved Annotations: {len(all_annotations)}")
            break

        # Undo Last Addition ('Z')
        elif key in (ord("z"), ord("Z")):
            if new_yolo_boxes:
                removed = new_yolo_boxes.pop()
                print(f"↩️ Undid box: {removed}")
                redraw_canvas()
            else:
                print("⚠️ No new boxes to undo.")

        # Reset Unsaved New Boxes ('R')
        elif key in (ord("r"), ord("R")):
            if new_yolo_boxes:
                new_yolo_boxes.clear()
                print("🔄 Reset all unsaved new boxes.")
                redraw_canvas()

        # Exit Without Saving ('Q' or ESC)
        elif key in (ord("q"), ord("Q"), 27):
            print("\n❌ Exited without saving changes.")
            break

    cv2.destroyAllWindows()
    cv2.waitKey(1)


if __name__ == "__main__":
    run_interactive_annotator()