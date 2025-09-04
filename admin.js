const ADMIN_KEY = "cem_admin_logged_in";

function authIsLoggedIn() {
  return localStorage.getItem(ADMIN_KEY) === "1";
}

function authLogin(username, password) {
  // Simple demo credentials (change as needed)
  if (username === "admin" && password === "password") {
    localStorage.setItem(ADMIN_KEY, "1");
    return true;
  }
  return false;
}

function authLogout() {
  localStorage.removeItem(ADMIN_KEY);
}

function renderLogin() {
  const app = document.querySelector("#admin-app");
  app.innerHTML = `
    <div class="panel" style="max-width:420px;margin:40px auto;">
      <h2>Admin Login</h2>
      <form id="login-form">
        <div class="row single"><input required name="username" placeholder="Username" /></div>
        <div class="row single"><input required type="password" name="password" placeholder="Password" /></div>
        <div class="row single"><button class="primary" type="submit">Login</button></div>
      </form>
      <div id="error" class="muted" style="color:#ff9aa5;display:none;margin-top:8px;">Invalid credentials</div>
    </div>
  `;
  const form = document.querySelector("#login-form");
  const error = document.querySelector("#error");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (authLogin(data.username, data.password)) {
      renderDashboard();
    } else {
      error.style.display = "block";
    }
  });
}

function renderDashboard() {
  const app = document.querySelector("#admin-app");
  const events = getEvents();
  const registrations = getRegistrations();

  app.innerHTML = `
    <div class="panel">
      <div class="footer-row">
        <h2>Events</h2>
                 <div class="admin-controls">
           <button id="add" class="primary">Add event</button>
           <button id="logout" class="secondary">Logout</button>
         </div>
      </div>
      <table>
        <thead>
          <tr><th>Title</th><th>Date</th><th>Category</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${events.map(e => `
            <tr data-id="${e.id}">
              <td>${e.title}</td>
              <td>${e.date} ${e.time}</td>
              <td>${e.category}</td>
              <td>
                <button class="secondary" data-action="edit">Edit</button>
                <button class="danger" data-action="delete">Delete</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <div class="panel" style="margin-top:16px;">
      <h2>Registrations</h2>
      <table>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Event</th><th>When</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${registrations.map(r => {
            const ev = events.find(e => String(e.id) === String(r.eventId));
            return `
              <tr data-reg-id="${r.id}">
                <td>${r.name}</td>
                <td>${r.email}</td>
                <td>${ev ? ev.title : r.eventId}</td>
                <td>${new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  <button class="danger" data-action="delete-reg">Delete</button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  document.querySelector("#logout").addEventListener("click", () => {
    authLogout();
    renderLogin();
  });
  document.querySelector("#add").addEventListener("click", () => renderUpsertForm());

  // Event table buttons
  app.querySelectorAll("tbody tr button").forEach(btn => {
    btn.addEventListener("click", () => {
      const tr = btn.closest("tr");
      const id = tr.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      if (action === "edit") renderUpsertForm(id);
      if (action === "delete") deleteEvent(id);
    });
  });

  // Registration table buttons
  app.querySelectorAll("tbody tr button[data-action='delete-reg']").forEach(btn => {
    btn.addEventListener("click", () => {
      const tr = btn.closest("tr");
      const regId = tr.getAttribute("data-reg-id");
      deleteRegistration(regId);
    });
  });
}

function renderUpsertForm(id) {
  const events = getEvents();
  const editing = events.find(e => String(e.id) === String(id));
  const app = document.querySelector("#admin-app");

  app.innerHTML = `
    <div class="panel">
      <h2>${editing ? "Edit" : "Add"} Event</h2>
      <form id="evt-form">
        <div class="row">
          <input required name="title" placeholder="Title" value="${editing ? editing.title : ""}" />
          <input required name="category" placeholder="Category" value="${editing ? editing.category : ""}" />
        </div>
        <div class="row">
          <input required name="location" placeholder="Location" value="${editing ? editing.location : ""}" />
          <input required type="number" min="1" name="capacity" placeholder="Capacity" value="${editing ? editing.capacity : ""}" />
        </div>
        <div class="row">
          <input required type="date" name="date" value="${editing ? editing.date : ""}" />
          <input required type="time" name="time" value="${editing ? editing.time : ""}" />
        </div>
        <div class="row single">
          <input name="tags" placeholder="Tags (comma separated)" value="${editing ? (editing.tags || []).join(", ") : ""}" />
        </div>
        <div class="row single">
          <textarea required name="description" rows="4" placeholder="Description">${editing ? editing.description : ""}</textarea>
        </div>
        <div class="row">
          <button class="secondary" type="button" id="cancel">Cancel</button>
          <button class="primary" type="submit">Save</button>
        </div>
      </form>
    </div>
  `;

  document.querySelector("#cancel").addEventListener("click", renderDashboard);
  const form = document.querySelector("#evt-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const record = {
      id: editing ? editing.id : `e_${Date.now()}`,
      title: data.title.trim(),
      category: data.category.trim(),
      location: data.location.trim(),
      date: data.date,
      time: data.time,
      capacity: Number(data.capacity),
      description: data.description.trim(),
      tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : []
    };
    upsertEvent(record);
    renderDashboard();
  });
}

function upsertEvent(record) {
  const events = getEvents();
  const idx = events.findIndex(e => String(e.id) === String(record.id));
  if (idx >= 0) {
    events[idx] = record;
  } else {
    events.push(record);
  }
  saveEvents(events);
}

function deleteEvent(id) {
  if (!confirm("Delete this event?")) return;
  const events = getEvents().filter(e => String(e.id) !== String(id));
  saveEvents(events);
  renderDashboard();
}

function deleteRegistration(id) {
  if (!confirm("Delete this registration?")) return;
  const registrations = getRegistrations().filter(r => String(r.id) !== String(id));
  saveRegistrations(registrations);
  renderDashboard();
}

document.addEventListener("DOMContentLoaded", () => {
  if (!authIsLoggedIn()) {
    renderLogin();
  } else {
    renderDashboard();
  }
});


