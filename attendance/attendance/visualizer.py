import json
import os
from datetime import datetime
import cv2
import numpy as np
from PIL import Image
from PIL.ExifTags import TAGS
import config

# ==========================================
# 🌐 CONFIGURATION & PATH SETUP
# ==========================================
# Load from config or set defaults
IMAGE_PATH = getattr(config, "IMAGE_PATH", "Dataset/RawPicture/")
ANNOTATION_PATH = getattr(config, "ANNOTATION_PATH", "Dataset/Annotated/")
PREVIEW_PATH = getattr(config, "PREVIEW_PATH", getattr(config, "ANNOTATION_PATH", "Dataset/Annotated/"))
IMAGE_EXTN = getattr(config, "IMAGE_EXTN", ".jpg")
ImageName = getattr(config, "IMAGE_NAME", "")


# Construct Full Paths safely
if hasattr(config, "get_image_path"):
    FULL_IMAGE_PATH = config.get_image_path(ImageName)
else:
    FULL_IMAGE_PATH = os.path.join(IMAGE_PATH, ImageName + IMAGE_EXTN)

if hasattr(config, "get_annotation_path"):
    FULL_ANNOTATION_PATH = config.get_annotation_path(ImageName)
else:
    FULL_ANNOTATION_PATH = os.path.join(ANNOTATION_PATH, ImageName + ".json")

OUTPUT_IMAGE_PATH = os.path.join(PREVIEW_PATH, f"{ImageName}{IMAGE_EXTN}")


def get_original_photo_time(img_path):
    """Extracts original EXIF timestamp if available; otherwise falls back to file creation/modification time."""
    try:
        pil_img = Image.open(img_path)
        exif_data = pil_img._getexif()

        if exif_data:
            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag in ["DateTimeOriginal", "DateTime"]:
                    dt = datetime.strptime(str(value), "%Y:%m:%d %H:%M:%S")
                    return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        pass

    # Fallback: File modification date if EXIF metadata isn't embedded
    if os.path.exists(img_path):
        mod_time = os.path.getmtime(img_path)
        return datetime.fromtimestamp(mod_time).strftime("%Y-%m-%d %H:%M:%S")

    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def load_annotations(json_path):
    """Loads annotations from a JSON file.

    Handles list of YOLO strings or list of dictionary objects.
    """
    if not os.path.exists(json_path):
        print(f"⚠️ Warning: Annotation file '{json_path}' not found.")
        return []

    with open(json_path, "r") as f:
        data = json.load(f)

    # Extract annotations list if stored under standard keys
    if isinstance(data, dict):
        data = data.get("annotations", data.get("labels", []))

    return data


def annotate_image(img_path, json_path, output_path):
    # Load Image
    image = cv2.imread(img_path)
    if image is None:
        print(f"❌ Error: Could not load image at path '{img_path}'.")
        return

    img_h, img_w, _ = image.shape

    # Load Annotations from JSON
    annotations = load_annotations(json_path)

    # Draw boxes & serial tags
    for idx, item in enumerate(annotations, start=1):
        # Extract normalized YOLO coordinates (x_center, y_center, width, height)
        if isinstance(item, str):
            parts = item.strip().split()
            if len(parts) < 5:
                continue
            _, x_center, y_center, width, height = map(float, parts[:5])
        elif isinstance(item, dict):
            bbox = item.get("bbox", item.get("box", []))
            if len(bbox) == 4:
                x_center, y_center, width, height = map(float, bbox)
            else:
                continue
        else:
            continue

        # Convert YOLO normalized format to pixel coordinates
        x1 = max(0, int((x_center - width / 2) * img_w))
        y1 = max(0, int((y_center - height / 2) * img_h))
        x2 = min(img_w, int((x_center + width / 2) * img_w))
        y2 = min(img_h, int((y_center + height / 2) * img_h))

        # Draw bounding box (Green)
        color = (0, 255, 0)
        cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)

        # Draw serial number tag
        label = f"#{idx}"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.5
        font_thickness = 1

        (label_w, label_h), baseline = cv2.getTextSize(
            label, font, font_scale, font_thickness
        )

        # Handle top edge clipping: Place text inside box if near top edge
        tag_y1 = y1 - label_h - 4
        if tag_y1 < 0:
            tag_y1 = y1
            text_y = y1 + label_h + 2
        else:
            text_y = y1 - 2

        cv2.rectangle(
            image, (x1, tag_y1), (x1 + label_w + 4, tag_y1 + label_h + 6), color, -1
        )
        cv2.putText(
            image,
            label,
            (x1 + 2, text_y),
            font,
            font_scale,
            (0, 0, 0),
            font_thickness,
            cv2.LINE_AA,
        )

    # 1. Top-Left Overlay: Headcount Banner
    total_count = len(annotations)
    banner_text = f"Total Headcount: {total_count}"
    cv2.rectangle(image, (10, 10), (330, 55), (0, 0, 0), -1)
    cv2.putText(
        image,
        banner_text,
        (20, 42),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 0),
        2,
        cv2.LINE_AA,
    )

    # 2. Top-Right Overlay: Photo Taken Timestamp
    photo_timestamp = get_original_photo_time(img_path)
    time_text = f"Timestamp: {photo_timestamp}"
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.9
    font_thickness = 2

    (time_w, time_h), _ = cv2.getTextSize(
        time_text, font, font_scale, font_thickness
    )
    top_right_x = img_w - time_w - 20

    cv2.rectangle(
        image,
        (top_right_x - 10, 10),
        (img_w - 10, 20 + time_h + 10),
        (0, 0, 0),
        -1,
    )
    cv2.putText(
        image,
        time_text,
        (top_right_x, 15 + time_h),
        font,
        font_scale,
        (255, 255, 255),
        font_thickness,
        cv2.LINE_AA,
    )

    # Ensure output directory exists before saving
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Save Annotated Image
    cv2.imwrite(output_path, image)
    print(f"✅ Successfully processed visualizer output for '{ImageName}'")
    print(f"   ├─ Total Headcount  : {total_count}")
    print(f"   ├─ Photo Timestamp  : {photo_timestamp}")
    print(f"   └─ Saved Preview    : '{output_path}'")


if __name__ == "__main__":
    annotate_image(FULL_IMAGE_PATH, FULL_ANNOTATION_PATH, OUTPUT_IMAGE_PATH)