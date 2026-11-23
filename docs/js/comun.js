/* Cabina DAD · maqueta (etapa 1). Todo es de ejemplo: no se conecta a ninguna base ni a ningún sitio.
   Estado compartido entre Control y Proyección dentro del mismo navegador
   (BroadcastChannel + localStorage). Íconos: Lucide (licencia ISC), copiados aquí como trazos. */
(function () {
  "use strict";

  var CLAVE = "cabina_maqueta_estado";
  var LATIDO = "cabina_maqueta_latido";
  var PDF_PAGINAS = 5;

  var MOMENTOS = [
    { id: "entrada", nombre: "Entrada", icono: "puerta" },
    { id: "loop", nombre: "Loop general", icono: "repetir" },
    { id: "qr-descarga", nombre: "QR de descarga", icono: "descarga" },
    { id: "presentacion", nombre: "Presentación", icono: "presentacion" },
    { id: "qr-asistencia", nombre: "QR de asistencia", icono: "qr" }
  ];

  var ICONOS = {
    puerta: '<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/>',
    repetir: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    descarga: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    presentacion: '<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>',
    qr: '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
    izquierda: '<path d="m15 18-6-6 6-6"/>',
    derecha: '<path d="m9 18 6-6-6-6"/>',
    apagada: '<path d="M17 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2"/><path d="M22 15V5a2 2 0 0 0-2-2H9"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="m2 2 20 20"/>',
    encendida: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    apagar: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
    pantalla: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    alerta: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'
  };

  function icono(nombre) {
    return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONOS[nombre] || "") + "</svg>";
  }

  /* ---------- estado ---------- */
  var INICIAL = { momento: "entrada", negro: false, pagina: 1, cerrada: false };
  var memoria = null;   // respaldo si el navegador no deja usar localStorage
  var oyentes = [];
  var canal = ("BroadcastChannel" in window) ? new BroadcastChannel("cabina_maqueta") : null;

  function momentoValido(id) {
    return MOMENTOS.some(function (m) { return m.id === id; });
  }
  function paginaValida(p) {
    p = parseInt(p, 10);
    if (!(p >= 1)) { return 1; }
    return Math.min(p, PDF_PAGINAS);
  }
  function limpiar(e) {
    e = e || {};
    return {
      momento: momentoValido(e.momento) ? e.momento : INICIAL.momento,
      negro: !!e.negro,
      pagina: paginaValida(e.pagina),
      cerrada: !!e.cerrada
    };
  }
  function leer() {
    try {
      var t = localStorage.getItem(CLAVE);
      if (t) { return limpiar(JSON.parse(t)); }
    } catch (x) { /* sin almacenamiento */ }
    return limpiar(memoria);
  }
  function guardar(e) {
    memoria = e;
    try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (x) { /* se usa la memoria */ }
  }
  function avisar(e) {
    oyentes.forEach(function (f) { f(e); });
  }
  function escribir(cambio) {
    var e = limpiar(Object.assign({}, leer(), cambio));
    guardar(e);
    if (canal) { canal.postMessage(e); }
    avisar(e);
  }
  function suscribir(f) {
    oyentes.push(f);
    f(leer());
  }
  if (canal) {
    canal.onmessage = function (ev) {
      var e = limpiar(ev.data);
      memoria = e;
      avisar(e);
    };
  }
  window.addEventListener("storage", function (ev) {
    if (ev.key === CLAVE) { avisar(leer()); }
  });

  /* ---------- latido: Control sabe si la Proyección está abierta ---------- */
  function marcarLatido() {
    try { localStorage.setItem(LATIDO, String(Date.now())); } catch (x) { /* nada */ }
  }
  function edadLatido() {
    try {
      var t = parseInt(localStorage.getItem(LATIDO), 10);
      return t ? Date.now() - t : Infinity;
    } catch (x) { return Infinity; }
  }

  /* ---------- QR de ejemplo (NO es un código real, no se puede escanear) ---------- */
  function qrEjemplo() {
    var n = 25, semilla = 7, m = [], i, j;
    function azar() { semilla = (semilla * 1103515245 + 12345) & 0x7fffffff; return semilla / 0x7fffffff; }
    function buscador(x, y) { return (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9); }
    var celdas = "";
    for (i = 0; i < n; i++) {
      for (j = 0; j < n; j++) {
        if (!buscador(i, j) && azar() > 0.52) { celdas += '<rect x="' + i + '" y="' + j + '" width="1" height="1"/>'; }
      }
    }
    function ojo(x, y) {
      return '<rect x="' + x + '" y="' + y + '" width="7" height="7"/>' +
             '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="5" height="5" fill="#fff"/>' +
             '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3"/>';
    }
    return '<svg viewBox="-2 -2 ' + (n + 4) + " " + (n + 4) + '" role="img" aria-label="QR de ejemplo, no escanear" shape-rendering="crispEdges">' +
           '<rect x="-2" y="-2" width="' + (n + 4) + '" height="' + (n + 4) + '" fill="#fff"/>' +
           '<g fill="#000">' + celdas + ojo(0, 0) + ojo(n - 7, 0) + ojo(0, n - 7) + "</g></svg>";
  }

  /* ---------- confirmación de "Cerrar cabina" (en la maqueta no borra nada real) ---------- */
  function confirmarCierre(alConfirmar) {
    var previo = document.activeElement;
    var velo = document.createElement("div");
    velo.className = "velo";
    velo.innerHTML =
      '<div class="dialogo tarjeta" role="dialog" aria-modal="true" aria-labelledby="cc-titulo">' +
        '<div class="ficha">' + icono("alerta") + "</div>" +
        '<h2 id="cc-titulo">¿Cerrar la cabina?</h2>' +
        "<p>En el sistema real, <b>Cerrar cabina</b>:</p>" +
        "<ul>" +
          "<li>cierra la sesión de Sala en esta computadora;</li>" +
          "<li>borra los archivos del evento guardados en esta computadora;</li>" +
          "<li>reinicia las órdenes entre el celular y la cabina.</li>" +
        "</ul>" +
        "<p>Nunca toca asistencias, constancias ni datos del sistema de eventos.</p>" +
        '<p class="nota"><b>En esta maqueta no se borra nada real.</b> Solo se reinicia el estado de ejemplo.</p>' +
        '<p class="simulado" id="cc-sim" role="status"></p>' +
        '<div class="acciones">' +
          '<button type="button" class="btn sec" id="cc-copia">Descargar copia (simulado)</button>' +
        "</div>" +
        '<div class="acciones">' +
          '<button type="button" class="btn sec" id="cc-no">Cancelar</button>' +
          '<button type="button" class="btn nar" id="cc-si">Sí, cerrar cabina</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(velo);

    function cerrar() {
      document.removeEventListener("keydown", teclas);
      velo.remove();
      if (previo && previo.focus) { previo.focus(); }
    }
    function teclas(ev) {
      if (ev.key === "Escape") { cerrar(); }
      if (ev.key === "Tab") {
        var bs = velo.querySelectorAll("button");
        var primero = bs[0], ultimo = bs[bs.length - 1];
        if (ev.shiftKey && document.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
        else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
      }
    }
    document.addEventListener("keydown", teclas);
    velo.querySelector("#cc-no").addEventListener("click", cerrar);
    velo.querySelector("#cc-copia").addEventListener("click", function () {
      velo.querySelector("#cc-sim").textContent = "Simulado: en el sistema real aquí se descargaría una copia de los archivos.";
    });
    velo.querySelector("#cc-si").addEventListener("click", function () {
      cerrar();
      alConfirmar();
    });
    velo.querySelector("#cc-no").focus();
  }

  function restablecer() {
    escribir(INICIAL);
  }

  window.Cabina = {
    MOMENTOS: MOMENTOS,
    PDF_PAGINAS: PDF_PAGINAS,
    icono: icono,
    leer: leer,
    escribir: escribir,
    suscribir: suscribir,
    marcarLatido: marcarLatido,
    edadLatido: edadLatido,
    qrEjemplo: qrEjemplo,
    confirmarCierre: confirmarCierre,
    restablecer: restablecer
  };
})();
