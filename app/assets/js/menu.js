/* =====================================================
   MENÚ SUPERIOR
===================================================== */

.app-menu {
  background: linear-gradient(135deg, #4e7f73, #6b5a7a);
  padding: 16px 0;
}

.app-menu-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;

  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* botones base */
.menu-group-toggle {
  background: rgba(255,255,255,.18);
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  color: #fff;
  cursor: pointer;
  font-size: 0.95rem;
}

/* =====================================================
   DESPLEGABLES — DESKTOP
===================================================== */

.menu-group {
  position: relative;
}

.menu-group-content {
  display: none;
  position: absolute;
  top: 120%;
  left: 50%;
  transform: translateX(-50%);

  background: #ffffff;
  border-radius: 16px;
  padding: 12px 16px;
  min-width: 220px;

  box-shadow: 0 12px 30px rgba(0,0,0,.15);
  z-index: 20;
}

.menu-group.open .menu-group-content {
  display: block;
}

.menu-group-content a {
  display: block;
  color: #355f53;
  text-decoration: none;
  padding: 6px 0;
  font-size: 0.95rem;
}

/* =====================================================
   MÓVIL
===================================================== */

@media (max-width: 768px) {

  .app-menu-inner {
    flex-direction: column;
    align-items: stretch;
  }

  .menu-group {
    width: 100%;
  }

  .menu-group-toggle {
    width: 100%;
    text-align: center;
  }

  .menu-group-content {
    position: static;
    transform: none;
    box-shadow: none;
    background: transparent;
    padding: 8px 0 0 16px;
  }

  .menu-group.open .menu-group-content {
    display: block;
  }

  .menu-group-content a {
    color: #fff;
    padding: 6px 0;
  }
}
