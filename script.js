const calendar = document.getElementById("calendar");
const monthYear = document.getElementById("monthYear");
const modal = document.getElementById("taskModal");
const modalDate = document.getElementById("modalDate");
const taskInput = document.getElementById("taskInput");
const closeModal = document.getElementById("closeModal");
const saveTask = document.getElementById("saveTask");
let currentDate = new Date();

function renderCalendar() {
calendar.innerHTML = "";
const year = currentDate.getFullYear();
const month = currentDate.getMonth();
const firstDay = new Date(year, month, 1).getDay();
const daysInMonth = new Date(year, month + 1, 0).getDate();

monthYear.textContent = currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

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
function openModal(date) {
modalDate.textContent = `Tareas del ${date}`;
taskInput.value = localStorage.getItem(date) || "";
saveTask.setAttribute("data-date", date);
modal.classList.remove("hidden");
}

closeModal.onclick = () => modal.classList.add("hidden");

saveTask.onclick = () => {
const date = saveTask.getAttribute("data-date");
const task = taskInput.value.trim();
if (task) localStorage.setItem(date, task);
else localStorage.removeItem(date);
modal.classList.add("hidden");
renderCalendar();
};

document.getElementById("prevMonth").onclick = () => {
currentDate.setMonth(currentDate.getMonth() - 1);
renderCalendar();
};

document.getElementById("nextMonth").onclick = () => {
currentDate.setMonth(currentDate.getMonth() + 1);
renderCalendar();
};

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

