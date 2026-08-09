/******************************************************************************
 * dashboard.js
 ******************************************************************************/

const progress=document.getElementById("progressBar");

export function update(data){

    document.getElementById("totalImages").textContent=data.total;
    document.getElementById("annotatedImages").textContent=data.done;
    document.getElementById("pendingImages").textContent=data.pending;
    document.getElementById("totalObjects").textContent=data.objects;

    const p=data.total===0?0:(100*data.done/data.total);

    progress.value=p;

    document.getElementById("progressText").textContent=p.toFixed(1)+"%";

}

export function populateTable(images){

    const tbody=document.querySelector("#datasetTable tbody");

    tbody.innerHTML="";

    images.forEach((img,index)=>{

        const tr=document.createElement("tr");

        tr.innerHTML=`
        <td>${index+1}</td>
        <td>${img.name}</td>
        <td>${img.objects}</td>
        <td>
            <span class="badge ${img.status}">
                ${img.status}
            </span>
        </td>
        <td>
            <button class="actionButton">
                Open
            </button>
        </td>
        `;

        tbody.appendChild(tr);

    });

}