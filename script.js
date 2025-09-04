const STORAGE_KEYS = {
  events: "cem_events",
  registrations: "cem_registrations"
};

async function bootstrapEvents() {
  const existing = localStorage.getItem(STORAGE_KEYS.events);
  if (existing) return JSON.parse(existing);
  try {
    const res = await fetch("./events.json", { cache: "no-store" });
    const data = await res.json();
    localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(data));
    return data;
  } catch (e) {
    console.error("Failed to load events.json", e);
    return [];
  }
}

function getEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.events);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents(events) {
  localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events));
}

function getRegistrations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.registrations);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRegistrations(regs) {
  localStorage.setItem(STORAGE_KEYS.registrations, JSON.stringify(regs));
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}

function byQuery(eventObj, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    eventObj.title.toLowerCase().includes(s) ||
    eventObj.description.toLowerCase().includes(s) ||
    eventObj.location.toLowerCase().includes(s) ||
    eventObj.category.toLowerCase().includes(s) ||
    (eventObj.tags || []).some(t => String(t).toLowerCase().includes(s))
  );
}

function byCategory(eventObj, cat) {
  if (!cat) return true;
  return eventObj.category === cat;
}

function byDate(eventObj, when) {
  if (!when) return true;
  const today = new Date();
  const d = new Date(eventObj.date);
  if (when === "upcoming") return d >= new Date(today.toDateString());
  if (when === "past") return d < new Date(today.toDateString());
  return true;
}

async function initListPage() {
  await bootstrapEvents();
  const events = getEvents();

  const qInput = document.querySelector("#search");
  const catSelect = document.querySelector("#category");
  const whenSelect = document.querySelector("#when");
  const grid = document.querySelector("#grid");

  const categories = Array.from(new Set(events.map(e => e.category))).sort();
  catSelect.innerHTML = '<option value="">All categories</option>' + categories.map(c => `<option value="${c}">${c}</option>`).join("");

  function render() {
    const q = qInput.value.trim();
    const cat = catSelect.value;
    const when = whenSelect.value;
    const filtered = events
      .filter(e => byQuery(e, q))
      .filter(e => byCategory(e, cat))
      .filter(e => byDate(e, when))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    grid.innerHTML = filtered.map(e => `
      <div class="card clickable-event" data-event-id="${e.id}">
        <div class="badges">
          <span class="badge">${e.category}</span>
          ${e.tags?.slice(0, 2).map(t => `<span class="badge">${t}</span>`).join("") || ""}
        </div>
        <h3>${e.title}</h3>
        <div class="muted">${formatDate(e.date)} · ${e.time} · ${e.location}</div>
        <div class="footer-row">
          <span class="muted">Capacity: ${e.capacity}</span>
          <a class="button primary" href="event.html?id=${encodeURIComponent(e.id)}">View</a>
        </div>
      </div>
    `).join("");
  }

  qInput.addEventListener("input", render);
  catSelect.addEventListener("change", render);
  whenSelect.addEventListener("change", render);
  
  // Add click event listeners to event cards
  function addCardClickListeners() {
    document.querySelectorAll('.clickable-event').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking on the View button or its children
        if (e.target.closest('.button')) {
          return;
        }
        
        const eventId = card.getAttribute('data-event-id');
        if (eventId) {
          window.location.href = `event.html?id=${encodeURIComponent(eventId)}`;
        }
      });
    });
  }
  
  render();
  // Add click listeners after rendering
  setTimeout(addCardClickListeners, 0);
}

function getQueryParam(key) {
  const url = new URL(window.location.href);
  return url.searchParams.get(key);
}

function initDetailPage() {
  const id = getQueryParam("id");
  const events = getEvents();
  const ev = events.find(e => String(e.id) === String(id));
  const detail = document.querySelector("#detail");
  if (!ev) {
    detail.innerHTML = `<div class="panel"><h2>Not found</h2><p class="muted">The event may have been removed.</p></div>`;
    return;
  }

  document.title = `${ev.title} · College Events`;

  const left = document.querySelector("#left");
  const right = document.querySelector("#right");

  left.innerHTML = `
    <div class="panel">
      <div class="badges">
        <span class="badge">${ev.category}</span>
        ${ev.tags?.map(t => `<span class="badge">${t}</span>`).join("") || ""}
      </div>
      <h2>${ev.title}</h2>
      <div class="muted">${formatDate(ev.date)} · ${ev.time} · ${ev.location}</div>
      <p style="margin-top:10px;">${ev.description}</p>
    </div>
  `;

  right.innerHTML = `
    <div class="panel">
      <h3>Register</h3>
      <form id="reg-form">
        <div class="row">
          <input required name="name" placeholder="Full name" />
          <input required type="email" name="email" placeholder="Email" />
        </div>
        <div class="row single">
          <textarea name="notes" rows="3" placeholder="Notes (optional)"></textarea>
        </div>
        <div class="row single">
          <button class="primary" type="submit">Submit registration</button>
        </div>
      </form>
      <div id="reg-success" class="muted" style="display:none;margin-top:8px;">Registration saved locally.</div>
    </div>
  `;

  const form = right.querySelector("#reg-form");
  const success = right.querySelector("#reg-success");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const regs = getRegistrations();
    const record = {
      id: `r_${Date.now()}`,
      eventId: ev.id,
      name: data.name,
      email: data.email,
      notes: data.notes || "",
      createdAt: new Date().toISOString()
    };
    regs.push(record);
    saveRegistrations(regs);
    form.reset();
    success.style.display = "block";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.getAttribute("data-page");
  if (page === "list") initListPage();
  if (page === "detail") initDetailPage();
});


