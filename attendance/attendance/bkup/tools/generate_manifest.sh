#!/bin/bash

###############################################################################
# generate_manifest.sh
#
# Generates:
#   frontend/dataset/RawPicture/manifest.json
#   frontend/dataset/RawPicture/progress.json
#
# Expected filename format:
#   DD_MM_YYYY_CLASSNAME.jpg
#
# Example:
#   31_07_2026_2C7.jpg
#
###############################################################################

set -e

RAW_DIR="frontend/dataset/RawPicture"

MANIFEST="$RAW_DIR/manifest.json"
PROGRESS="$RAW_DIR/progress.json"

echo "Scanning $RAW_DIR..."

# Find image files
mapfile -t FILES < <(
find "$RAW_DIR" -maxdepth 1 -type f \
\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) \
| sort
)

###############################################################################
# Manifest
###############################################################################

{
echo "{"
echo '  "version": "1.0",'
echo '  "generated": "'"$(date -Iseconds)"'",'
echo '  "images": ['

COUNT=${#FILES[@]}

for ((i=0;i<COUNT;i++))
do

FILE=$(basename "${FILES[$i]}")
NAME="${FILE%.*}"

IFS='_' read -r DD MM YYYY CLASS <<< "$NAME"

DATE="${YYYY}-${MM}-${DD}"

printf '    {\n'
printf '      "filename": "%s",\n' "$FILE"
printf '      "date": "%s",\n' "$DATE"
printf '      "class": "%s"\n' "$CLASS"

if [ $i -lt $((COUNT-1)) ]; then
    printf '    },\n'
else
    printf '    }\n'
fi

done

echo "  ]"
echo "}"

} > "$MANIFEST"

###############################################################################
# Progress
###############################################################################

{

echo "{"

COUNT=${#FILES[@]}

for ((i=0;i<COUNT;i++))
do

FILE=$(basename "${FILES[$i]}")

printf '  "%s": {\n' "$FILE"
printf '    "status": "Pending",\n'
printf '    "annotator": "",\n'
printf '    "count": 0,\n'
printf '    "verified": false,\n'
printf '    "lastModified": ""\n'

if [ $i -lt $((COUNT-1)) ]; then
    printf '  },\n'
else
    printf '  }\n'
fi

done

echo "}"

} > "$PROGRESS"

###############################################################################

echo
echo "Done."
echo
echo "Created:"
echo "  $MANIFEST"
echo "  $PROGRESS"
echo
echo "Images processed: ${#FILES[@]}"
