/******************************************************************************
 * app.js
 ******************************************************************************/

import * as Canvas from "./canvas.js";
import * as Sidebar from "./sidebar.js";
import * as Annotation from "./annotations.js";
import * as Keyboard from "./keyboard.js";
import * as API from "./api.js";

const imageInput =
    document.getElementById("imageInput");

const canvas =
    document.getElementById("annotationCanvas");

/******************************************************************************
 * Initialize
 ******************************************************************************/

window.addEventListener(
    "DOMContentLoaded",
    initialize
);

function initialize(){

    Canvas.initialize(canvas);

    initializeButtons();

    initializeKeyboard();

}

/******************************************************************************
 * Toolbar
 ******************************************************************************/

function initializeButtons(){

    document
        .getElementById("openBtn")
        .onclick=()=>imageInput.click();

    imageInput.onchange=openImages;

    document
        .getElementById("fitBtn")
        .onclick=()=>Canvas.fit();

    document
        .getElementById("nextBtn")
        .onclick=Sidebar.next;

    document
        .getElementById("prevBtn")
        .onclick=Sidebar.previous;

    document
        .getElementById("saveBtn")
        .onclick=saveCurrent;

}

/******************************************************************************
 * Keyboard
 ******************************************************************************/

function initializeKeyboard(){

    Keyboard.initialize({

        save:saveCurrent,

        undo:()=>{

            Annotation.undo();
            redraw();

        },

        redo:()=>{

            Annotation.redo();
            redraw();

        },

        delete:()=>{

            Annotation.removeSelected();
            redraw();

        },

        next:Sidebar.next,

        previous:Sidebar.previous,

        fit:Canvas.fit,

        cancel(){}

    });

}

/******************************************************************************
 * Open Images
 ******************************************************************************/

async function openImages(){

    const files =
        await API.openImages(
            imageInput.files
        );

    Sidebar.load(files);

}

/******************************************************************************
 * Sidebar Event
 ******************************************************************************/

document.addEventListener(
    "imagechange",
    async e=>{

        const img =
            await API.loadImage(
                e.detail
            );

        Canvas.loadImage(img);

        Annotation.load([]);

        redraw();

    }
);

/******************************************************************************
 * Mouse Events
 ******************************************************************************/

let drawing=false;
let start={};

canvas.addEventListener("mousedown",e=>{

    const p=
        Canvas.screenToImage(
            e.offsetX,
            e.offsetY
        );

    drawing=true;

    start=p;

});

canvas.addEventListener("mouseup",e=>{

    if(!drawing)
        return;

    drawing=false;

    const end=
        Canvas.screenToImage(
            e.offsetX,
            e.offsetY
        );

    Annotation.add({

        x:start.x,

        y:start.y,

        w:end.x-start.x,

        h:end.y-start.y,

        class:0

    });

    redraw();

});

/******************************************************************************
 * Redraw
 ******************************************************************************/

function redraw(){

    Canvas.draw(ctx=>{

        Annotation.draw(ctx);

    });

}

/******************************************************************************
 * Save
 ******************************************************************************/

function saveCurrent(){

    const img=Canvas.image();

    if(!img)
        return;

    const name=
        img.src
        .split("/")
        .pop()
        .replace(/\.[^.]+$/,".txt");

    API.saveLabel(

        name,

        Annotation.all(),

        img.width,

        img.height

    );

}