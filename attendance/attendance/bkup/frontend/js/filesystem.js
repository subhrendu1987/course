let dataset = {};

export async function openDataset() {

    const root = await window.showDirectoryPicker();

    dataset.root = root;

    dataset.raw = await root.getDirectoryHandle("RawPicture");

    dataset.labels = await root.getDirectoryHandle("Annotated");

    dataset.preview = await root.getDirectoryHandle("Preview");

    return dataset;
}

export async function imageFiles() {

    const files = [];

    for await (const entry of dataset.raw.values()) {

        if (entry.kind === "file")
            files.push(entry);

    }

    files.sort((a,b)=>a.name.localeCompare(b.name));

    return files;

}

export async function loadAnnotation(imageName){

    const txtName =
        imageName.replace(/\.[^.]+$/, ".txt");

    try{

        const handle =
            await dataset.labels.getFileHandle(txtName);

        return await handle.getFile();

    }
    catch{

        return null;

    }

}

export async function saveAnnotation(name,text){

    const txtName =
        name.replace(/\.[^.]+$/, ".txt");

    const handle =
        await dataset.labels.getFileHandle(
            txtName,
            {create:true}
        );

    const writable =
        await handle.createWritable();

    await writable.write(text);

    await writable.close();

}