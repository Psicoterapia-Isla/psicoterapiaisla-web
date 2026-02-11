<div class="card">

  <label>Paciente</label>
  <input type="text" id="patientFilter" placeholder="Nombre del paciente">

  <label>Tipo</label>
  <select id="typeFilter">
    <option value="">Todos</option>
    <option value="private">Privado</option>
    <option value="mutual">Mutua</option>
  </select>

  <div id="mutualWrapper" style="display:none;">
    <label>Mutua</label>
    <select id="mutualFilter">
      <option value="">Todas</option>
    </select>
  </div>

  <label>Mes</label>
  <input type="month" id="monthFilter">

  <button id="applyFilters" class="btn-primary">
    Filtrar
  </button>

</div>

<div id="summary" class="card"></div>
<div id="list"></div>
