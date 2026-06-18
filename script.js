const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbywJlhXbQ4KPZDF06OSSGKt1jJdQ-ls6_6YQBqXFPuyF-UldEBerpzIq6hkA9Pg--Oz/exec";

let currentUser = "";
let currentRole = "";
let currentLocalName = "";

if (!localStorage.getItem('mallUsers')) {
    localStorage.setItem('mallUsers', JSON.stringify([]));
}
if (!localStorage.getItem('mallRequests')) {
    localStorage.setItem('mallRequests', JSON.stringify([]));
}
if (!localStorage.getItem('mallAlerts')) {
    localStorage.setItem('mallAlerts', JSON.stringify([]));
}

document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');

    if (user === "lagunamall2026" && pass === "241987") {
        iniciarSesion("SuperAdmin", "Administrador General", "SuperAdmin");
        return;
    } 

    const usersDB = JSON.parse(localStorage.getItem('mallUsers'));
    const foundUser = usersDB.find(u => u.username === user && u.password === pass);

    if (foundUser) {
        iniciarSesion("Arrendatario", foundUser.localName, foundUser.username);
    } else {
        errorMsg.style.display = "block";
    }
});

function iniciarSesion(role, displayName, username) {
    currentUser = username;
    currentRole = role;
    currentLocalName = displayName;
    
    document.getElementById('loginScreen').style.display = "none";
    document.getElementById('mainApp').style.display = "block";
    document.getElementById('userProfileBadge').innerText = displayName;

    if (role === "SuperAdmin") {
        document.getElementById('roleDisplay').innerText = "Control Total del Mall";
        document.getElementById('superAdminPanel').style.display = "block";
        document.getElementById('myAlertsSection').style.display = "none";
        loadAdminData();
    } else {
        document.getElementById('roleDisplay').innerText = "Panel de Arrendatario";
        document.getElementById('superAdminPanel').style.display = "none";
        document.getElementById('myAlertsSection').style.display = "block";
        loadLocalAlerts();
    }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    location.reload(); 
});

document.getElementById('createUserForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const localName = document.getElementById('newLocalName').value;
    const username = document.getElementById('newUsername').value;
    const pass = document.getElementById('newPassword').value;

    const usersDB = JSON.parse(localStorage.getItem('mallUsers'));
    
    if(usersDB.some(u => u.username === username)) {
        alert("Ese nombre de usuario ya existe.");
        return;
    }

    usersDB.push({ localName, username, password: pass });
    localStorage.setItem('mallUsers', JSON.stringify(usersDB));
    
    alert("Local " + localName + " creado exitosamente. Ya pueden iniciar sesión.");
    document.getElementById('createUserForm').reset();
    loadAdminData(); 
});

document.getElementById('createAlertForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const target = document.getElementById('alertTarget').value;
    const type = document.getElementById('alertType').value;
    const message = document.getElementById('alertMessage').value;

    const alertsDB = JSON.parse(localStorage.getItem('mallAlerts'));
    alertsDB.push({ target, type, message, date: new Date().toLocaleString() });
    localStorage.setItem('mallAlerts', JSON.stringify(alertsDB));

    alert("Alerta enviada exitosamente.");
    document.getElementById('createAlertForm').reset();
});

function sendRequest(modulo, detalle) {
    if (currentRole === "SuperAdmin") {
        alert("El administrador general no envía solicitudes operativas.");
        return;
    }

    const requestsDB = JSON.parse(localStorage.getItem('mallRequests'));
    requestsDB.push({ local: currentLocalName, modulo, detalle, date: new Date().toLocaleString() });
    localStorage.setItem('mallRequests', JSON.stringify(requestsDB));

    const payload = { modulo: modulo, local: currentLocalName, detalle: detalle };
    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    }).catch(e => console.log("Google Sheets backup failed, but saved locally."));

    alert("Tu solicitud de " + modulo + " fue enviada a la administración.");
}

function loadAdminData() {
    const usersDB = JSON.parse(localStorage.getItem('mallUsers'));
    const select = document.getElementById('alertTarget');
    select.innerHTML = '<option value="">Seleccionar Local...</option><option value="Todos">Todos los Locales</option>';
    usersDB.forEach(u => {
        select.innerHTML += '<option value="' + u.localName + '">' + u.localName + '</option>';
    });

    const requestsDB = JSON.parse(localStorage.getItem('mallRequests'));
    const inbox = document.getElementById('requestsInbox');
    inbox.innerHTML = '';
    
    if(requestsDB.length === 0) inbox.innerHTML = '<p style="color:#8e8e93;">No hay solicitudes nuevas.</p>';
    
    requestsDB.reverse().forEach(req => {
        inbox.innerHTML += `
            <div class="request-item">
                <div class="item-header"><span>${req.local}</span> <span class="item-date">${req.date}</span></div>
                <div style="color: var(--blue); font-weight: bold;">${req.modulo}</div>
                <div>${req.detalle}</div>
            </div>
        `;
    });
}

function loadLocalAlerts() {
    const alertsDB = JSON.parse(localStorage.getItem('mallAlerts'));
    const inbox = document.getElementById('myAlertsInbox');
    inbox.innerHTML = '';

    const myAlerts = alertsDB.filter(a => a.target === "Todos" || a.target === currentLocalName);

    if(myAlerts.length === 0) {
        inbox.innerHTML = '<p style="color:#8e8e93;">No tienes deudas ni alertas pendientes.</p>';
        return;
    }

    myAlerts.reverse().forEach(alert => {
        inbox.innerHTML += `
            <div class="alert-item">
                <div class="item-header"><span>${alert.type}</span> <span class="item-date">${alert.date}</span></div>
                <div>${alert.message}</div>
            </div>
        `;
    });
}

document.getElementById('verifyEmailBtn').addEventListener('click', () => {
    const email = document.getElementById('userEmail').value;
    if(email.includes("@")) {
        alert("Correo comprobado correctamente.");
        document.getElementById('frecuenciaSection').style.display = "block";
        document.getElementById('verifyEmailBtn').style.background = "#34c759";
        document.getElementById('verifyEmailBtn').innerText = "Correo Validado";
    } else {
        alert("Ingrese un correo válido.");
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
