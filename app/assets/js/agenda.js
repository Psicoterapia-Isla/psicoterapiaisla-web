<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Agenda | Psicoterapia Isla</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="stylesheet" href="assets/css/app.css">

<style>
.wrapper { max-width:900px; margin:0 auto; padding:1.5rem; }
.header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
.nav { display:flex; gap:.5rem; }

.day {
  font-size:1.1rem;
  font-weight:600;
}

.slot {
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:.75rem;
  border-radius:12px;
  margin-bottom:.5rem;
}

.slot.free { background:#e5e7eb; cursor:pointer; }
.slot.busy { background:#e6f4d7; cursor:pointer; }

.time { width:60px; font-weight:600; }

.modal {
  display:none;
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.4);
  z-index:999;
}

.modal-card {
  background:#fff;
  max-width:420px;
  margin:10vh auto;
  padding:1rem;
  border-radius:16px;
}

.field { margin-bottom:.5rem; }
.field input, .field select {
  width:100%;
  padding:.4rem;
}

.actions {
  display:flex;
  justify-content:space-between;
  margin-top:1rem;
}
</style>
</head>

<body class="app-body">
<header class="app-menu"></header>

<main class="wrapper">

  <div class="header">
    <div class="day" id="dayLabel"></div>
    <div class="nav">
      <button id="prevDay" class="btn-secondary">←</button>
      <button id="today" class="btn-secondary">Hoy</button>
      <button id="nextDay" class="btn-secondary">→</button>
    </div>
  </div>

  <div id="agenda"></div>
</main>

<!-- MODAL -->
<div id="modal" class="modal">
  <div class="modal-card">

    <div class="field">
      <input id="pSearch" placeholder="Teléfono / nombre / apellidos">
    </div>

    <div class="field">
      <input id="pName" placeholder="Nombre completo">
    </div>

    <div class="field">
      <select id="modality">
        <option value="">Modalidad</option>
        <option value="viladecans">Viladecans</option>
        <option value="badalona">Badalona</option>
        <option value="online">Online</option>
      </select>
    </div>

    <div class="field">
      <label>
        <input type="checkbox" id="completed">
        Sesión realizada
      </label>
    </div>

    <div class="actions">
      <button id="whatsapp" class="btn-secondary">WhatsApp</button>
      <button id="save" class="btn-primary">Guardar</button>
      <button onclick="closeModal()">Cerrar</button>
    </div>

  </div>
</div>

<script type="module" src="assets/js/agenda.js"></script>
</body>
</html>
