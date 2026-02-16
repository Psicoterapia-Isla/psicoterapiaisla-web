import { requireAuth } from "./auth.js";
import { loadMenu } from "./menu.js";
import { getFunctions, httpsCallable } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

/* ================= INIT ================= */

await requireAuth();
await loadMenu();

/* ================= FUNCTIONS ================= */

const functions = getFunctions(undefined, "us-central1");
const getClinicStats = httpsCallable(functions, "getClinicStats");

/* ================= DOM ================= */

const revenueEl = document.getElementById("totalRevenue");
const paidEl = document.getElementById("paidRevenue");
const pendingEl = document.getElementById("pendingRevenue");
const noShowEl = document.getElementById("noShows");
const cancelEl = document.getElementById("cancellations");
const occupancyEl = document.getElementById("occupancy");

/* ================= LOAD DATA ================= */

async function loadStats(){

  try {

    const result = await getClinicStats();
    const data = result.data;

    revenueEl.textContent = formatMoney(data.totalRevenue);
    paidEl.textContent = formatMoney(data.paidRevenue);
    pendingEl.textContent = formatMoney(data.pendingRevenue);
    noShowEl.textContent = data.noShows;
    cancelEl.textContent = data.cancellations;
    occupancyEl.textContent = data.occupancy;

  } catch (error) {

    console.error("Error cargando métricas:", error);
    alert("No se han podido cargar las estadísticas.");

  }
}

/* ================= HELPERS ================= */

function formatMoney(value){
  return new Intl.NumberFormat("es-ES",{
    style:"currency",
    currency:"EUR"
  }).format(value || 0);
}

/* ================= START ================= */

loadStats();
