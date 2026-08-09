#!/bin/bash

set -e

PROJECT="ClassCount"

echo "Creating project: $PROJECT"

# ------------------------------------------------------------------
# Root
# ------------------------------------------------------------------

mkdir -p "$PROJECT"
cd "$PROJECT"

touch README.md
touch LICENSE
touch .gitignore

# ------------------------------------------------------------------
# Frontend
# ------------------------------------------------------------------

mkdir -p frontend/{css,js,icons,fonts,models}

touch frontend/index.html
touch frontend/annotate.html
touch frontend/dashboard.html
touch frontend/review.html

touch frontend/css/style.css
touch frontend/css/toolbar.css
touch frontend/css/dashboard.css

touch frontend/js/app.js
touch frontend/js/canvas.js
touch frontend/js/annotation.js
touch frontend/js/toolbar.js
touch frontend/js/history.js
touch frontend/js/detector.js
touch frontend/js/api.js
touch frontend/js/export.js
touch frontend/js/shortcuts.js
touch frontend/js/utils.js

touch frontend/models/yolov11n.onnx

# ------------------------------------------------------------------
# Dataset
# ------------------------------------------------------------------

mkdir -p dataset/{RawPicture,Annotated,Labels,Export/{YOLO,COCO,PascalVOC,CSV},Backup}

touch dataset/RawPicture/manifest.json

# ------------------------------------------------------------------
# Backend
# ------------------------------------------------------------------

mkdir -p backend/{GoogleAppsScript,Documentation}

touch backend/GoogleAppsScript/Code.gs
touch backend/GoogleAppsScript/Config.gs
touch backend/GoogleAppsScript/appsscript.json

# ------------------------------------------------------------------
# Documentation
# ------------------------------------------------------------------

mkdir -p docs/screenshots

touch docs/workflow.md
touch docs/api.md

# ------------------------------------------------------------------
# Tools
# ------------------------------------------------------------------

mkdir -p tools

touch tools/generate_manifest.py
touch tools/convert_to_yolo.py
touch tools/convert_to_coco.py
touch tools/statistics.py

# ------------------------------------------------------------------
# Optional placeholder files so Git keeps empty directories
# ------------------------------------------------------------------

find . -type d -empty -exec touch {}/.gitkeep \;

echo
echo "======================================"
echo "Project structure created successfully."
echo "======================================"

tree . 2>/dev/null || find .
