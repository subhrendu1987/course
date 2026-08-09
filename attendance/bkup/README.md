# Collect Student Attandance Using Image Map
## Milestone
```
Development Plan

We'll build it in 10 milestones.

Milestone 1 — Project Skeleton
Folder structure
HTML pages
CSS theme
Asset organization
Dataset structure
Milestone 2 — Image Viewer
Canvas engine
Image loading
Fit-to-screen
Zoom
Pan
Milestone 3 — Annotation Engine
Draw rectangles
Select
Resize
Move
Delete
Serial numbers
Milestone 4 — YOLO Support
Read .txt
Write .txt
Class handling
Label rendering
Milestone 5 — Sidebar
Folder browser
Search
Previous/Next
Progress indicators
Milestone 6 — Dashboard
Statistics
Annotation counts
Missing labels
Completed images
Milestone 7 — Auto Detection
Python detector
YOLOv11 integration
JSON generation
Preview images
Milestone 8 — Visualizer
Open existing labels
Display detections
Read-only mode
Milestone 9 — GitHub Pages
Static hosting
Local storage
Optional Google Apps Script integration
Milestone 10 — Polish
Settings
Dark mode
Keyboard shortcuts
Documentation
Sample dataset
Releases
```

## Folder Structure
```
attendance/
│
├── README.md
├── LICENSE
├── .gitignore
│
├── frontend/                     # GitHub Pages website
│   │
│   ├── index.html                # Landing page
│   ├── annotate.html             # Annotation page
│   ├── dashboard.html            # Statistics & progress
│   ├── review.html               # Review completed annotations
│   │
│   ├── css/
│   │   ├── style.css
│   │   ├── toolbar.css
│   │   └── dashboard.css
│   │
│   ├── dataset/
│   │   │
│   │   ├── RawPicture/               # Original images (Never modify)
|   │   ├── 31_07_2026_2C7.jpg
|   │   │   ├── 31_07_2026_2C8.jpg
|   │   │   ├── 01_08_2026_2C7.jpg
|   │   │   └── manifest.json
|   │   │
|   │   ├── Annotated/                # Annotated preview images
|   │   │   ├── 31_07_2026_2C7_annotated.jpg
|   │   │   └── ...
|   │   │
|   │   ├── Labels/                   # Annotation JSON files
|   │   │   ├── 31_07_2026_2C7.json
|   │   │   ├── 31_07_2026_2C8.json
|   │   │   └── ...
|   │   │
|   │   ├── Export/
|   │   │   ├── YOLO/
|   │   │   ├── COCO/
|   │   │   ├── PascalVOC/
|   │   │   └── CSV/
|   │   │
│   │   └── Backup/
│   ├── js/
│   │   ├── app.js
│   │   ├── canvas.js
│   │   ├── annotation.js
│   │   ├── toolbar.js
│   │   ├── history.js
│   │   ├── detector.js
│   │   ├── api.js
│   │   ├── export.js
│   │   ├── shortcuts.js
│   │   └── utils.js
│   │
│   ├── icons/
│   ├── fonts/
│   └── models/
│       └── yolov11n.onnx
│
│
├── backend/
│   │
│   ├── GoogleAppsScript/
│   │   ├── Code.gs
│   │   ├── Config.gs
│   │   └── appsscript.json
│   │
│   └── Documentation/
│
├── docs/
│   ├── screenshots/
│   ├── workflow.md
│   └── api.md
│
└── tools/
    ├── generate_manifest.py
    ├── convert_to_yolo.py
    ├── convert_to_coco.py
    └── statistics.py


yolo-web-annotator/
│
├── frontend/
│   ├── index.html
│   ├── annotate.html
│   ├── visualize.html
│   ├── dashboard.html
│   ├── settings.html
│   │
│   ├── css/
│   │   ├── style.css
│   │   ├── canvas.css
│   │   ├── sidebar.css
│   │   └── dashboard.css
│   │
│   ├── js/
│   │   ├── app.js
│   │   ├── canvas.js
│   │   ├── annotations.js
│   │   ├── yolo.js
│   │   ├── sidebar.js
│   │   ├── dashboard.js
│   │   ├── settings.js
│   │   ├── api.js
│   │   ├── history.js
│   │   ├── keyboard.js
│   │   └── utils.js
│   │
│   ├── images/
│   ├── labels/
│   ├── annotations/
│   ├── previews/
│   └── assets/
│
├── detector/
│   ├── detect.py
│   ├── convert.py
│   ├── requirements.txt
│   └── models/
│
├── docs/
├── sample/
├── README.md
├── LICENSE
└── .gitignore

```
## Workflow
* After image uploding to `frontend/images/` 
```
bash ./tools/generate_manifest.sh
```  