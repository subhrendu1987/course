/******************************************************************************
 * sidebar.js
 ******************************************************************************/

let images=[];

let current=0;

const list=document.getElementById("imageList");

/******************************************************************************
 * Load Image List
 ******************************************************************************/

export function load(files){

    images=[...files];

    render();

}

/******************************************************************************
 * Render
 ******************************************************************************/

function render(){

    list.innerHTML="";

    images.forEach((file,index)=>{

        const li=document.createElement("li");

        li.textContent=file.name;

        if(index===current)
            li.classList.add("active");

        li.onclick=()=>{

            current=index;

            render();

            document.dispatchEvent(
                new CustomEvent(
                    "imagechange",
                    {detail:file}
                )
            );

        };

        list.appendChild(li);

    });

}

/******************************************************************************
 * Navigation
 ******************************************************************************/

export function next(){

    if(current<images.length-1){

        current++;

        render();

        list.children[current].click();

    }

}

export function previous(){

    if(current>0){

        current--;

        render();

        list.children[current].click();

    }

}

export function currentFile(){

    return images[current];

}