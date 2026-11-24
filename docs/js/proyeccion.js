/* Proyección (maqueta). Muestra el material del momento activo y obedece a Control.
   Esta pantalla NO tiene botones ni barras: se proyecta ante el público.
   Atajos en esta computadora: 1 a 5 (momentos), N (pantalla negra), flechas (anterior/siguiente en la
   presentación) y F (pantalla completa). Esc sale de pantalla completa (lo hace el navegador). */
(function () {
  "use strict";
  var C = window.Cabina;

  /* Carpetas relativas a esta página (docs/): funcionan igual en localhost y en GitHub Pages */
  var RAIZ = document.currentScript ? new URL("../", document.currentScript.src).href : "../";
  var BASE_PDFJS = RAIZ + "vendor/pdfjs/";
  var RUTA_PDF = RAIZ + "archivos-ejemplo/presentacion-ejemplo.pdf";

  var pantallas = document.querySelectorAll(".pantalla");
  var negro = document.getElementById("negro");
  var visor = document.getElementById("visorPdf");
  var msg = document.getElementById("visorMsg");
  var msgTitulo = document.getElementById("visorMsgTitulo");
  var msgCuerpo = document.getElementById("visorMsgCuerpo");
  var msgDetalle = document.getElementById("visorMsgDetalle");
  var avisoF = document.getElementById("avisoF");
  var cuenta = document.getElementById("cuenta");

  document.querySelectorAll("[data-qr]").forEach(function (el) { el.innerHTML = C.qrEjemplo(); });

  /* =====================================================================================
     Presentación (PDF) con pdf.js, alojado en vendor/pdfjs/ (sin CDN ni direcciones externas).
     Una página a la vez en un <canvas>, escalada para llenar la pantalla (contain).
     - Solo hay UNA función que muestra páginas: irAPagina(n). La usan la sincronía con Control y,
       más adelante, la conexión a distancia (Supabase).
     - Se dibujan la página actual y sus vecinas (anterior y siguiente) en segundo plano. Al cambiar
       de página se cambia de canvas solo cuando el nuevo ya está listo: sin parpadeo ni recarga.
     - Se dibuja a la resolución real de la pantalla (devicePixelRatio), con un tope de memoria.
     - Al salir del momento Presentación o cerrar la cabina se libera todo (canvas, documento y worker).
     ===================================================================================== */
  var MAX_DPR = 3;            // densidad de píxeles máxima
  var MAX_PIXELES = 8.4e6;    // tope por página (≈ 3840×2160): unos 34 MB por canvas, 3 canvas como máximo
  var CANCELADO = { cancelado: true };

  var P = {
    activa: false,             // ¿el momento Presentación está en pantalla?
    sesion: 0,                 // cambia al liberar: descarta resultados de trabajos anteriores
    tarea: null, doc: null, N: 0, abriendo: null,
    cache: new Map(),          // página -> { lienzo, clave }
    enCurso: new Map(),        // página -> { clave, promesa }
    pedida: 1, mostrada: 0, lienzoVisible: null, temporizadorCarga: null
  };

  function mostrarMensaje(titulo, detalle) {
    msgTitulo.textContent = titulo;
    msgDetalle.textContent = detalle || "";
    msgCuerpo.hidden = !detalle;
    msg.hidden = false;
  }
  function ocultarMensaje() { msg.hidden = true; }

  function describirErrorCarga(err) {
    var nombre = err && err.name;
    if (nombre === "MissingPDFException" || (err && (err.missing || err.status === 404))) { return "No se encontró el archivo de la presentación."; }
    if (nombre === "InvalidPDFException") { return "El archivo no es un PDF válido."; }
    if (nombre === "PasswordException") { return "El PDF está protegido con contraseña."; }
    return "No se pudo cargar el archivo o el visor de PDF. Revisa la conexión y que el archivo exista.";
  }
  var AYUDA = " Cambia de momento con Control o con las teclas 1 a 5.";

  function liberarLienzo(lienzo) {
    lienzo.width = 0;          // suelta la memoria del dibujo
    lienzo.height = 0;
    if (lienzo.parentNode) { lienzo.parentNode.removeChild(lienzo); }
  }
  function enCache(lienzo) {
    var esta = false;
    P.cache.forEach(function (ent) { if (ent.lienzo === lienzo) { esta = true; } });
    return esta;
  }

  function abrirPdf() {
    if (P.abriendo) { return P.abriendo; }
    var sesion = P.sesion;
    P.abriendo = import(BASE_PDFJS + "pdf.min.mjs").then(function (lib) {
      if (sesion !== P.sesion) { throw CANCELADO; }
      lib.GlobalWorkerOptions.workerSrc = BASE_PDFJS + "pdf.worker.min.mjs";
      P.tarea = lib.getDocument({
        url: RUTA_PDF,
        cMapUrl: BASE_PDFJS + "cmaps/",
        cMapPacked: true,
        standardFontDataUrl: BASE_PDFJS + "standard_fonts/",
        wasmUrl: BASE_PDFJS + "wasm/",
        iccUrl: BASE_PDFJS + "iccs/",
        isEvalSupported: false,        // un PDF no puede ejecutar código
        enableXfa: false
      });
      return P.tarea.promise;
    }).then(function (doc) {
      if (sesion !== P.sesion) { throw CANCELADO; }
      P.doc = doc;
      P.N = doc.numPages;              // el número de páginas sale del PDF real
      if (P.N !== C.PDF_PAGINAS) {
        console.warn("El PDF tiene " + P.N + " páginas, pero el estado compartido (comun.js, PDF_PAGINAS) limita a " + C.PDF_PAGINAS + ".");
      }
      return doc;
    });
    return P.abriendo;
  }

  function medidas() {
    var w = visor.clientWidth || window.innerWidth;
    var h = visor.clientHeight || window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    return { w: w, h: h, dpr: dpr, clave: w + "x" + h + "@" + dpr };
  }

  /* Dibuja la página p en un canvas propio (fuera de la vista) y lo guarda en la caché */
  function renderizar(p) {
    var m = medidas();
    var hecha = P.cache.get(p);
    if (hecha && hecha.clave === m.clave) { return Promise.resolve(hecha); }
    var curso = P.enCurso.get(p);
    if (curso && curso.clave === m.clave) { return curso.promesa; }

    var sesion = P.sesion;
    var promesa = P.doc.getPage(p).then(function (page) {
      if (sesion !== P.sesion) { throw CANCELADO; }
      var base = page.getViewport({ scale: 1 });
      var escala = Math.min(m.w / base.width, m.h / base.height) * m.dpr;   // contain, a resolución real
      var px = base.width * base.height * escala * escala;
      if (px > MAX_PIXELES) { escala *= Math.sqrt(MAX_PIXELES / px); }
      var vp = page.getViewport({ scale: escala });
      var lienzo = document.createElement("canvas");
      lienzo.className = "pagina";
      lienzo.setAttribute("role", "img");
      lienzo.width = Math.max(1, Math.floor(vp.width));
      lienzo.height = Math.max(1, Math.floor(vp.height));
      return page.render({ canvas: lienzo, viewport: vp }).promise.then(function () {
        page.cleanup();
        if (sesion !== P.sesion) { liberarLienzo(lienzo); throw CANCELADO; }
        var anterior = P.cache.get(p);
        var ent = { lienzo: lienzo, clave: m.clave };
        P.cache.set(p, ent);
        visor.appendChild(lienzo);                      // oculto (sin .on) hasta que se pida mostrarlo
        if (anterior && anterior.lienzo !== P.lienzoVisible) { liberarLienzo(anterior.lienzo); }
        podar();                                        // un dibujo que llega tarde (página ya no cercana) no se queda en memoria
        return ent;
      });
    });
    var registro = { clave: m.clave, promesa: promesa };
    P.enCurso.set(p, registro);
    function terminar() { if (P.enCurso.get(p) === registro) { P.enCurso.delete(p); } }
    promesa.then(terminar, terminar);
    return promesa;
  }

  /* Cambio de página: se intercambian los canvas en el mismo instante (sin hueco ni parpadeo) */
  function mostrarListo(p, ent) {
    var previo = P.lienzoVisible;
    if (previo !== ent.lienzo) {
      ent.lienzo.classList.add("on");
      if (previo) { previo.classList.remove("on"); }
      P.lienzoVisible = ent.lienzo;
      if (previo && !enCache(previo)) { liberarLienzo(previo); }   // copia vieja (otro tamaño de pantalla)
    }
    P.mostrada = p;
    ent.lienzo.setAttribute("aria-label", "Presentación, página " + p + " de " + P.N);
    clearTimeout(P.temporizadorCarga);
    P.temporizadorCarga = null;
    ocultarMensaje();
  }

  /* Conserva solo la página pedida y sus vecinas (máximo 3 canvas); libera el resto.
     El canvas que se está viendo no se toca aquí: se libera al cambiar de página (mostrarListo). */
  function podar() {
    P.cache.forEach(function (ent, p) {
      if (Math.abs(p - P.pedida) > 1) {
        P.cache.delete(p);
        if (ent.lienzo !== P.lienzoVisible) { liberarLienzo(ent.lienzo); }
      }
    });
  }

  /* Dibuja las vecinas (siguiente primero) en segundo plano */
  function precargar(n) {
    podar();
    [n + 1, n - 1].forEach(function (p) {
      if (p >= 1 && p <= P.N) { renderizar(p).catch(function () { /* se reintenta al llegar a esa página */ }); }
    });
  }

  /* ÚNICA función que muestra páginas de la presentación. Pide la página n (se ajusta a 1..N del PDF real).
     Si el momento Presentación no está en pantalla, solo recuerda la página. */
  function irAPagina(n) {
    n = Math.round(Number(n));
    if (!(n >= 1)) { n = 1; }
    if (P.N) { n = Math.min(n, P.N); }
    P.pedida = n;
    if (!P.activa) { return; }

    var sesion = P.sesion;
    if (!P.doc) {
      if (!P.temporizadorCarga && !P.lienzoVisible) {
        P.temporizadorCarga = setTimeout(function () {
          if (!P.lienzoVisible && sesion === P.sesion) { mostrarMensaje("Cargando la presentación…", ""); }
        }, 600);
      }
      abrirPdf().then(function () {
        if (sesion === P.sesion) { irAPagina(P.pedida); }
      }).catch(function (err) {
        if (err === CANCELADO || sesion !== P.sesion) { return; }
        console.error("Presentación: no se pudo cargar el PDF", err);
        P.abriendo = null;                 // la próxima vez se vuelve a intentar
        if (P.tarea) { P.tarea.destroy().catch(function () {}); P.tarea = null; }
        clearTimeout(P.temporizadorCarga);
        P.temporizadorCarga = null;
        mostrarMensaje("No se pudo cargar la presentación", describirErrorCarga(err) + AYUDA);
      });
      return;
    }

    renderizar(n).then(function (ent) {
      if (sesion !== P.sesion || P.pedida !== n) { return; }   // llegó tarde: ya se pidió otra página
      mostrarListo(n, ent);
      precargar(n);
    }).catch(function (err) {
      if (err === CANCELADO || sesion !== P.sesion) { return; }
      console.error("Presentación: no se pudo dibujar la página " + n, err);
      mostrarMensaje("No se pudo dibujar la página " + n, "Prueba con otra página." + AYUDA);
    });
  }

  /* Libera toda la memoria: canvas, documento y worker de pdf.js */
  function liberarPresentacion() {
    P.sesion += 1;                          // los trabajos en curso se descartan solos
    clearTimeout(P.temporizadorCarga);
    P.temporizadorCarga = null;
    visor.querySelectorAll("canvas").forEach(liberarLienzo);
    P.cache.clear();
    P.enCurso.clear();
    P.lienzoVisible = null;
    P.mostrada = 0;
    var tarea = P.tarea;
    P.tarea = null; P.doc = null; P.N = 0; P.abriendo = null;
    if (tarea) { tarea.destroy().catch(function () {}); }
    ocultarMensaje();
  }

  /* Al cambiar el tamaño de la pantalla (p. ej. al entrar en pantalla completa) se vuelve a dibujar nítido.
     La página que ya se ve se mantiene hasta que la nueva esté lista. */
  var temporizadorTamano = null;
  function alCambiarTamano() {
    clearTimeout(temporizadorTamano);
    temporizadorTamano = setTimeout(function () {
      if (P.activa && P.doc) { irAPagina(P.pedida); }
    }, 150);
  }
  window.addEventListener("resize", alCambiarTamano);
  document.addEventListener("fullscreenchange", alCambiarTamano);

  /* Para quien necesite mandar la página desde fuera (la conexión a distancia, más adelante) */
  window.Proyeccion = { irAPagina: irAPagina };

  /* ===================================================================================== */

  function moverPagina(d) {
    var e = C.leer();
    if (e.momento !== "presentacion" || e.cerrada) { return; }
    var tope = P.N || C.PDF_PAGINAS;
    C.escribir({ pagina: Math.max(1, Math.min(e.pagina + d, tope)) });
  }
  function alternarNegro() {
    C.escribir({ negro: !C.leer().negro });
  }
  function alternarPantallaCompleta() {
    if (document.fullscreenElement) { document.exitFullscreen(); }
    else if (document.documentElement.requestFullscreen) { document.documentElement.requestFullscreen(); }
  }

  function pintar(e) {
    var id = e.cerrada ? "cerrada" : e.momento;
    pantallas.forEach(function (p) { p.hidden = p.dataset.momento !== id; });
    negro.hidden = !e.negro || e.cerrada;

    if (id === "presentacion") { P.activa = true; irAPagina(e.pagina); }
    else if (P.activa) { P.activa = false; liberarPresentacion(); }
  }
  C.suscribir(pintar);

  /* Loop de ejemplo: cambia de cuadro cada 5 segundos */
  var cuadros = document.querySelectorAll("#cuadros .cuadro");
  var iCuadro = 0;
  setInterval(function () {
    cuadros[iCuadro].classList.remove("on");
    iCuadro = (iCuadro + 1) % cuadros.length;
    cuadros[iCuadro].classList.add("on");
  }, 5000);

  /* Cuenta de ejemplo: imita la renovación cada 25 s del código de Sala (no es el código real) */
  setInterval(function () {
    cuenta.textContent = String(25 - (Math.floor(Date.now() / 1000) % 25));
  }, 500);

  /* Latido: así Control sabe que esta pantalla está abierta */
  C.marcarLatido();
  setInterval(C.marcarLatido, 2000);

  /* Atajos de teclado (la única forma de manejar esta pantalla desde esta computadora) */
  document.addEventListener("keydown", function (ev) {
    if (ev.ctrlKey || ev.altKey || ev.metaKey) { return; }
    var k = ev.key.toLowerCase();
    var esMomento = /^[1-9]$/.test(k) && Number(k) <= C.MOMENTOS.length;
    if (esMomento) { if (!ev.repeat) { C.escribir({ momento: C.MOMENTOS[Number(k) - 1].id, cerrada: false }); } }
    else if (k === "n") { if (!ev.repeat) { alternarNegro(); } }
    else if (k === "f") { if (!ev.repeat) { alternarPantallaCompleta(); } }
    else if (k === "arrowright") { moverPagina(1); }
    else if (k === "arrowleft") { moverPagina(-1); }
  });

  /* ---------- Pantalla completa ----------
     Fuera de pantalla completa (preparación): se ve el aviso «Pulsa F para pantalla completa».
     En pantalla completa: el aviso queda oculto (atributo hidden + regla de CSS) y no hay ningún
     código que lo muestre con el ratón. El cursor se esconde tras 3 s sin moverlo y reaparece al moverlo. */
  var consulta = window.matchMedia ? window.matchMedia("(display-mode: fullscreen)") : null;   // también cubre F11
  var temporizadorCursor = null;

  function enPantallaCompleta() {
    return !!document.fullscreenElement || !!(consulta && consulta.matches);
  }
  function mostrarCursor() {
    document.body.classList.remove("sin-cursor");
    clearTimeout(temporizadorCursor);
    if (enPantallaCompleta()) {
      temporizadorCursor = setTimeout(function () { document.body.classList.add("sin-cursor"); }, 3000);
    }
  }
  function actualizarModo() {
    var completa = enPantallaCompleta();
    document.body.classList.toggle("pantalla-completa", completa);
    avisoF.hidden = completa;
    mostrarCursor();
  }
  document.addEventListener("mousemove", mostrarCursor);
  document.addEventListener("fullscreenchange", actualizarModo);
  if (consulta) {
    if (consulta.addEventListener) { consulta.addEventListener("change", actualizarModo); }
    else if (consulta.addListener) { consulta.addListener(actualizarModo); }
  }
  actualizarModo();
})();
