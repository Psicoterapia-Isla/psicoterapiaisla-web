<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Panel de Control Clínico</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="assets/css/app.css">
</head>

<body class="app-layout">

<header class="app-menu"></header>

<main class="app-content">

  <div class="card">
    <h1>Panel de Control Clínico</h1>
    <p class="page-subtitle">Resumen financiero y operativo</p>

    <div class="stats-grid">

      <div class="stat-box">
        <h3>Facturación total</h3>
        <p id="totalRevenue">—</p>
      </div>

      <div class="stat-box">
        <h3>Ingresos cobrados</h3>
        <p id="paidRevenue">—</p>
      </div>

      <div class="stat-box">
        <h3>Ingresos pendientes</h3>
        <p id="pendingRevenue">—</p>
      </div>

      <div class="stat-box">
        <h3>No Shows</h3>
        <p id="noShows">—</p>
      </div>

      <div class="stat-box">
        <h3>Cancelaciones</h3>
        <p id="cancellations">—</p>
      </div>

      <div class="stat-box">
        <h3>Total citas registradas</h3>
        <p id="occupancy">—</p>
      </div>

    </div>
  </div>

</main>

<script type="module" src="./assets/js/dashboard-clinic.js"></script>

</body>
</html>
