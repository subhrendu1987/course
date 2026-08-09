/******************************************************************************
 * utils.js
 * Common utility functions
 ******************************************************************************/

/**
 * Clamp value between min and max.
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Generate a unique id.
 */
export function uuid() {
    return crypto.randomUUID();
}

/**
 * Deep copy an object.
 */
export function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Round to n decimal places.
 */
export function round(value, digits = 2) {
    return Number(value.toFixed(digits));
}

/**
 * Format percentage.
 */
export function percent(value, total) {
    if (total === 0) return "0%";
    return ((value / total) * 100).toFixed(1) + "%";
}

/**
 * Convert bytes into readable text.
 */
export function formatBytes(bytes) {

    if (bytes === 0)
        return "0 B";

    const k = 1024;

    const units = [
        "B",
        "KB",
        "MB",
        "GB",
        "TB"
    ];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (bytes / Math.pow(k, i)).toFixed(2) + " " + units[i];

}

/**
 * Extract filename from path.
 */
export function filename(path) {

    return path.split("/").pop();

}

/**
 * Remove extension.
 */
export function basename(name) {

    const index = name.lastIndexOf(".");

    if (index < 0)
        return name;

    return name.substring(0, index);

}

/**
 * Extension.
 */
export function extension(name) {

    const index = name.lastIndexOf(".");

    if (index < 0)
        return "";

    return name.substring(index + 1).toLowerCase();

}

/**
 * Download a text file.
 */
export function download(name, text) {

    const blob = new Blob(
        [text],
        { type: "text/plain" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = name;

    a.click();

    URL.revokeObjectURL(url);

}

/**
 * Download JSON.
 */
export function downloadJSON(name, object) {

    download(
        name,
        JSON.stringify(object, null, 2)
    );

}

/**
 * Read a file.
 */
export function readFile(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);

        reader.onerror = reject;

        reader.readAsText(file);

    });

}

/**
 * Read image.
 */
export function loadImage(file) {

    return new Promise((resolve, reject) => {

        const img = new Image();

        img.onload = () => resolve(img);

        img.onerror = reject;

        img.src = URL.createObjectURL(file);

    });

}

/**
 * Today's date.
 */
export function today() {

    return new Date().toISOString().substring(0, 10);

}

/**
 * Current time.
 */
export function now() {

    return new Date().toLocaleTimeString();

}

/**
 * Debounce.
 */
export function debounce(fn, delay = 250) {

    let timer;

    return (...args) => {

        clearTimeout(timer);

        timer = setTimeout(
            () => fn(...args),
            delay
        );

    };

}

/**
 * Distance.
 */
export function distance(x1, y1, x2, y2) {

    return Math.hypot(
        x2 - x1,
        y2 - y1
    );

}

/**
 * Point inside rectangle.
 */
export function pointInRect(x, y, rect) {

    return (
        x >= rect.x &&
        x <= rect.x + rect.w &&
        y >= rect.y &&
        y <= rect.y + rect.h
    );

}

/**
 * Normalize rectangle.
 */
export function normalize(rect) {

    if (rect.w < 0) {

        rect.x += rect.w;
        rect.w *= -1;

    }

    if (rect.h < 0) {

        rect.y += rect.h;
        rect.h *= -1;

    }

    return rect;

}