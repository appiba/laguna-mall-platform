// Enlace directo de Laguna Mall Platform
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbywJlhXbQ4KPZDF06OSSGKt1jJdQ-ls6_6YQBqXFPuyF-UldEBerpzIq6hkA9Pg--Oz/exec";

function sendDataToSheet(modulo, local, detalle) {
    const payload = {
        modulo: modulo,
        local: local,
        detalle: detalle
    };

    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if(data.status === "success") {
            alert("Solicitud registrada exitosamente en el sistema del centro comercial.");
        }
    })
    .catch(error => {
        console.error("Error de conexion:", error);
    });
}

const playBtn = document.getElementById('playBtn');
const audioPlayer = document.getElementById('audioPlayer');
const streamUrlInput = document.getElementById('streamUrl');

playBtn.addEventListener('click', () => {
    const url = streamUrlInput.value;
    
    if (!url) {
        alert("Por favor ingrese una URL valida");
        return;
    }

    if (audioPlayer.paused) {
        audioPlayer.src = url;
        audioPlayer.play()
            .then(() => {
                playBtn.innerText = "Pausa";
                playBtn.style.background = "#34c759";
            })
            .catch(e => {
                alert("Enlace invalido o mudo. No se puede reproducir.");
                playBtn.innerText = "Probar";
                playBtn.style.background = "#ff3b30";
            });
    } else {
        audioPlayer.pause();
        audioPlayer.src = ""; 
        playBtn.innerText = "Probar";
        playBtn.style.background = "#1d1d1f";
    }
});

document.getElementById('radioForm').addEventListener('submit', (e) => {
    e.preventDefault();
    alert("Iniciando proceso de comprobacion de correo...");
});
