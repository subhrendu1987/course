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
    # STEP 3: Optional Cleanup, Face Bbox Refinement & Sorting
    # ---------------------------------------------------------
    print_banner(3, "CLEANUP & ROW SORTING (OPTIONAL)")
    
    # Ask the user if they want to perform cleanup
    user_choice = input("👉 Do you want to run face cleanup & row-by-row sorting? (y/N): ").strip().lower()

    if user_choice in ("y", "yes"):
        print("\n🧹 Executing Cleanup...")
        cleanup.cleanup_and_sort_json(
            iou_threshold=config.IOU_THRESHOLD, 
            row_tolerance=config.ROW_TOLERANCE
        )
    else:
        print("\n⏩ Skipped cleanup & sorting. Keeping manual annotations as-is.")

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