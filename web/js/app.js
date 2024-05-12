const hostUrl = window.location.hostname;
const port = window.location.port;
console.log({hostUrl, port})

function parseUrl(route) {
    const portPart = port !== "" ? `:${port}` : ""
    return `http://${hostUrl}${portPart}/${route}`
}

const workflow = {
    "3": {
        "inputs": {
            "seed": 72231957693088,
            "steps": 4,
            "cfg": 1,
            "sampler_name": "euler",
            "scheduler": "normal",
            "denoise": 1,
            "model": [
                "16",
                0
            ],
            "positive": [
                "6",
                0
            ],
            "negative": [
                "7",
                0
            ],
            "latent_image": [
                "5",
                0
            ]
        },
        "class_type": "KSampler",
        "_meta": {
            "title": "KSampler"
        }
    },
    "4": {
        "inputs": {
            "ckpt_name": "realisticVisionV60B1_v51VAE.safetensors"
        },
        "class_type": "CheckpointLoaderSimple",
        "_meta": {
            "title": "Load Checkpoint"
        }
    },
    "5": {
        "inputs": {
            "width": 512,
            "height": 512,
            "batch_size": 16
        },
        "class_type": "EmptyLatentImage",
        "_meta": {
            "title": "Empty Latent Image"
        }
    },
    "6": {
        "inputs": {
            "text": "Candle in a table",
            "clip": [
                "12",
                1
            ]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
            "title": "CLIP Text Encode (Prompt)"
        }
    },
    "7": {
        "inputs": {
            "text": "text, watermark",
            "clip": [
                "12",
                1
            ]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
            "title": "CLIP Text Encode (Prompt)"
        }
    },
    "8": {
        "inputs": {
            "samples": [
                "3",
                0
            ],
            "vae": [
                "4",
                2
            ]
        },
        "class_type": "VAEDecode",
        "_meta": {
            "title": "VAE Decode"
        }
    },
    "12": {
        "inputs": {
            "lora_name": "lcm_lora.safetensors",
            "strength_model": 1,
            "strength_clip": 1,
            "model": [
                "4",
                0
            ],
            "clip": [
                "4",
                1
            ]
        },
        "class_type": "LoraLoader",
        "_meta": {
            "title": "Load LoRA"
        }
    },
    "14": {
        "inputs": {
            "model_name": "animatediff_lightning_4step_comfyui.safetensors"
        },
        "class_type": "ADE_LoadAnimateDiffModel",
        "_meta": {
            "title": "Load AnimateDiff Model 🎭🅐🅓②"
        }
    },
    "15": {
        "inputs": {
            "motion_model": [
                "14",
                0
            ]
        },
        "class_type": "ADE_ApplyAnimateDiffModelSimple",
        "_meta": {
            "title": "Apply AnimateDiff Model 🎭🅐🅓②"
        }
    },
    "16": {
        "inputs": {
            "beta_schedule": "autoselect",
            "model": [
                "12",
                0
            ],
            "m_models": [
                "15",
                0
            ]
        },
        "class_type": "ADE_UseEvolvedSampling",
        "_meta": {
            "title": "Use Evolved Sampling 🎭🅐🅓②"
        }
    },
    "17": {
        "inputs": {
            "frame_rate": 8,
            "loop_count": 0,
            "filename_prefix": "AnimateDiff",
            "format": "video/webm",
            "crf": 20,
            "save_metadata": true,
            "pingpong": false,
            "save_output": true,
            "images": [
                "8",
                0
            ]
        },
        "class_type": "VHS_VideoCombine",
        "_meta": {
            "title": "Video Combine 🎥🅥🅗🅢"
        }
    }
}

let queueSize = 0;
let historyList = [];

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}

const client_id = uuidv4();

console.log({workflow});


const server_address = `${window.location.hostname}:${window.location.port}`
console.log(client_id);
const socket_address = `ws://${server_address}/ws?clientId=${client_id}`
console.log(socket_address)
const socket = new WebSocket(socket_address)

socket.addEventListener('open', (event) => {
    console.log("connected to the server");
});

socket.addEventListener('message', onWsMessage);


function onWsMessage(event) {
    const eventData = JSON.parse(event.data)
    if (eventData.type === "progress") {
        // {"type": "progress", "data": {"value": 2, "max": 4, "prompt_id": "44d3afd8-d45d-4f9b-bd14-fd3d3cbacb4c", "node": null}}
        setProgress(eventData.data.value, eventData.data.max)
    }

    if (eventData.type === "status") {
        // {"type": "status", "data": {"status": {"exec_info": {"queue_remaining": 0}}}}
        queueSize = eventData.data.status.exec_info.queue_remaining
        // Execution finished
        if (queueSize === 0) {
            fetchHistory()
            setProgress(0, 1)
        }
    }
}

function triggerPrompt() {
    const promptText = document.getElementById("positive").value
    prompt(promptText)
}

function fetchHistory() {
    fetch(parseUrl("history"))
        .then(response => response.json())
        .then(data => {
            historyList = data
            render_history_queue(data)
            const lastHistoryObj = Object.entries(data).at(-1)[1]
            if (Object.keys(data).length > 0) {
                setOutputObject(lastHistoryObj)
            }
        })
        .catch(error => console.log({error}))
}

function prompt(promptString) {
    const previousSeed = workflow["3"].inputs.seed
    workflow["3"].inputs.seed = previousSeed + 1

    workflow["6"].inputs.text = promptString
    fetch(parseUrl("prompt"), {
        method: "POST",
        body: JSON.stringify({prompt: workflow ?? {}}),
        headers: {
            "Content-Type": "application/json"
        }
    })
}

function render_history_queue(list) {
    const promptQueue = document.getElementById("history-queue");
    promptQueue.innerHTML = "";
    Object.entries(list).forEach(([k, v], index) => {
        const gifname = v.outputs["17"].gifs[0].filename
        const output = {
            id: k,
            image: gifname,
            // http://localhost:8188/view?filename=ComfyUI_temp_zvgzv_00001_.png&subfolder=&type=temp
            gifUrl: parseUrl(`view?filename=${gifname}&subfolder=&type=output`)
        }
        const div = document.createElement("div");
        div.className = "history-item cursor-pointer border border-gray-700 flex-shrink-0";
        div.innerHTML = `<video class="h-20 w-20" muted><source type="video/webm" src="${output.gifUrl}"></video>`;
        div.addEventListener('click', () => setOutputObject(v))
        promptQueue.appendChild(div);
    });
}

function setProgress(currentStep, totalSteps) {
    const progress = document.getElementById("progress-bar-inner");
    const percentage = (currentStep / totalSteps) * 100;
    progress.style.width = `${percentage}%`;
}

function setOutputObject(historyObj) {
    const outputLink = document.getElementById("output-link");
    const gifname = historyObj.outputs["17"].gifs[0].filename
    const fileUrl = parseUrl(`view?filename=${gifname}&subfolder=&type=output`)

    outputLink.href = fileUrl
    outputLink.innerHTML = `<video muted autoplay loop><source type="video/webm" src="${fileUrl}"></video>`;


    const positivePrompt = document.getElementById("positive");
    const objPrompt = historyObj.prompt[2][6].inputs.text;
    positivePrompt.value = objPrompt
}

fetchHistory()
