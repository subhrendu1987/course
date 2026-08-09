/******************************************************************************
 * api.js
 ******************************************************************************/

import * as Utils from "./utils.js";
import * as YOLO from "./yolo.js";

const state = {

    images: [],
    labels: new Map()

};

/******************************************************************************
 * Open Images
 ******************************************************************************/

export async function openImages(files){

    state.images = [...files];

    return state.images;

}

/******************************************************************************
 * Load Image
 ******************************************************************************/

export async function loadImage(file){

    return await Utils.loadImage(file);

}

/******************************************************************************
 * Load Label
 ******************************************************************************/

export async function loadLabel(file,width,height){

    const text = await Utils.readFile(file);

    return YOLO.parse(
        text,
        width,
        height
    );

}

/******************************************************************************
 * Save Label
 ******************************************************************************/

export function saveLabel(fileName,boxes,w,h){

    const txt = YOLO.stringify(
        boxes,
        w,
        h
    );

    Utils.download(
        fileName,
        txt
    );

}

/******************************************************************************
 * Image Lookup
 ******************************************************************************/

export function imageByName(name){

    return state.images.find(
        f=>f.name===name
    );

}

/******************************************************************************
 * Future Cloud Upload
 ******************************************************************************/

export async function uploadAnnotation(){

    console.log(
        "Google Apps Script upload coming later."
    );

}