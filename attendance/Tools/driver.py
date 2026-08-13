import os
import sys
import config

# Import modules from your project files
import visualizer
import annotate
import cleanup


def print_banner(step_num, title):
    """Utility to print step headers cleanly."""
    print("\n" + "=" * 60)
    print(f" 🚀 STEP {step_num}: {title}")
    print("=" * 60)


def run_pipeline():
    # Fetch parameters resolved dynamically from config.py / CLI flags
    image_name = config.IMAGE_NAME
    image_path = config.get_image_path(image_name)
    annotation_path = config.get_annotation_path(image_name)
    preview_path = os.path.join(config.PREVIEW_PATH, f"{image_name}{config.IMAGE_EXTN}")

    print_banner(0, f"STARTING ATTENDANCE PIPELINE FOR '{image_name}'")
    print(f" 📂 Target Image       : {image_path}")
    print(f" 📝 Target Annotation  : {annotation_path}")
    print(f" 🖼️ Output Preview     : {preview_path}")

    # Check if raw image exists before proceeding
    if not os.path.exists(image_path):
        print(f"\n❌ Error: Raw image file not found at '{image_path}'.")
        print("Please check your file paths or specify a valid file with -f / --file.")
        if os.path.exists(config.IMAGE_PATH):
            # List available files in IMAGE_PATH without extension
            files = [ os.path.splitext(f)[0] for f in os.listdir(config.IMAGE_PATH) if os.path.isfile(os.path.join(config.IMAGE_PATH, f))]
            if files:
                print(f"\n📁 Available files in '{config.IMAGE_PATH}':")
                for file_name in files:
                    print(f"   • {file_name}")
            else:
                print(f"\n📁 No files found in '{config.IMAGE_PATH}'.")
        else:
            print(f"\n📁 Directory '{config.IMAGE_PATH}' does not exist.")
        sys.exit(1)

    # ---------------------------------------------------------
    # STEP 1: Generate Initial Visualizer Preview
    # ---------------------------------------------------------
    print_banner(1, "GENERATING INITIAL VISUALIZATION PREVIEW")
    visualizer.annotate_image(image_path, annotation_path, preview_path)

    # ---------------------------------------------------------
    # STEP 2: Launch Interactive Annotator for Fine-Tuning
    # ---------------------------------------------------------
    print_banner(2, "LAUNCHING INTERACTIVE ANNOTATOR")
    print("💡 Adjust bounding boxes in the window that opens:")
    print("   • Press 'S' to save changes.")
    print("   • Press 'Q' or ESC to skip fine-tuning.")
    
    # Run interactive OpenCV GUI tool
    annotate.run_interactive_annotator()

# ---------------------------------------------------------
    # STEP 3: Cleanup & Row Sorting Options
    # ---------------------------------------------------------
    print_banner(3, "CLEANUP & ROW SORTING OPTIONS")
    print(" Choose an option:")
    print("   [1] Run Full Cleanup (Face Refinement + NMS Overlap Removal) & Row Sorting")
    print("   [2] Run Row Sorting ONLY (Keep existing box dimensions)")
    print("   [3] Run Cleanup ONLY (Face Refinement + NMS Overlap Removal)")
    print("   [4] Skip Cleanup & Sorting")

    choice = input("\n👉 Enter option number (1-4, default is 1): ").strip()

    if choice == "2":
        print("\n📌 Running Row Sorting Only...")
        cleanup.sort_only(
            row_tolerance=config.ROW_TOLERANCE
        )
    elif choice == "3":
        print("\n🧹 Running Cleanup Only...")
        cleanup.cleanup_only(
            iou_threshold=config.IOU_THRESHOLD
        )
    elif choice == "4":
        print("\n⏩ Skipped cleanup & sorting. Keeping manual annotations as-is.")
    else:
        # Default option 1
        print("\n🧹 Executing Full Cleanup & Row Sorting...")
        cleanup.cleanup_and_sort_json(
            iou_threshold=config.IOU_THRESHOLD, 
            row_tolerance=config.ROW_TOLERANCE
        )
    # ---------------------------------------------------------
    # STEP 4: Regenerate Final Visualizer Preview
    # ---------------------------------------------------------
    print_banner(4, "GENERATING FINAL VISUALIZATION PREVIEW")
    visualizer.annotate_image(image_path, annotation_path, preview_path)

    print("\n" + "🎉" * 25)
    print(f" Pipeline execution completed successfully for '{image_name}'!")
    print(f" Final preview saved at: {preview_path}")
    print("🎉" * 25 + "\n")


if __name__ == "__main__":
    run_pipeline()