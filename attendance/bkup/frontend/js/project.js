import * as FS from "./filesystem.js";

export const project={

    images:[],
    current:0

};

export async function open(){

    await FS.openDataset();

    project.images =
        await FS.imageFiles();

}

export function currentImage(){

    return project.images[
        project.current
    ];

}

export function next(){

    if(project.current<
        project.images.length-1)

        project.current++;

}

export function previous(){

    if(project.current>0)

        project.current--;

}