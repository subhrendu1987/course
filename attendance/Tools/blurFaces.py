import json
import os
import cv2
import numpy as np
import config

# ==========================================
# 🌐 CONFIGURATION & PATH SETUP
# ==========================================
IMAGE_PATH = getattr(config, "IMAGE_PATH", "Dataset/RawPicture/")
ANNOTATION_PATH = getattr(config, "ANNOTATION_PATH", "Dataset/Annotated/")
PREVIEW_PATH = getattr(config, "PREVIEW_PATH", "Dataset/Preview/")
BLURRED_PATH = getattr(config, "BLURRED_PATH", "Dataset/Blurred/")
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

OUTPUT_IMAGE_PATH = os.path.join(BLURRED_PATH, f"{ImageName}{IMAGE_EXTN}")


def convert_yolo_to_pixel_coords(box_str, img_w, img_h):
    """Converts normalized YOLO string to pixel coordinates [x1, y1, x2, y2]."""
    parts = box_str.strip().split()
    if len(parts) < 5:
        return None

    _, x_c, y_c, w, h = map(float, parts[:5])

    x1 = int(max(0, (x_c - w / 2.0) * img_w))
    y1 = int(max(0, (y_c - h / 2.0) * img_h))
    x2 = int(min(img_w, (x_c + w / 2.0) * img_w))
    y2 = int(min(img_h, (y_c + h / 2.0) * img_h))

    return x1, y1, x2, y2


def load_annotations(json_path):
    """Loads annotations from a JSON file."""
    if not os.path.exists(json_path):
        print(f"⚠️ Warning: Annotation file '{json_path}' not found.")
        return []

    with open(json_path, "r") as f:
        data = json.load(f)

    if isinstance(data, dict):
        data = data.get("annotations", data.get("labels", []))

    return data


def extract_faces_and_blur_background(
    img_path=FULL_IMAGE_PATH,
    json_path=FULL_ANNOTATION_PATH,
    output_path=OUTPUT_IMAGE_PATH,
    blur_kernel_size=(51, 51),
):
    """Keeps bounding box face areas sharp, blurs the rest, and draws boxes + index tags."""
    if not os.path.exists(img_path):
        print(f"❌ Error: Image file '{img_path}' not found.")
        return

    # Load Image
    image = cv2.imread(img_path)
    if image is None:
        print(f"❌ Error: Could not read image at '{img_path}'.")
        return

    img_h, img_w, _ = image.shape

    # Load Annotations
    annotations = load_annotations(json_path)
    if not annotations:
        print(f"⚠️ Warning: No annotations found in '{json_path}'.")
        return

    # Create 1-channel binary mask initialized to zero (black)
    mask = np.zeros((img_h, img_w), dtype=np.uint8)
    parsed_coords = []

    # Parse coordinates & fill face mask
    for idx, item in enumerate(annotations, start=1):
        if isinstance(item, str):
            box_str = item
        elif isinstance(item, dict):
            bbox = item.get("bbox", item.get("box", []))
            cls_id = item.get("class", 0)
            if len(bbox) == 4:
                box_str = f"{cls_id} {bbox[0]} {bbox[1]} {bbox[2]} {bbox[3]}"
            else:
                continue
        else:
            continue

        coords = convert_yolo_to_pixel_coords(box_str, img_w, img_h)
        if coords:
            x1, y1, x2, y2 = coords
            parsed_coords.append((idx, x1, y1, x2, y2))
            # Fill mask area for face sharpness
            cv2.rectangle(mask, (x1, y1), (x2, y2), color=255, thickness=-1)

    # Blur full background
    blurred_image = cv2.GaussianBlur(image, blur_kernel_size, 0)

    # Combine sharp face regions with blurred background
    mask_3ch = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    final_result = np.where(mask_3ch == 255, image, blurred_image)

    # Draw Green Bounding Boxes and Serial Tags on the final image
    for idx, x1, y1, x2, y2 in parsed_coords:
        color = (0, 255, 0)
        cv2.rectangle(final_result, (x1, y1), (x2, y2), color, 2)

        label = f"#{idx}"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.5
        font_thickness = 1

        (label_w, label_h), _ = cv2.getTextSize(label, font, font_scale, font_thickness)

        tag_y1 = y1 - label_h - 4
        if tag_y1 < 0:
            tag_y1 = y1
            text_y = y1 + label_h + 2
        else:
            text_y = y1 - 2

        cv2.rectangle(
            final_result,
            (x1, tag_y1),
            (x1 + label_w + 4, tag_y1 + label_h + 6),
            color,
            -1,
        )
        cv2.putText(
            final_result,
            label,
            (x1 + 2, text_y),
            font,
            font_scale,
            (0, 0, 0),
            font_thickness,
            cv2.LINE_AA,
        )

    # Save output image
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, final_result)

    print(f"✅ Successfully processed blurred output for '{ImageName}'")
    print(f"   ├─ Extracted Bounding Boxes : {len(parsed_coords)}")
    print(f"   └─ Saved Output to          : '{output_path}'")


if __name__ == "__main__":
    extract_faces_and_blur_background()