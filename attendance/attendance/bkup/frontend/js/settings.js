/******************************************************************************
 * settings.js
 ******************************************************************************/

const KEY="yolo-settings";

window.addEventListener(

    "DOMContentLoaded",

    ()=>{

        load();

        document
            .getElementById("saveSettingsBtn")
            .onclick=save;

    }

);

function save(){

    const settings={

        imagesFolder:
            document.getElementById("imagesFolder").value,

        labelsFolder:
            document.getElementById("labelsFolder").value,

        previewFolder:
            document.getElementById("previewFolder").value,

        boxColor:
            document.getElementById("boxColor").value,

        selectedColor:
            document.getElementById("selectedColor").value,

        autosave:
            document.getElementById("autosave").checked,

        autosaveInterval:
            Number(document.getElementById("autosaveInterval").value),

        defaultZoom:
            Number(document.getElementById("defaultZoom").value),

        gasURL:
            document.getElementById("gasURL").value,

        exportFormat:
            document.getElementById("exportFormat").value,

        exportPreview:
            document.getElementById("exportPreview").checked

    };

    localStorage.setItem(

        KEY,

        JSON.stringify(settings)

    );

    alert("Settings saved.");

}

function load(){

    const json=localStorage.getItem(KEY);

    if(!json)
        return;

    const s=JSON.parse(json);

    document.getElementById("imagesFolder").value=s.imagesFolder||"images";
    document.getElementById("labelsFolder").value=s.labelsFolder||"labels";
    document.getElementById("previewFolder").value=s.previewFolder||"preview";

    document.getElementById("boxColor").value=s.boxColor||"#ff9800";
    document.getElementById("selectedColor").value=s.selectedColor||"#00ff00";

    document.getElementById("autosave").checked=s.autosave;
    document.getElementById("autosaveInterval").value=s.autosaveInterval||30;
    document.getElementById("defaultZoom").value=s.defaultZoom||100;

    document.getElementById("gasURL").value=s.gasURL||"";

    document.getElementById("exportFormat").value=s.exportFormat||"YOLO";
    document.getElementById("exportPreview").checked=s.exportPreview;

}