const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbywJlhXbQ4KPZDF06OSSGKt1jJdQ-ls6_6YQBqXFPuyF-UldEBerpzIq6hkA9Pg--Oz/exec";

let currentUser = "";
let currentRole = "";

document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');

    if (user === "lagunamall2026" && pass === "241987") {
        iniciarSesion("SuperAdmin", "Administrador General");
    } 
    else if (user === "local12" && pass === "1234") {
        iniciarSesion("Arrendatario", "Local A-12");
    } 
    else {
        errorMsg.style.display = "block";
    }
});

function iniciarSesion(role, displayName) {
    currentUser = displayName;
    currentRole = role;
    
    document.getElementById('loginScreen').style.display = "none";
    document.getElementById('mainApp').style.display = "block";
    document.getElementById('userProfileBadge').innerText = displayName;

    if (role === "SuperAdmin") {
        document.getElementById('roleDisplay').innerText = "Panel de Control Global";
        document.getElementById('superAdminPanel').style.display = "block";
    } else {
        document.getElementById('roleDisplay').innerText = "Panel de Arrendatario";
        document.getElementById('superAdminPanel').style.display = "none";
    }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    document.getElementById('mainApp').style.display = "none";
    document.getElementById('loginScreen').style.display = "flex";
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').style.display = "none";
    currentUser = "";
    currentRole = "";
});

function sendDataToSheet(modulo, detalle) {
    if (!currentUser) return;

    const payload = {
        modulo: modulo,
        local: currentUser,
        detalle: detalle
    };

    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if(data.status === "success") {
            alert("Solicitud de " + modulo + " registrada exitosamente en Laguna Mall.");
        }
    })
    .catch(error => console.error("Error:", error));
}

document.getElementById('verifyEmailBtn').addEventListener('click', () => {
    const email = document.getElementById('userEmail').value;
    if(email.includes("@")) {
        alert("Correo comprobado correctamente. Puede continuar con la adquisición.");
        document.getElementById('frecuenciaSection').style.display = "block";
        document.getElementById('verifyEmailBtn').style.background = "#34c759";
        document.getElementById('verifyEmailBtn').innerText = "Correo Validado";
    } else {
        alert("Por favor ingrese un correo válido.");
    }
});

const playBtn = document.getElementById('playBtn');
const audioPlayer = document.getElementById('audioPlayer');
const streamUrlInput = document.getElementById('streamUrl');

playBtn.addEventListener('click', () => {
    const url = streamUrlInput.value;
    if (!url) return alert("Ingrese una URL válida");

    if (audioPlayer.paused) {
        audioPlayer.src = url;
        audioPlayer.play().then(() => {
            playBtn.innerText = "Pausa";
            playBtn.style.background = "#34c759";
        }).catch(e => {
            alert("Enlace inválido o mudo.");
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
    alert("Frecuencia adquirida y enviada a revisión.");
});
