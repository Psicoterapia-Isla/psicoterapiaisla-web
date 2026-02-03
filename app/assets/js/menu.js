/* =====================================================
   MENÚ SUPERIOR — CENTRADO Y EN FILA (FIX DEFINITIVO)
===================================================== */

.app-menu {
  background: linear-gradient(135deg, #4e7f73, #6b5a7a);
}

.app-menu-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 24px;

  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

/* botones principales */
.menu-group-toggle {
  background: rgba(255,255,255,0.18);
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  color: #fff;
  cursor: pointer;
  font-size: 0.95rem;
}

/* grupos desplegables */
.menu-group {
  position: relative;
}

/* desplegable */
.menu-group-content {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);

  background: #ffffff;
  border-radius: 16px;
  padding: 12px 14px;
  min-width: 220px;

  box-shadow: 0 12px 30px rgba(0,0,0,0.18);
  display: none;
  z-index: 50;
}

.menu-group.open .menu-group-content {
  display: block;
}

/* enlaces */
.menu-group-content a {
  display: block;
  color: #355f53;
  text-decoration: none;
  padding: 6px 4px;
  font-size: 0.95rem;
}

.menu-group-content a:hover {
  opacity: 0.8;
}

/* =====================================================
   MÓVIL
===================================================== */

@media (max-width: 768px) {
  .app-menu-inner {
    justify-content: flex-start;
  }

  .menu-group-content {
    position: static;
    transform: none;
    box-shadow: none;
    background: transparent;
    padding: 8px 0 0;
  }

  .menu-group-content a {
    color: #fff;
  }
}
