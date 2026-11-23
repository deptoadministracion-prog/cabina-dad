/* Proyección (maqueta). Muestra el material del momento activo y obedece a Control.
   Esta pantalla NO tiene botones ni barras: se proyecta ante el público.
   Atajos en esta computadora: 1 a 5 (momentos), N (pantalla negra), flechas (anterior/siguiente en la
   presentación) y F (pantalla completa). Esc sale de pantalla completa (lo hace el navegador). */
(function () {
  "use strict";
  var C = window.Cabina;

  var pantallas = document.querySelectorAll(".pantalla");
  var negro = document.getElementById("negro");
  var visor = document.getElementById("visorPdf");
  var avisoF = document.getElementById("avisoF");
  var cuenta = document.getElementById("cuenta");
  var pdfMostrado = 0;

  document.querySelectorAll("[data-qr]").forEach(function (el) { el.innerHTML = C.qrEjemplo(); });

  function moverPagina(d) {
    var e = C.leer();
    if (e.momento !== "presentacion" || e.cerrada) { return; }
    C.escribir({ pagina: e.pagina + d });
  }
  function alternarNegro() {
    C.escribir({ negro: !C.leer().negro });
  }
  function alternarPantallaCompleta() {
    if (document.fullscreenElement) { document.exitFullscreen(); }
    else if (document.documentElement.requestFullscreen) { document.documentElement.requestFullscreen(); }
  }

  /* PDF de ejemplo con el visor del propio navegador (sin librerías externas).
     El visor no recibe el ratón (ver proyeccion.css): así el cursor y los atajos siempre son de esta página. */
  function mostrarPdf(pagina) {
    if (pdfMostrado === pagina) { return; }
    pdfMostrado = pagina;
    var marco = document.createElement("iframe");
    marco.title = "Presentación de ejemplo, página " + pagina;
    marco.tabIndex = -1;
    marco.addEventListener("load", function () { window.focus(); });   // que las flechas sigan llegando a esta página
    marco.src = "../archivos-ejemplo/presentacion-ejemplo.pdf#page=" + pagina + "&toolbar=0&navpanes=0&scrollbar=0&view=Fit";
    visor.innerHTML = "";
    visor.appendChild(marco);
  }

  function pintar(e) {
    var id = e.cerrada ? "cerrada" : e.momento;
    pantallas.forEach(function (p) { p.hidden = p.dataset.momento !== id; });
    negro.hidden = !e.negro || e.cerrada;

    if (id === "presentacion") { mostrarPdf(e.pagina); }
    else { visor.innerHTML = ""; pdfMostrado = 0; }
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
