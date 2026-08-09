/******************************************************************************
 * visualizer.js
 ******************************************************************************/

import * as Canvas from "./canvas.js";
import * as API from "./api.js";
import * as YOLO from "./yolo.js";

let annotations=[];

const canvas=document.getElementById("viewerCanvas");

const imageInput=document.getElementById("imageInput");
const labelInput=document.getElementById("labelInput");

let imageFile=null;

window.addEventListener("DOMContentLoaded",initialize);

function initialize(){

    Canvas.initialize(canvas);

    document.getElementById("openImageBtn").onclick=()=>imageInput.click();
    document.getElementById("openLabelBtn").onclick=()=>labelInput.click();
    document.getElementById("fitBtn").onclick=()=>Canvas.fit();

    imageInput.onchange=openImage;
    labelInput.onchange=openLabel;

}

async function openImage(){

    imageFile=imageInput.files[0];

    if(!imageFile)
        return;

    const img=await API.loadImage(imageFile);

    Canvas.loadImage(img);

    redraw();

}

async function openLabel(){

    if(!imageFile)
        return;

    const txt=await API.loadLabel(

        labelInput.files[0],

        Canvas.width(),

        Canvas.height()

    );

    annotations=txt;

    redraw();

}

function redraw(){

    Canvas.draw(ctx=>{

        ctx.lineWidth=2;
        ctx.font="18px Arial";

        annotations.forEach(box=>{

            ctx.strokeStyle="#00ff00";

            ctx.strokeRect(
                box.x,
                box.y,
                box.w,
                box.h
            );

            ctx.fillStyle="#00ff00";

            ctx.fillText(
                box.id,
                box.x+4,
                box.y+18
            );

        });

    });

}