/******************************************************************************
 * annotations.js
 ******************************************************************************/

import * as History from "./history.js";

let boxes = [];
let selected = -1;

/******************************************************************************
 * Getters
 ******************************************************************************/

export const all = () => boxes;

export const selectedBox = () =>
    selected >= 0 ? boxes[selected] : null;

/******************************************************************************
 * Load
 ******************************************************************************/

export function load(data = []) {

    boxes = structuredClone(data);

    renumber();

    selected = -1;

}

/******************************************************************************
 * Add
 ******************************************************************************/

export function add(box) {

    History.push(boxes);

    box.id = boxes.length + 1;

    boxes.push(box);

    selected = boxes.length - 1;

}

/******************************************************************************
 * Delete
 ******************************************************************************/

export function removeSelected() {

    if (selected < 0)
        return;

    History.push(boxes);

    boxes.splice(selected,1);

    renumber();

    selected = -1;

}

/******************************************************************************
 * Selection
 ******************************************************************************/

export function select(x,y){

    selected = -1;

    for(let i=boxes.length-1;i>=0;i--){

        const b=boxes[i];

        if(
            x>=b.x &&
            x<=b.x+b.w &&
            y>=b.y &&
            y<=b.y+b.h
        ){
            selected=i;
            return b;
        }

    }

    return null;

}

/******************************************************************************
 * Move
 ******************************************************************************/

export function move(dx,dy){

    if(selected<0)
        return;

    const b=boxes[selected];

    b.x+=dx;
    b.y+=dy;

}

/******************************************************************************
 * Draw
 ******************************************************************************/

export function draw(ctx){

    ctx.font="18px Arial";

    boxes.forEach((b,index)=>{

        ctx.lineWidth=
            index===selected?3:2;

        ctx.strokeStyle=
            index===selected?
            "#00ff00":
            "#ff9800";

        ctx.strokeRect(
            b.x,
            b.y,
            b.w,
            b.h
        );

        ctx.fillStyle="#ff9800";

        ctx.fillText(
            b.id,
            b.x+4,
            b.y+18
        );

    });

}

/******************************************************************************
 * Undo / Redo
 ******************************************************************************/

export function undo(){

    const s=History.undo(boxes);

    if(s)
        boxes=s;

}

export function redo(){

    const s=History.redo(boxes);

    if(s)
        boxes=s;

}

/******************************************************************************
 * Helpers
 ******************************************************************************/

export function renumber(){

    boxes.forEach((b,i)=>{

        b.id=i+1;

    });

}