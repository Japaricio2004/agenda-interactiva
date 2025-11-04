// Attempt to unregister any existing service workers and clear caches
// This helps remove any previously installed PWA/offline overlay served by a SW.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => {
            try { r.unregister(); } catch (e) { console.warn('SW unregister failed', e); }
        });
    }).catch(err => console.warn('No se pudieron listar service workers', err));
}
// Try to clear caches as well (best-effort)
if (window.caches && caches.keys) {
    caches.keys().then(keys => {
        keys.forEach(key => {
            try { caches.delete(key); } catch (e) { console.warn('Cache delete failed', e); }
        });
    }).catch(err => console.warn('No se pudieron listar caches', err));
}

const calendar = document.getElementById("calendar");
const weekdays = document.getElementById("weekdays");
const monthYear = document.getElementById("monthYear");
const modal = document.getElementById("taskModal");
const modalDate = document.getElementById("modalDate");
const taskInput = document.getElementById("taskInput");
const closeModal = document.getElementById("closeModal");
const saveTask = document.getElementById("saveTask");
const copyTask = document.getElementById("copyTask");
const toast = document.getElementById("toast");
// Zona horaria objetivo: Lima, Perú
const TIME_ZONE = 'America/Lima';

// pequeña utilidad para escapar texto al inyectar en el documento de impresión
function escapeHtml(unsafe) {
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getLimaNow() {
    // Devuelve un Date construido a partir de la representación en la zona horaria de Lima.
    // Esta técnica crea un Date con la hora local equivalente a la hora de Lima.
    return new Date(new Date().toLocaleString('en-US', { timeZone: TIME_ZONE }));
}

function getLimaYMD() {
    // Devuelve año/mes/día y string ISO (YYYY-MM-DD) para la fecha actual en la zona TIME_ZONE
    const dtf = new Intl.DateTimeFormat('en', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = dtf.formatToParts(new Date());
    let y = '', m = '', d = '';
    for (const p of parts) {
        if (p.type === 'year') y = p.value;
        if (p.type === 'month') m = p.value;
        if (p.type === 'day') d = p.value;
    }
    const iso = `${y}-${m}-${d}`;
    return { year: y, month: m, day: d, iso };
}

let currentDate = getLimaNow();
// inicio de semana fijo (1 = lunes)
const weekStart = 1;
let lastFocusedElement = null;
const monthsOverview = document.getElementById('monthsOverview');
let monthsVisible = window.innerWidth <= 640; // show months on small screens by default

function renderMonths() {
    if (!monthsOverview) return;
    monthsOverview.innerHTML = '';
    const fmt = new Intl.DateTimeFormat('es-PE', { month: 'short', timeZone: TIME_ZONE });
    for (let m = 0; m < 12; m++) {
        const d = new Date(2000, m, 1);
        const label = fmt.format(d);
        const tile = document.createElement('div');
        tile.className = 'month-tile';
        tile.setAttribute('role', 'button');
        tile.setAttribute('tabindex', '0');
        tile.dataset.month = m;
        tile.innerHTML = `<div>${label}</div>`;
        tile.addEventListener('click', () => selectMonth(m, tile));
        tile.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') selectMonth(m, tile); });
        monthsOverview.appendChild(tile);
    }
}

function selectMonth(m, tile) {
    if (tile) {
        tile.classList.add('selected');
        setTimeout(() => tile.classList.remove('selected'), 300);
    }
    // set currentDate to selected month (keep year based on currentDate)
    const year = currentDate.getFullYear();
    currentDate = new Date(year, m, 1);
    renderCalendar();
    // hide months overview and show calendar (on mobile)
    document.body.classList.add('months-hidden');
    monthsVisible = false;
}
// If arriving on mobile, hide calendar and show months by default
if (monthsOverview && window.innerWidth <= 640) {
    document.body.classList.remove('months-hidden');
    monthsVisible = true;
} else {
    // ensure calendar visible on larger screens
    document.body.classList.add('months-hidden');
}

window.addEventListener('resize', () => {
    // if crossing breakpoint, update default
    if (window.innerWidth <= 640) {
        document.body.classList.remove('months-hidden');
        monthsVisible = true;
    } else {
        document.body.classList.add('months-hidden');
        monthsVisible = false;
    }
});

function renderCalendar() {
calendar.innerHTML = "";
renderWeekdays();
const year = currentDate.getFullYear();
const month = currentDate.getMonth();
const firstDay = (new Date(year, month, 1).getDay() - weekStart + 7) % 7;
const daysInMonth = new Date(year, month + 1, 0).getDate();

monthYear.textContent = currentDate.toLocaleDateString("es-PE", { month: "long", year: "numeric", timeZone: TIME_ZONE });

for (let i = 0; i < firstDay; i++) {
    calendar.innerHTML += `<div></div>`;
}

for (let day = 1; day <= daysInMonth; day++) {
    const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const task = localStorage.getItem(fullDate);

    const dayCard = document.createElement("div");
    dayCard.className = `card-3d bg-slate-700 p-4 rounded-xl cursor-pointer hover:bg-slate-600 ${task ? 'border-2 border-cyan-500' : ''}`;
    dayCard.textContent = day;
    dayCard.onclick = () => openModal(fullDate);
    calendar.appendChild(dayCard);
}
}

function renderWeekdays() {
    const labels = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    weekdays.innerHTML = '';
    for (let i = 0; i < 7; i++) {
        const idx = (i + weekStart) % 7;
        const el = document.createElement('div');
        el.className = 'text-sm font-semibold text-gray-300';
        el.textContent = labels[idx];
        weekdays.appendChild(el);
    }
}

function openModal(date) {
modalDate.textContent = `Tareas del ${date}`;
taskInput.value = localStorage.getItem(date) || "";
saveTask.setAttribute("data-date", date);
lastFocusedElement = document.activeElement;
modal.classList.remove("hidden");
// foco en textarea para accesibilidad
setTimeout(() => taskInput.focus(), 50);
// escuchar Escape
document.addEventListener('keydown', handleKeydown);
}

closeModal.onclick = () => modal.classList.add("hidden");

saveTask.onclick = () => {
const date = saveTask.getAttribute("data-date");
const task = taskInput.value.trim();
if (task) localStorage.setItem(date, task);
else localStorage.removeItem(date);
modal.classList.add("hidden");
document.removeEventListener('keydown', handleKeydown);
if (lastFocusedElement) lastFocusedElement.focus();
renderCalendar();
};

// close modal and restore focus when clicking cancelar
closeModal.addEventListener('click', () => {
    modal.classList.add('hidden');
    document.removeEventListener('keydown', handleKeydown);
    if (lastFocusedElement) lastFocusedElement.focus();
});

function handleKeydown(e) {
    if (e.key === 'Escape') {
        modal.classList.add('hidden');
        document.removeEventListener('keydown', handleKeydown);
        if (lastFocusedElement) lastFocusedElement.focus();
    }
}

// Copiar con feedback no intrusivo
if (copyTask) {
    copyTask.addEventListener('click', async () => {
        try {
            const text = taskInput.value || '';
            await navigator.clipboard.writeText(text);
            showToast('Texto copiado al portapapeles');
        } catch (err) {
            showToast('No se pudo copiar');
        }
    });
}

function showToast(msg, ms = 1800) {
    if (!toast) return;
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.classList.remove('pointer-events-none');
    toast.classList.add('opacity-100');
    setTimeout(() => {
        toast.style.opacity = '0';
    }, ms);
}

// Export printable month view to PDF via print dialog
function exportPdfMonth() {
    // Clone relevant nodes
    const header = document.getElementById('monthYear');
    const weekdaysNode = document.getElementById('weekdays');
    const calendarNode = document.getElementById('calendar');

    // Build printable HTML as a string first
    let wdHTML = '';
    if (weekdaysNode) {
        const wdClone = weekdaysNode.cloneNode(true);
        wdClone.className = 'grid grid-cols-7 gap-2 text-center mb-2';
        wdHTML = wdClone.outerHTML;
    }

    let calHTML = '';
    if (calendarNode) {
        const calClone = calendarNode.cloneNode(true);
        calClone.className = 'grid grid-cols-7 gap-3 text-center';
        Array.from(calClone.querySelectorAll('.card-3d')).forEach(c => {
            c.className = 'card-3d p-3 rounded-lg border';
            const dayNumber = parseInt(c.textContent, 10);
            if (!isNaN(dayNumber)) {
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const fullDate = `${year}-${month}-${String(dayNumber).padStart(2,'0')}`;
                const task = localStorage.getItem(fullDate);
                if (task) {
                    c.innerHTML = `<div style="font-weight:700;margin-bottom:6px">${dayNumber}</div><div style="font-size:12px;color:#0f172a;background:#f1f5f9;padding:6px;border-radius:6px;">${escapeHtml(task)}</div>`;
                } else {
                    c.innerHTML = `<div style="font-weight:700">${dayNumber}</div>`;
                }
            }
        });
        calHTML = calClone.outerHTML;
    }

    const titleText = header ? header.textContent : '';
    // fecha de exportación en zona TIME_ZONE
    const exportDate = new Date().toLocaleString('es-PE', { timeZone: TIME_ZONE, year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const headerHTML = `
        <div class="export-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:12px;">
                <img src="images/agenda.png" alt="logo" style="height:40px;opacity:0.95;filter:none;" />
                <div style="font-size:18px;font-weight:700;color:inherit">${escapeHtml(titleText)}</div>
            </div>
            <div class="export-date" style="font-size:12px;color:rgba(15,23,42,0.7);">Exportado: ${escapeHtml(exportDate)}</div>
        </div>
    `;
    // CSS overrides to make the print view independent of Tailwind CDN
    const isLight = document.body.classList.contains('light');
    const printOverrides = isLight ? `
        /* Light mode printable CSS */
        .grid { display: grid !important; gap: 8px; }
        .grid-cols-7 { grid-template-columns: repeat(7, 1fr) !important; }
        .grid-cols-3 { grid-template-columns: repeat(3, 1fr) !important; }
        #weekdays, .weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 8px; }
        #weekdays div { text-align: center; font-weight: 700; color: #0f172a; }
        .card-3d { background: #ffffff; color: #0f172a; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; box-shadow: none; }
        .card-3d > div { margin: 0; }
        .card-3d .task { font-size: 12px; color: #0f172a; background: #f8fafc; padding: 6px; border-radius: 6px; margin-top:6px; }
        body { background: #ffffff !important; color: #0f172a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
        h2 { color: #0f172a; }
        @media print { footer, #toast, #toggleTheme { display: none !important; } }
    ` : `
        /* Dark mode printable CSS */
        .grid { display: grid !important; gap: 8px; }
        .grid-cols-7 { grid-template-columns: repeat(7, 1fr) !important; }
        .grid-cols-3 { grid-template-columns: repeat(3, 1fr) !important; }
        #weekdays, .weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 8px; }
        #weekdays div { text-align: center; font-weight: 700; color: #cbd5e1; }
        body { background: #0b1220 !important; color: #e6f0fb !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
        .card-3d { background: linear-gradient(180deg,#0f172a,#071024); color: #e6f0fb; border: 1px solid rgba(96,165,250,0.08); padding: 10px; border-radius: 8px; box-shadow: none; }
        .card-3d > div { margin: 0; }
        .card-3d .task { font-size: 12px; color: #0b1220; background: #cfe8ff; padding: 6px; border-radius: 6px; margin-top:6px; }
        h2 { color: #a5f3fc; }
        @media print { footer, #toast, #toggleTheme { display: none !important; } }
    `;

    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(titleText)}</title><link rel="stylesheet" href="styles.css"><style>${printOverrides}</style></head><body><div style="padding:12px 18px; border-bottom:1px solid #e6eef6;margin-bottom:8px;">${headerHTML}</div>${wdHTML}${calHTML}</body></html>`;

    // Try opening a window. If blocked, fallback to an iframe
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        try {
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            // give browser a short moment to render
            setTimeout(() => {
                try {
                    printWindow.focus();
                    printWindow.print();
                } catch (err) {
                    console.error(err);
                    showToast('Error al generar PDF');
                }
            }, 500);
            return;
        } catch (err) {
            console.warn('Imprimir en ventana falló, intentando iframe fallback', err);
            // continue to iframe fallback
        }
    }

    // Fallback: create a hidden iframe and print from there (works cuando popups están bloqueados)
    try {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        const idoc = iframe.contentWindow.document;
        idoc.open();
        idoc.write(html);
        idoc.close();
        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                // remove iframe after a delay
                setTimeout(() => document.body.removeChild(iframe), 1000);
            } catch (err) {
                console.error(err);
                showToast('Error al generar PDF');
                document.body.removeChild(iframe);
            }
        }, 700);
        return;
    } catch (err) {
        console.error('Fallback de iframe falló', err);
        showToast('No se pudo abrir la vista de impresión. Revisa la configuración del navegador.');
    }
}

document.getElementById("prevMonth").onclick = () => {
currentDate.setMonth(currentDate.getMonth() - 1);
renderCalendar();
};

document.getElementById("nextMonth").onclick = () => {
currentDate.setMonth(currentDate.getMonth() + 1);
renderCalendar();
};

// Export button handler
const exportBtn = document.getElementById('exportPdf');
if (exportBtn) exportBtn.addEventListener('click', exportPdfMonth);

// render months overview and calendar
renderMonths();
renderCalendar();

const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");
let particles = [];
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

for (let i = 0; i < 100; i++) {
particles.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    z: Math.random() * canvas.width,
    r: Math.random() * 2 + 1
});
}
function animate() {
ctx.fillStyle = "rgba(15, 23, 42, 0.2)";
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = "#67e8f9";

for (let p of particles) {
    p.z -= 2;
    if (p.z <= 0) p.z = canvas.width;

    let sx = (p.x - canvas.width / 2) * (canvas.width / p.z) + canvas.width / 2;
    let sy = (p.y - canvas.height / 2) * (canvas.width / p.z) + canvas.height / 2;
    let sr = p.r * (canvas.width / p.z);

    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
}
requestAnimationFrame(animate);
}
animate();

// Ajustar canvas al redimensionar
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // regenerar partículas para adaptarse al nuevo tamaño
    particles = [];
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            z: Math.random() * canvas.width,
            r: Math.random() * 2 + 1
        });
    }
}

window.addEventListener('resize', () => {
    resizeCanvas();
});

// resaltar día actual dentro del renderCalendar (inserto aquí un pequeño parche)
const originalRenderCalendar = renderCalendar;
renderCalendar = function() {
    originalRenderCalendar();
    // marcar hoy (según hora de Lima)
    const todayISO = getLimaYMD().iso;
    const dayCards = calendar.querySelectorAll('div.card-3d');
    dayCards.forEach(card => {
        // intentamos deducir la fecha a partir del texto y mes/anyo actuales
        const dayNumber = parseInt(card.textContent, 10);
        if (!isNaN(dayNumber)) {
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const fullDate = `${year}-${month}-${String(dayNumber).padStart(2,'0')}`;
            if (fullDate === todayISO) {
                card.classList.add('today', 'border-2', 'border-yellow-400');
            }
        }
    });
};

