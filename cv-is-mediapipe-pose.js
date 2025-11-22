// -----------------------------
// Variáveis globais
// -----------------------------
let currentFacingMode = "user";   // "user" = frontal, "environment" = traseira
let currentStream = null;

let video = null;
let label = null;
let canvas = null;
let ctx = null;

let pose = null;
let poseReady = false;

// -----------------------------
// Funções de câmera
// -----------------------------
async function startCamera(facingMode = "user") {
    // Para o stream atual antes de iniciar o novo
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }

    try {
        const constraints = {
            video: { facingMode: facingMode },
            audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        currentStream = stream;
        video.srcObject = stream;
        currentFacingMode = facingMode;

        // Atualiza texto da câmera ativa
        label.textContent =
            facingMode === "user"
                ? "📷 Câmera: Frontal"
                : "📷 Câmera: Traseira";

        // Quando o vídeo tiver dimensão, ajusta o canvas
        video.addEventListener("loadedmetadata", () => {
            video.play();
            resizeCanvasToVideo();
        });

    } catch (err) {
        console.error("Erro ao acessar a câmera:", err);
        alert("Não foi possível acessar a câmera: " + err.message);
    }
}

function toggleCamera() {
    const newMode = currentFacingMode === "user" ? "environment" : "user";
    startCamera(newMode);
}

function resizeCanvasToVideo() {
    if (!video || !canvas) return;

    const width  = video.videoWidth;
    const height = video.videoHeight;

    if (width > 0 && height > 0) {
        canvas.width  = width;
        canvas.height = height;
    }
}

// -----------------------------
// MediaPipe Pose
// -----------------------------
function onResults(results) {
    if (!canvas || !ctx) return;

    // Limpa o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Se tiver landmarks, desenha
    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
        // "ossos"
        drawConnectors(
            ctx,
            results.poseLandmarks,
            POSE_CONNECTIONS,
            { color: "aqua", lineWidth: 4 }
        );

        // "pontos" (articulações)
        drawLandmarks(
            ctx,
            results.poseLandmarks,
            { color: "fuchsia", lineWidth: 2, radius: 3 }
        );
    }
}

async function initPose() {
    pose = new Pose({
        locateFile: (file) => {
            // Usa CDN do MediaPipe
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
    });

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    pose.onResults(onResults);
    poseReady = true;

    // Inicia o loop de inferência
    poseLoop();
}

async function poseLoop() {
    if (poseReady && video && video.readyState >= 2) { // HAVE_CURRENT_DATA
        try {
            await pose.send({ image: video });
        } catch (e) {
            console.error("Erro no pose.send:", e);
        }
    }

    // Próximo frame
    requestAnimationFrame(poseLoop);
}

// -----------------------------
// Inicialização geral
// -----------------------------
function initApp() {
    // Pega referências dos elementos DOM
    video  = document.getElementById("camera");
    label  = document.getElementById("cameraLabel");
    canvas = document.getElementById("overlay");
    ctx    = canvas.getContext("2d");

    // Botão troca de câmera
    const toggleButton = document.getElementById("toggleCamera");
    if (toggleButton) {
        toggleButton.addEventListener("click", toggleCamera);
    }

    // Começa com câmera frontal
    startCamera("user");

    // Inicializa MediaPipe Pose
    initPose();

    // Se a janela for redimensionada, tenta ajustar canvas de novo
    window.addEventListener("resize", resizeCanvasToVideo);
}

// Quando a página carregar, inicializa tudo
window.addEventListener("load", initApp);
