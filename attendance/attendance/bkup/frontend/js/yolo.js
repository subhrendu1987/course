/******************************************************************************
 * yolo.js
 * YOLO Annotation Utilities
 *
 * YOLO Format
 * class x_center y_center width height
 *
 * Coordinates are normalized (0.0 - 1.0)
 ******************************************************************************/

/******************************************************************************
 * Parse YOLO text into annotation objects.
 ******************************************************************************/

export function parse(text, imageWidth, imageHeight) {

    const boxes = [];

    const lines = text
        .trim()
        .split(/\r?\n/);

    for (const line of lines) {

        if (!line.trim())
            continue;

        const values = line
            .trim()
            .split(/\s+/)
            .map(Number);

        if (values.length !== 5)
            continue;

        const [
            cls,
            cx,
            cy,
            w,
            h
        ] = values;

        const width = w * imageWidth;
        const height = h * imageHeight;

        const x = cx * imageWidth - width / 2;
        const y = cy * imageHeight - height / 2;

        boxes.push({

            id: boxes.length + 1,

            class: cls,

            x,

            y,

            w: width,

            h: height

        });

    }

    return boxes;

}

/******************************************************************************
 * Convert annotations to YOLO text.
 ******************************************************************************/

export function stringify(boxes, imageWidth, imageHeight) {

    const lines = [];

    boxes.forEach(box => {

        const cx =
            (box.x + box.w / 2) / imageWidth;

        const cy =
            (box.y + box.h / 2) / imageHeight;

        const w =
            box.w / imageWidth;

        const h =
            box.h / imageHeight;

        lines.push(

            [
                box.class,
                cx.toFixed(6),
                cy.toFixed(6),
                w.toFixed(6),
                h.toFixed(6)
            ].join(" ")

        );

    });

    return lines.join("\n");

}

/******************************************************************************
 * Validate annotations.
 ******************************************************************************/

export function validate(boxes, imageWidth, imageHeight) {

    const errors = [];

    boxes.forEach(box => {

        if (box.w <= 0)
            errors.push(`Box ${box.id}: Invalid width`);

        if (box.h <= 0)
            errors.push(`Box ${box.id}: Invalid height`);

        if (box.x < 0)
            errors.push(`Box ${box.id}: Left outside image`);

        if (box.y < 0)
            errors.push(`Box ${box.id}: Top outside image`);

        if (box.x + box.w > imageWidth)
            errors.push(`Box ${box.id}: Right outside image`);

        if (box.y + box.h > imageHeight)
            errors.push(`Box ${box.id}: Bottom outside image`);

    });

    return errors;

}

/******************************************************************************
 * Create empty annotation.
 ******************************************************************************/

export function createBox(
    x,
    y,
    w,
    h,
    cls = 0
) {

    return {

        id: 0,

        class: cls,

        x,

        y,

        w,

        h

    };

}

/******************************************************************************
 * Renumber annotations.
 ******************************************************************************/

export function renumber(boxes) {

    boxes.forEach((box, index) => {

        box.id = index + 1;

    });

}

/******************************************************************************
 * Calculate statistics.
 ******************************************************************************/

export function statistics(boxes) {

    const stats = {

        total: boxes.length,

        classes: {}

    };

    boxes.forEach(box => {

        if (!(box.class in stats.classes))
            stats.classes[box.class] = 0;

        stats.classes[box.class]++;

    });

    return stats;

}

/******************************************************************************
 * Deep copy annotations.
 ******************************************************************************/

export function clone(boxes) {

    return JSON.parse(
        JSON.stringify(boxes)
    );

}