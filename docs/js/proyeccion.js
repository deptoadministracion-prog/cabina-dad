/* Proyección (maqueta). Muestra el material del momento activo y obedece a Control.
   Atajos en esta computadora: 1 a 5 (momentos), N (pantalla negra), flechas (presentación), F (pantalla completa). */
(function () {
  "use strict";
  var C = window.Cabina;

  var pantallas = document.querySelectorAll(".pantalla");
  var negro = document.getElementById("negro");
  var visor = document.getElementById("visorPdf");
  var barra = document.getElementById("respaldo");
  var filaMomentos = document.getElementById("respaldoMomentos");
  var rAnt = document.getElementById("rAnt");
  var rSig = document.getElementById("rSig");
  var rNegro = document.getElementById("rNegro");
  var rPantalla = document.getElementById("rPantalla");
  var rCerrar = document.getElementById("rCerrar");
  var cuenta = document.getElementById("cuenta");
  var actual = C.leer();
  var pdfMostrado = 0;

  document.querySelectorAll("[data-qr]").forEach(function (el) { el.innerHTML = C.qrEjemplo(); });

  /* Botones de respaldo */
  C.MOMENTOS.forEach(function (m, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn sec chico";
    b.dataset.id = m.id;
    b.innerHTML = C.icono(m.icono) + "<span>" + (i + 1) + ". " + m.nombre + "</span>";
    b.addEventListener("click", function () { C.escribir({ momento: m.id, cerrada: false }); });
    filaMomentos.appendChild(b);
  });
  rAnt.innerHTML = C.icono("izquierda") + "<span>Anterior</span>";
  rSig.innerHTML = "<span>Siguiente</span>" + C.icono("derecha");
  rAnt.addEventListener("click", function () { moverPagina(-1); });
  rSig.addEventListener("click", function () { moverPagina(1); });
  rNegro.addEventListener("click", alternarNegro);
  rPantalla.addEventListener("click", alternarPantallaCompleta);
  rCerrar.innerHTML = C.icono("apagar") + "<span>Cerrar cabina</span>";
  rCerrar.addEventListener("click", function () {
    C.confirmarCierre(function () { C.escribir({ cerrada: true, negro: false }); });
  });

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

  /* PDF de ejemplo con el visor del propio navegador (sin librerías externas) */
  function mostrarPdf(pagina) {
    if (pdfMostrado === pagina) { return; }
    pdfMostrado = pagina;
    var marco = document.createElement("iframe");
    marco.title = "Presentación de ejemplo, página " + pagina;
    marco.src = "../archivos-ejemplo/presentacion-ejemplo.pdf#page=" + pagina + "&toolbar=0&navpanes=0&scrollbar=0&view=Fit";
    visor.innerHTML = "";
    visor.appendChild(marco);
  }

  function pintar(e) {
    actual = e;
    var id = e.cerrada ? "cerrada" : e.momento;
    pantallas.forEach(function (p) { p.hidden = p.dataset.momento !== id; });
    negro.hidden = !e.negro || e.cerrada;

    if (id === "presentacion") { mostrarPdf(e.pagina); }
    else { visor.innerHTML = ""; pdfMostrado = 0; }

    filaMomentos.querySelectorAll("button").forEach(function (b) {
      var on = !e.cerrada && b.dataset.id === e.momento;
      b.classList.toggle("activo", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var pres = id === "presentacion";
    rAnt.hidden = !pres;
    rSig.hidden = !pres;
    rAnt.disabled = e.pagina <= 1;
    rSig.disabled = e.pagina >= C.PDF_PAGINAS;
    rNegro.innerHTML = C.icono(e.negro ? "encendida" : "apagada") + "<span>" + (e.negro ? "Quitar pantalla negra" : "Pantalla en negro (N)") + "</span>";
    rPantalla.innerHTML = C.icono("pantalla") + "<span>" + (document.fullscreenElement ? "Salir de pantalla completa" : "Pantalla completa (F)") + "</span>";
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

  /* Atajos de teclado */
  document.addEventListener("keydown", function (ev) {
    if (ev.ctrlKey || ev.altKey || ev.metaKey || document.querySelector(".velo")) { return; }
    var k = ev.key.toLowerCase();
    if (k >= "1" && k <= String(C.MOMENTOS.length)) { C.escribir({ momento: C.MOMENTOS[Number(k) - 1].id, cerrada: false }); }
    else if (k === "n") { alternarNegro(); }
    else if (k === "f") { alternarPantallaCompleta(); }
    else if (k === "arrowright") { moverPagina(1); }
    else if (k === "arrowleft") { moverPagina(-1); }
  });

  /* En pantalla completa, los botones se esconden tras 3 s sin mover el ratón */
  var temporizador = null;
  function mostrarBarra() {
    barra.classList.remove("oculta");
    clearTimeout(temporizador);
    if (document.fullscreenElement) {
      temporizador = setTimeout(function () { barra.classList.add("oculta"); }, 3000);
    }
  }
  document.addEventListener("mousemove", mostrarBarra);
  document.addEventListener("fullscreenchange", function () { pintar(actual); mostrarBarra(); });
})();
