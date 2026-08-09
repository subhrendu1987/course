/******************************************************************************
 * keyboard.js
 ******************************************************************************/

export function initialize(actions){

    document.addEventListener("keydown",e=>{

        if(e.ctrlKey && e.key==="s"){

            e.preventDefault();

            actions.save();

        }

        if(e.ctrlKey && e.key==="z"){

            e.preventDefault();

            actions.undo();

        }

        if(e.ctrlKey && e.key==="y"){

            e.preventDefault();

            actions.redo();

        }

        if(e.key==="Delete"){

            actions.delete();

        }

        if(e.key==="ArrowRight"){

            actions.next();

        }

        if(e.key==="ArrowLeft"){

            actions.previous();

        }

        if(e.key==="f"){

            actions.fit();

        }

        if(e.key==="Escape"){

            actions.cancel();

        }

    });

}