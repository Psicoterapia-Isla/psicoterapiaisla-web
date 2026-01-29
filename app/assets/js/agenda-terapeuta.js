const STORAGE_KEY = "agenda-terapeuta";

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

export function saveAgenda() {
  const dateKey = getTodayKey();

  const plan = {};
  document.querySelectorAll("[data-hour]").forEach(el => {
    plan[el.dataset.hour] = el.value || "";
  });

  const agenda = {
    date: dateKey,
    plan,
    reto: document.querySelector("#reto-diario")?.value || "",
    notas: {
      contactos: document.querySelector("#notas-contactos")?.value || "",
      tiempo_fuera: document.querySelector("#tiempo-fuera")?.value || ""
    },
    updatedAt: new Date().toISOString()
  };

  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  all[dateKey] = agenda;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  alert("Agenda guardada");
}
export function loadAgenda() {
  const dateKey = getTodayKey();
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const agenda = all[dateKey];
  if (!agenda) return;

  Object.entries(agenda.plan).forEach(([hour, value]) => {
    const field = document.querySelector(`[data-hour="${hour}"]`);
    if (field) field.value = value;
  });

  document.querySelector("#reto-diario").value = agenda.reto || "";
  document.querySelector("#notas-contactos").value = agenda.notas?.contactos || "";
  document.querySelector("#tiempo-fuera").value = agenda.notas?.tiempo_fuera || "";
}
