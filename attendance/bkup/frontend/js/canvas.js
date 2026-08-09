/******************************************************************************
 * canvas.js
 * Canvas Rendering Engine
 ******************************************************************************/

const state = {

    canvas: null,

    ctx: null,

    image: null,

    scale: 1,

    minScale: 0.1,

    maxScale: 10,

    offsetX: 0,

    offsetY: 0,

    dragging: false,

    lastX: 0,

    lastY: 0

};

/******************************************************************************
 * Initialize
 ******************************************************************************/

export function initialize(canvas) {

    state.canvas = canvas;

    state.ctx = canvas.getContext("2d");

    resize();

    window.addEventListener("resize", resize);

}

/******************************************************************************
 * Resize
 ******************************************************************************/

export function resize() {

    const parent = state.canvas.parentElement;

    state.canvas.width = parent.clientWidth;

    state.canvas.height = parent.clientHeight;

    draw();

}

/******************************************************************************
 * Load Image
 ******************************************************************************/

export function loadImage(image) {

    state.image = image;

    fit();

}

/******************************************************************************
 * Fit Image
 ******************************************************************************/

export function fit() {

    if (!state.image)
        return;

    const sx =
        state.canvas.width / state.image.width;

    const sy =
        state.canvas.height / state.image.height;

    state.scale = Math.min(sx, sy);

    state.offsetX =
        (state.canvas.width -
            state.image.width * state.scale) / 2;

    state.offsetY =
        (state.canvas.height -
            state.image.height * state.scale) / 2;

    draw();

}

/******************************************************************************
 * Zoom
 ******************************************************************************/

export function zoom(factor, cx, cy) {

    if (!state.image)
        return;

    cx ??= state.canvas.width / 2;
    cy ??= state.canvas.height / 2;

    const ix =
        (cx - state.offsetX) / state.scale;

    const iy =
        (cy - state.offsetY) / state.scale;

    state.scale *= factor;

    state.scale = Math.max(
        state.minScale,
        Math.min(
            state.maxScale,
            state.scale
        )
    );

    state.offsetX =
        cx - ix * state.scale;

    state.offsetY =
        cy - iy * state.scale;

    draw();

}

/******************************************************************************
 * Pan
 ******************************************************************************/

export function beginPan(x, y) {

    state.dragging = true;

    state.lastX = x;

    state.lastY = y;

}

export function pan(x, y) {

    if (!state.dragging)
        return;

    state.offsetX += x - state.lastX;

    state.offsetY += y - state.lastY;

    state.lastX = x;

    state.lastY = y;

    draw();

}

export function endPan() {

    state.dragging = false;

}

/******************************************************************************
 * Coordinate Conversion
 ******************************************************************************/

export function screenToImage(x, y) {

    return {

        x:
            (x - state.offsetX) /
            state.scale,

        y:
            (y - state.offsetY) /
            state.scale

    };

}

export function imageToScreen(x, y) {

    return {

        x:
            x * state.scale +
            state.offsetX,

        y:
            y * state.scale +
            state.offsetY

    };

}

/******************************************************************************
 * Draw
 ******************************************************************************/

export function draw(renderer = null) {

    const ctx = state.ctx;

    ctx.clearRect(
        0,
        0,
        state.canvas.width,
        state.canvas.height
    );

    if (!state.image)
        return;

    ctx.save();

    ctx.translate(
        state.offsetX,
        state.offsetY
    );

    ctx.scale(
        state.scale,
        state.scale
    );

    ctx.drawImage(
        state.image,
        0,
        0
    );

    if (renderer)
        renderer(ctx);

    ctx.restore();

}

/******************************************************************************
 * Getters
 ******************************************************************************/

export function canvas() {

    return state.canvas;

}

export function context() {

    return state.ctx;

}

export function image() {

    return state.image;

}

export function width() {

    return state.image
        ? state.image.width
        : 0;

}

export function height() {

    return state.image
        ? state.image.height
        : 0;

}

export function scale() {

    return state.scale;

}

export function offset() {

    return {

        x: state.offsetX,

        y: state.offsetY

    };

}