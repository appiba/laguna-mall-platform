const API_URL = "https://script.google.com/macros/s/AKfycbywJlhXbQ4KPZDF06OSSGKt1jJdQ-ls6_6YQBqXFPuyF-UldEBerpzIq6hkA9Pg--Oz/exec";

const state = {
  user: null,
  role: null,
  adminData: {
    locales: [],
    usuarios: [],
    cobros: [],
    tickets: [],
    logistica: [],
    documentos: [],
    notificaciones: []
  },
  tenantData: {
    local: null,
    cobros: [],
    tickets: [],
    logistica: [],
    documentos: [],
    notificaciones: []
  }
};

document.addEventListener("DOMContentLoaded", () => {
  bindGlobalEvents();
  bindAdminNavigation();
  bindTenantNavigation();
  bindForms();

  const savedSession = localStorage.getItem("lagunaMallSession");

  if (savedSession) {
    try {
      const session = JSON.parse(savedSession);
      state.user = session.user;
      state.role = session.role;

      if (state.role === "SUPERADMIN") {
        showScreen("adminScreen");
        loadAdminData();
      } else {
        showScreen("tenantScreen");
        loadTenantData();
      }
    } catch (error) {
      localStorage.removeItem("lagunaMallSession");
    }
  }
});

/*******************************************************
 * API HELPERS
 *******************************************************/

async function apiGet(params = {}) {
  const url = new URL(API_URL);
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });

  const response = await fetch(url.toString());
  return response.json();
}

async function apiPost(payload = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  return response.json();
}

/*******************************************************
 * UI HELPERS
 *******************************************************/

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return document.querySelectorAll(selector);
}

function showScreen(screenId) {
  qsa(".screen").forEach((screen) => screen.classList.remove("active"));
  qs(`#${screenId}`).classList.add("active");
}

function showToast(message) {
  const toast = qs("#toast");
  toast.textContent = message;
  toast.classList.add("active");

  setTimeout(() => {
    toast.classList.remove("active");
  }, 2800);
}

function setLoading(button, loadingText = "Procesando...") {
  if (!button) return;

  button.dataset.originalText = button.textContent;
  button.textContent = loadingText;
  button.disabled = true;
}

function unsetLoading(button) {
  if (!button) return;

  button.textContent = button.dataset.originalText || "Guardar";
  button.disabled = false;
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD"
  }).format(number);
}

function formatDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
}

function getFormData(form) {
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    data[key] = String(value).trim();
  }

  return data;
}

function badgeClass(status) {
  const value = String(status || "").toUpperCase();

  if (["ACTIVO", "PAGADO", "APROBADO", "RESPONDIDO"].includes(value)) return "green";
  if (["PENDIENTE", "ABIERTO", "NUEVA"].includes(value)) return "orange";
  if (["VENCIDO", "RECHAZADO", "URGENTE", "ANULADO", "INACTIVO"].includes(value)) return "red";
  if (["ALTA", "EN_REVISION"].includes(value)) return "purple";

  return "blue";
}

function emptyState(text) {
  return `<div class="empty-state">${text}</div>`;
}

function getTenantName(tenantId) {
  const local = state.adminData.locales.find((item) => item.tenantId === tenantId);
  return local ? `${local.nombreLocal} · ${local.numeroLocal || "Sin número"}` : tenantId || "Sin local";
}

function fillTenantSelects() {
  const selects = [
    "#userTenantSelect",
    "#chargeTenantSelect",
    "#documentTenantSelect",
    "#notificationTenantSelect"
  ];

  selects.forEach((selector) => {
    const select = qs(selector);
    if (!select) return;

    const allowEmpty = selector === "#documentTenantSelect";

    select.innerHTML = allowEmpty
      ? `<option value="">Todos / sin local específico</option>`
      : `<option value="">Selecciona un local</option>`;

    state.adminData.locales
      .filter((local) => String(local.estado).toUpperCase() === "ACTIVO")
      .forEach((local) => {
        const option = document.createElement("option");
        option.value = local.tenantId;
        option.textContent = `${local.nombreLocal} · ${local.numeroLocal || local.tenantId}`;
        select.appendChild(option);
      });
  });
}

/*******************************************************
 * GLOBAL EVENTS
 *******************************************************/

function bindGlobalEvents() {
  qs("#logoutAdminBtn").addEventListener("click", logout);
  qs("#logoutTenantBtn").addEventListener("click", logout);

  qs("#refreshAdminBtn").addEventListener("click", loadAdminData);
  qs("#refreshTenantBtn").addEventListener("click", loadTenantData);

  qs("#supportButton").addEventListener("click", () => {
    window.open("https://wa.me/593980510530?text=Hola,%20necesito%20soporte%20de%20Laguna%20Mall%20Platform", "_blank");
  });

  qs("#loginForm").addEventListener("submit", handleLogin);
}

function logout() {
  localStorage.removeItem("lagunaMallSession");
  state.user = null;
  state.role = null;
  showScreen("loginScreen");
  showToast("Sesión cerrada");
}

/*******************************************************
 * LOGIN
 *******************************************************/

async function handleLogin(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  const message = qs("#loginMessage");

  message.textContent = "";
  setLoading(button, "Ingresando...");

  const usuario = qs("#loginUser").value.trim();
  const clave = qs("#loginPass").value.trim();

  try {
    const result = await apiPost({
      action: "login",
      usuario,
      clave
    });

    if (!result.ok) {
      message.textContent = result.message || "No se pudo iniciar sesión";
      return;
    }

    state.user = result.user;
    state.role = result.role;

    localStorage.setItem("lagunaMallSession", JSON.stringify({
      user: result.user,
      role: result.role
    }));

    if (result.role === "SUPERADMIN") {
      showScreen("adminScreen");
      await loadAdminData();
    } else {
      showScreen("tenantScreen");
      await loadTenantData();
    }

    showToast("Acceso correcto");

  } catch (error) {
    message.textContent = "Error de conexión con Apps Script";
  } finally {
    unsetLoading(button);
  }
}

/*******************************************************
 * ADMIN DATA
 *******************************************************/

async function loadAdminData() {
  if (!state.user) return;

  try {
    const result = await apiGet({
      action: "init",
      role: "SUPERADMIN",
      tenantId: "ALL"
    });

    if (!result.ok) {
      showToast(result.message || "No se pudo cargar la información");
      return;
    }

    state.adminData = {
      locales: result.locales || [],
      usuarios: result.usuarios || [],
      cobros: result.cobros || [],
      tickets: result.tickets || [],
      logistica: result.logistica || [],
      documentos: result.documentos || [],
      notificaciones: result.notificaciones || []
    };

    qs("#adminName").textContent = state.user.nombre || "SuperAdmin";

    fillTenantSelects();
    renderAdmin();

  } catch (error) {
    showToast("Error cargando datos del administrador");
  }
}

function renderAdmin() {
  renderAdminStats();
  renderLocales();
  renderUsuarios();
  renderCobros();
  renderAdminTickets();
  renderAdminLogistica();
  renderDocumentos();
  renderNotificaciones();
}

function renderAdminStats() {
  const localesActivos = state.adminData.locales.filter((local) => String(local.estado).toUpperCase() === "ACTIVO").length;
  const usuariosActivos = state.adminData.usuarios.filter((user) => String(user.estado).toUpperCase() === "ACTIVO").length;
  const cobrosPendientes = state.adminData.cobros.filter((cobro) => String(cobro.estado).toUpperCase() === "PENDIENTE").length;
  const ticketsAbiertos = state.adminData.tickets.filter((ticket) => ["ABIERTO", "EN_REVISION"].includes(String(ticket.estado).toUpperCase())).length;

  qs("#statLocales").textContent = localesActivos;
  qs("#statUsuarios").textContent = usuariosActivos;
  qs("#statCobrosPendientes").textContent = cobrosPendientes;
  qs("#statTicketsAbiertos").textContent = ticketsAbiertos;
}

function renderLocales() {
  const container = qs("#localesList");

  if (!state.adminData.locales.length) {
    container.innerHTML = emptyState("Todavía no hay locales registrados.");
    return;
  }

  container.innerHTML = state.adminData.locales.map((local) => `
    <article class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${local.nombreLocal || "Local sin nombre"}</div>
          <div class="item-subtitle">${local.categoria || "Sin categoría"} · Local ${local.numeroLocal || "sin número"}</div>
        </div>
        <span class="badge ${badgeClass(local.estado)}">${local.estado || "ACTIVO"}</span>
      </div>

      <div class="item-meta">
        <span class="badge blue">${local.tenantId}</span>
        <span class="badge">Responsable: ${local.propietario || "No registrado"}</span>
        <span class="badge">Tel: ${local.telefono || "No registrado"}</span>
      </div>

      <div class="item-actions">
        <button class="small-btn red" onclick="deactivateTenant('${local.tenantId}')">Desactivar</button>
      </div>
    </article>
  `).join("");
}

function renderUsuarios() {
  const container = qs("#usuariosList");

  if (!state.adminData.usuarios.length) {
    container.innerHTML = emptyState("Todavía no hay usuarios registrados.");
    return;
  }

  container.innerHTML = state.adminData.usuarios.map((user) => `
    <article class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${user.nombre || user.usuario}</div>
          <div class="item-subtitle">Usuario: ${user.usuario} · ${getTenantName(user.tenantId)}</div>
        </div>
        <span class="badge ${badgeClass(user.estado)}">${user.estado || "ACTIVO"}</span>
      </div>

      <div class="item-meta">
        <span class="badge blue">${user.rol || "ARRENDATARIO"}</span>
        <span class="badge">${user.correo || "Sin correo"}</span>
        <span class="badge">${user.telefono || "Sin teléfono"}</span>
      </div>

      <div class="item-actions">
        <button class="small-btn red" onclick="deactivateUser('${user.id}')">Desactivar</button>
      </div>
    </article>
  `).join("");
}

function renderCobros() {
  const container = qs("#cobrosList");

  if (!state.adminData.cobros.length) {
    container.innerHTML = emptyState("Todavía no hay cobros emitidos.");
    return;
  }

  const ordered = [...state.adminData.cobros].reverse();

  container.innerHTML = ordered.map((cobro) => `
    <article class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${cobro.concepto || "Cobro sin concepto"}</div>
          <div class="item-subtitle">${getTenantName(cobro.tenantId)} · ${cobro.tipo || "OTRO"}</div>
        </div>
        <span class="badge ${badgeClass(cobro.estado)}">${cobro.estado || "PENDIENTE"}</span>
      </div>

      <div class="item-meta">
        <span class="badge green">${formatMoney(cobro.monto)}</span>
        <span class="badge">Vence: ${formatDate(cobro.fechaVencimiento)}</span>
        <span class="badge">Emitido: ${formatDate(cobro.fechaEmision)}</span>
      </div>

      <div class="item-actions">
        <button class="small-btn green" onclick="markChargePaid('${cobro.id}')">Marcar pagado</button>
        <button class="small-btn red" onclick="cancelCharge('${cobro.id}')">Anular</button>
      </div>
    </article>
  `).join("");
}

function renderAdminTickets() {
  const container = qs("#adminTicketsList");

  if (!state.adminData.tickets.length) {
    container.innerHTML = emptyState("No hay tickets registrados.");
    return;
  }

  const ordered = [...state.adminData.tickets].reverse();

  container.innerHTML = ordered.map((ticket) => `
    <article class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${ticket.asunto || "Ticket sin asunto"}</div>
          <div class="item-subtitle">${getTenantName(ticket.tenantId)}</div>
        </div>
        <span class="badge ${badgeClass(ticket.estado)}">${ticket.estado || "ABIERTO"}</span>
      </div>

      <p>${ticket.descripcion || ""}</p>

      ${ticket.respuestaAdmin ? `<p><strong>Respuesta:</strong> ${ticket.respuestaAdmin}</p>` : ""}

      <div class="item-meta">
        <span class="badge ${badgeClass(ticket.prioridad)}">Prioridad: ${ticket.prioridad || "MEDIA"}</span>
        <span class="badge">Creado: ${formatDate(ticket.createdAt)}</span>
      </div>

      <div class="item-actions">
        <button class="small-btn blue" onclick="replyTicketPrompt('${ticket.id}')">Responder</button>
        <button class="small-btn red" onclick="closeTicket('${ticket.id}')">Cerrar</button>
      </div>
    </article>
  `).join("");
}

function renderAdminLogistica() {
  const container = qs("#adminLogisticaList");

  if (!state.adminData.logistica.length) {
    container.innerHTML = emptyState("No hay solicitudes logísticas.");
    return;
  }

  const ordered = [...state.adminData.logistica].reverse();

  container.innerHTML = ordered.map((item) => `
    <article class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${item.tipoSolicitud || "Solicitud"}</div>
          <div class="item-subtitle">${getTenantName(item.tenantId)}</div>
        </div>
        <span class="badge ${badgeClass(item.estado)}">${item.estado || "PENDIENTE"}</span>
      </div>

      <p>${item.descripcion || ""}</p>

      ${item.respuestaAdmin ? `<p><strong>Respuesta:</strong> ${item.respuestaAdmin}</p>` : ""}

      <div class="item-meta">
        <span class="badge">Fecha solicitada: ${formatDate(item.fechaSolicitada)}</span>
      </div>

      <div class="item-actions">
        <button class="small-btn green" onclick="approveLogisticsPrompt('${item.id}', 'APROBADO')">Aprobar</button>
        <button class="small-btn red" onclick="approveLogisticsPrompt('${item.id}', 'RECHAZADO')">Rechazar</button>
      </div>
    </article>
  `).join("");
}

function renderDocumentos() {
  const container = qs("#documentosList");

  if (!state.adminData.documentos.length) {
    container.innerHTML = emptyState("No hay documentos registrados.");
    return;
  }

  const docs = state.adminData.documentos.filter((doc) => String(doc.estado).toUpperCase() !== "ELIMINADO").reverse();

  if (!docs.length) {
    container.innerHTML = emptyState("No hay documentos activos.");
    return;
  }

  container.innerHTML = docs.map((doc) => `
    <article class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${doc.titulo || "Documento"}</div>
          <div class="item-subtitle">${doc.descripcion || "Sin descripción"}</div>
        </div>
        <span class="badge ${badgeClass(doc.visibilidad)}">${doc.visibilidad || "ALL"}</span>
      </div>

      <div class="item-meta">
        <span class="badge">Local: ${doc.tenantId ? getTenantName(doc.tenantId) : "General"}</span>
        <span class="badge">Creado: ${formatDate(doc.createdAt)}</span>
      </div>

      <div class="item-actions">
        <a class="small-btn blue" href="${doc.url}" target="_blank" rel="noopener">Abrir</a>
        <button class="small-btn red" onclick="deleteDocument('${doc.id}')">Eliminar</button>
      </div>
    </article>
  `).join("");
}

function renderNotificaciones() {
  const container = qs("#notificacionesList");

  if (!state.adminData.notificaciones.length) {
    container.innerHTML = emptyState("No hay notificaciones registradas.");
    return;
  }

  const ordered = [...state.adminData.notificaciones].reverse();

  container.innerHTML = ordered.map((noti) => `
    <article class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${noti.titulo || "Aviso"}</div>
          <div class="item-subtitle">${getTenantName(noti.tenantId)} · ${noti.tipo || "AVISO"}</div>
        </div>
        <span class="badge ${badgeClass(noti.estado)}">${noti.estado || "NUEVA"}</span>
      </div>

      <p>${noti.mensaje || ""}</p>

      <div class="item-meta">
        <span class="badge">Creado: ${formatDate(noti.createdAt)}</span>
      </div>
    </article>
  `).join("");
}

/*******************************************************
 * TENANT DATA
 *******************************************************/

async function loadTenantData() {
  if (!state.user || !state.user.tenantId) return;

  try {
    const result = await apiGet({
      action: "getTenantData",
      tenantId: state.user.tenantId
    });

    if (!result.ok) {
      showToast(result.message || "No se pudo cargar tu información");
      return;
    }

    state.tenantData = {
      local: result.local || null,
      cobros: result.cobros || [],
      tickets: result.tickets || [],
      logistica: result.logistica || [],
      documentos: result.documentos || [],
      notificaciones: result.notificaciones || []
    };

    qs("#tenantUserName").textContent = state.user.nombre || state.user.usuario || "Arrendatario";
    qs("#tenantLocalName").textContent = state.tenantData.local?.nombreLocal || "Panel del local";

    renderTenant();

  } catch (error) {
    showToast("Error cargando datos del local");
  }
}

function renderTenant() {
  renderTenantStats();
  renderTenantCobros();
  renderTenantTickets();
  renderTenantLogistica();
  renderTenantDocumentos();
  renderTenantNotificaciones();
}

function renderTenantStats() {
  const pendientes = state.tenantData.cobros.filter((cobro) => String(cobro.estado).toUpperCase() === "PENDIENTE").length;

  qs("#tenantStatPendientes").textContent = pendientes;
  qs("#tenantStatTickets").textContent = state.tenantData.tickets.length;
  qs("#tenantStatLogistica").textContent = state.tenantData.logistica.length;
  qs("#tenantStatAvisos").textContent = state.tenantData.notificaciones.length;
}

function renderTenantCobros() {
  const container = qs("#tenantCobrosList");

  if (!state.tenantData.cobros.length) {
    container.innerHTML = emptyState("No tienes cobros registrados.");
    return;
  }

  const ordered = [...state.tenantData.cobros].reverse();

  container.innerHTML = ordered.map((cobro) => `
    <article class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${cobro.concepto || "Cobro"}</div>
          <div class="item-subtitle">${cobro.tipo || "OTRO"}</div>
        </div>
        <span class="badge ${badgeClass(cobro.estado)}">${cobro.estado || "PENDIENTE"}</span>
      </div>

      <div class="item-meta">
        <span class="badge green">${formatMoney(cobro.monto)}</span>
        <span class="badge">Vence: ${formatDate(cobro.fechaVencimiento)}</span>
        <span class="badge">Emitido: ${formatDate(cobro.fechaEmision)}</span>
      </div>

      ${cobro.observacion ? `<p>${cobro.observacion}</p>` : ""}
    </article>
  `).join("");
}

function renderTenantTickets() {
  const container = qs("#tenantTicketsList");

  if (!state.tenantData.tickets.length) {
    container.innerHTML = emptyState("No tienes tickets creados.");
    return;
  }

  const ordered = [...state.tenantData.tickets].reverse();

  container.innerHTML = ordered.map((ticket) => `
    <article class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${ticket.asunto || "Ticket"}</div>
          <div class="item-subtitle">Prioridad: ${ticket.prioridad || "MEDIA"}</div>
        </div>
        <span class="badge ${badgeClass(ticket.estado)}">${ticket.estado || "ABIERTO"}</span>
      </div>

      <p>${ticket.descripcion || ""}</p>

      ${ticket.respuestaAdmin ? `<p><strong>Respuesta administración:</strong> ${ticket.respuestaAdmin}</p>` : ""}
    </article>
  `).join("");
}

function renderTenantLogistica() {
  const container = qs("#tenantLogisticaList");

  if (!state.tenantData.logistica.length) {
    container.innerHTML = emptyState("No tienes solicitudes logísticas.");
    return;
  }

  const ordered = [...state.tenantData.logistica].reverse();

  container.innerHTML = ordered.map((item) => `
    <article class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${item.tipoSolicitud || "Solicitud"}</div>
          <div class="item-subtitle">Fecha: ${formatDate(item.fechaSolicitada)}</div>
        </div>
        <span class="badge ${badgeClass(item.estado)}">${item.estado || "PENDIENTE"}</span>
      </div>

      <p>${item.descripcion || ""}</p>

      ${item.respuestaAdmin ? `<p><strong>Respuesta:</strong> ${item.respuestaAdmin}</p>` : ""}
    </article>
  `).join("");
}

function renderTenantDocumentos() {
  const container = qs("#tenantDocumentosList");

  if (!state.tenantData.documentos.length) {
    container.innerHTML = emptyState("No hay documentos disponibles.");
    return;
  }

  container.innerHTML = state.tenantData.documentos.reverse().map((doc) => `
    <article class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${doc.titulo || "Documento"}</div>
          <div class="item-subtitle">${doc.descripcion || "Documento administrativo"}</div>
        </div>
        <span class="badge blue">${doc.visibilidad || "ALL"}</span>
      </div>

      <div class="item-actions">
        <a class="small-btn blue" href="${doc.url}" target="_blank" rel="noopener">Abrir documento</a>
      </div>
    </article>
  `).join("");
}

function renderTenantNotificaciones() {
  const container = qs("#tenantNotificacionesList");

  if (!state.tenantData.notificaciones.length) {
    container.innerHTML = emptyState("No tienes avisos todavía.");
    return;
  }

  const ordered = [...state.tenantData.notificaciones].reverse();

  container.innerHTML = ordered.map((noti) => `
    <article class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${noti.titulo || "Aviso"}</div>
          <div class="item-subtitle">${noti.tipo || "AVISO"} · ${formatDate(noti.createdAt)}</div>
        </div>
        <span class="badge ${badgeClass(noti.estado)}">${noti.estado || "NUEVA"}</span>
      </div>

      <p>${noti.mensaje || ""}</p>

      <div class="item-actions">
        <button class="small-btn green" onclick="markNotificationRead('${noti.id}')">Marcar leído</button>
      </div>
    </article>
  `).join("");
}

/*******************************************************
 * NAVIGATION
 *******************************************************/

function bindAdminNavigation() {
  qsa("[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      qsa("[data-admin-tab]").forEach((btn) => btn.classList.remove("active"));
      qsa(".admin-tab").forEach((tab) => tab.classList.remove("active"));

      button.classList.add("active");
      qs(`#admin-${button.dataset.adminTab}`).classList.add("active");
    });
  });
}

function bindTenantNavigation() {
  qsa("[data-tenant-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      qsa("[data-tenant-tab]").forEach((btn) => btn.classList.remove("active"));
      qsa(".tenant-tab").forEach((tab) => tab.classList.remove("active"));

      button.classList.add("active");
      qs(`#tenant-${button.dataset.tenantTab}`).classList.add("active");
    });
  });
}

/*******************************************************
 * FORMS
 *******************************************************/

function bindForms() {
  qs("#createTenantForm").addEventListener("submit", handleCreateTenant);
  qs("#createUserForm").addEventListener("submit", handleCreateUser);
  qs("#createChargeForm").addEventListener("submit", handleCreateCharge);
  qs("#uploadDocumentForm").addEventListener("submit", handleUploadDocument);
  qs("#createNotificationForm").addEventListener("submit", handleCreateNotification);

  qs("#tenantCreateTicketForm").addEventListener("submit", handleTenantCreateTicket);
  qs("#tenantCreateLogisticsForm").addEventListener("submit", handleTenantCreateLogistics);
}

async function handleCreateTenant(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  setLoading(button, "Creando...");

  try {
    const data = getFormData(form);

    const result = await apiPost({
      action: "createTenant",
      ...data
    });

    showToast(result.message || "Proceso terminado");

    if (result.ok) {
      form.reset();
      await loadAdminData();
    }
  } catch (error) {
    showToast("Error creando local");
  } finally {
    unsetLoading(button);
  }
}

async function handleCreateUser(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  setLoading(button, "Creando...");

  try {
    const data = getFormData(form);

    const result = await apiPost({
      action: "createUser",
      rol: "ARRENDATARIO",
      ...data
    });

    showToast(result.message || "Proceso terminado");

    if (result.ok) {
      form.reset();
      await loadAdminData();
    }
  } catch (error) {
    showToast("Error creando usuario");
  } finally {
    unsetLoading(button);
  }
}

async function handleCreateCharge(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  setLoading(button, "Emitiendo...");

  try {
    const data = getFormData(form);

    const result = await apiPost({
      action: "createCharge",
      ...data
    });

    showToast(result.message || "Proceso terminado");

    if (result.ok) {
      form.reset();
      await loadAdminData();
    }
  } catch (error) {
    showToast("Error emitiendo cobro");
  } finally {
    unsetLoading(button);
  }
}

async function handleUploadDocument(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  setLoading(button, "Guardando...");

  try {
    const data = getFormData(form);

    const result = await apiPost({
      action: "uploadDocument",
      ...data
    });

    showToast(result.message || "Proceso terminado");

    if (result.ok) {
      form.reset();
      await loadAdminData();
    }
  } catch (error) {
    showToast("Error guardando documento");
  } finally {
    unsetLoading(button);
  }
}

async function handleCreateNotification(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  setLoading(button, "Enviando...");

  try {
    const data = getFormData(form);

    const result = await apiPost({
      action: "createNotification",
      ...data
    });

    showToast(result.message || "Proceso terminado");

    if (result.ok) {
      form.reset();
      await loadAdminData();
    }
  } catch (error) {
    showToast("Error enviando recordatorio");
  } finally {
    unsetLoading(button);
  }
}

async function handleTenantCreateTicket(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  setLoading(button, "Enviando...");

  try {
    const data = getFormData(form);

    const result = await apiPost({
      action: "createTicket",
      tenantId: state.user.tenantId,
      ...data
    });

    showToast(result.message || "Proceso terminado");

    if (result.ok) {
      form.reset();
      await loadTenantData();
    }
  } catch (error) {
    showToast("Error creando ticket");
  } finally {
    unsetLoading(button);
  }
}

async function handleTenantCreateLogistics(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  setLoading(button, "Enviando...");

  try {
    const data = getFormData(form);

    const result = await apiPost({
      action: "createLogisticsRequest",
      tenantId: state.user.tenantId,
      ...data
    });

    showToast(result.message || "Proceso terminado");

    if (result.ok) {
      form.reset();
      await loadTenantData();
    }
  } catch (error) {
    showToast("Error creando solicitud");
  } finally {
    unsetLoading(button);
  }
}

/*******************************************************
 * ADMIN ACTIONS
 *******************************************************/

async function deactivateTenant(tenantId) {
  if (!confirm("¿Seguro que deseas desactivar este local?")) return;

  try {
    const result = await apiPost({
      action: "deactivateTenant",
      tenantId
    });

    showToast(result.message || "Proceso terminado");
    await loadAdminData();
  } catch (error) {
    showToast("Error desactivando local");
  }
}

async function deactivateUser(id) {
  if (!confirm("¿Seguro que deseas desactivar este usuario?")) return;

  try {
    const result = await apiPost({
      action: "deactivateUser",
      id
    });

    showToast(result.message || "Proceso terminado");
    await loadAdminData();
  } catch (error) {
    showToast("Error desactivando usuario");
  }
}

async function markChargePaid(id) {
  if (!confirm("¿Confirmas que este cobro ya fue pagado?")) return;

  try {
    const result = await apiPost({
      action: "markChargePaid",
      id
    });

    showToast(result.message || "Proceso terminado");
    await loadAdminData();
  } catch (error) {
    showToast("Error marcando pago");
  }
}

async function cancelCharge(id) {
  const observacion = prompt("Motivo de anulación:", "Anulado por administración");

  if (observacion === null) return;

  try {
    const result = await apiPost({
      action: "cancelCharge",
      id,
      observacion
    });

    showToast(result.message || "Proceso terminado");
    await loadAdminData();
  } catch (error) {
    showToast("Error anulando cobro");
  }
}

async function replyTicketPrompt(id) {
  const respuestaAdmin = prompt("Escribe la respuesta para el arrendatario:");

  if (!respuestaAdmin) return;

  try {
    const result = await apiPost({
      action: "replyTicket",
      id,
      respuestaAdmin
    });

    showToast(result.message || "Proceso terminado");
    await loadAdminData();
  } catch (error) {
    showToast("Error respondiendo ticket");
  }
}

async function closeTicket(id) {
  if (!confirm("¿Cerrar este ticket?")) return;

  try {
    const result = await apiPost({
      action: "closeTicket",
      id
    });

    showToast(result.message || "Proceso terminado");
    await loadAdminData();
  } catch (error) {
    showToast("Error cerrando ticket");
  }
}

async function approveLogisticsPrompt(id, estado) {
  const respuestaAdmin = prompt(`Respuesta para marcar como ${estado}:`, estado === "APROBADO" ? "Solicitud aprobada." : "Solicitud rechazada.");

  if (respuestaAdmin === null) return;

  try {
    const result = await apiPost({
      action: "approveLogistics",
      id,
      estado,
      respuestaAdmin
    });

    showToast(result.message || "Proceso terminado");
    await loadAdminData();
  } catch (error) {
    showToast("Error actualizando logística");
  }
}

async function deleteDocument(id) {
  if (!confirm("¿Eliminar este documento?")) return;

  try {
    const result = await apiPost({
      action: "deleteDocument",
      id
    });

    showToast(result.message || "Proceso terminado");
    await loadAdminData();
  } catch (error) {
    showToast("Error eliminando documento");
  }
}

/*******************************************************
 * TENANT ACTIONS
 *******************************************************/

async function markNotificationRead(id) {
  try {
    const result = await apiPost({
      action: "markNotificationRead",
      id
    });

    showToast(result.message || "Proceso terminado");
    await loadTenantData();
  } catch (error) {
    showToast("Error actualizando notificación");
  }
}
