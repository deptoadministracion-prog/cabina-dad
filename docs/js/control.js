/* Control remoto (maqueta). En la etapa 1 habla con la Proyección dentro del mismo navegador. */
(function () {
  "use strict";
  var C = window.Cabina;

  var cont = document.getElementById("momentos");
  var panel = document.getElementById("panelPres");
  var pagActual = document.getElementById("pagActual");
  var ant = document.getElementById("ant");
  var sig = document.getElementById("sig");
  var aviso = document.getElementById("avisoCerrada");
  var negro = document.getElementById("negro");
  var cerrar = document.getElementById("cerrar");
  var estado = document.getElementById("estado");
  var estadoTxt = document.getElementById("estadoTxt");

  document.getElementById("pagTotal").textContent = String(C.PDF_PAGINAS);
  ant.innerHTML = C.icono("izquierda") + "<span>Anterior</span>";
  sig.innerHTML = "<span>Siguiente</span>" + C.icono("derecha");
  cerrar.innerHTML = C.icono("apagar") + "<span>Cerrar cabina</span>";

  C.MOMENTOS.forEach(function (m) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "momento";
    b.dataset.id = m.id;
    b.innerHTML = '<span class="ico-redondo">' + C.icono(m.icono) + "</span><span>" + m.nombre + "</span>";
    b.addEventListener("click", function () { C.escribir({ momento: m.id, cerrada: false }); });
    cont.appendChild(b);
  });

  ant.addEventListener("click", function () { C.escribir({ pagina: C.leer().pagina - 1 }); });
  sig.addEventListener("click", function () { C.escribir({ pagina: C.leer().pagina + 1 }); });
  negro.addEventListener("click", function () { C.escribir({ negro: !C.leer().negro }); });
  cerrar.addEventListener("click", function () {
    C.confirmarCierre(function () { C.escribir({ cerrada: true, negro: false }); });
  });
  document.getElementById("abrir").addEventListener("click", function () {
    C.escribir({ cerrada: false, momento: "entrada", pagina: 1, negro: false });
  });

  function pintar(e) {
    cont.querySelectorAll(".momento").forEach(function (b) {
      b.setAttribute("aria-pressed", !e.cerrada && b.dataset.id === e.momento ? "true" : "false");
      b.disabled = e.cerrada;
    });
    var pres = !e.cerrada && e.momento === "presentacion";
    panel.hidden = !pres;
    pagActual.textContent = String(e.pagina);
    ant.disabled = e.pagina <= 1;
    sig.disabled = e.pagina >= C.PDF_PAGINAS;
    aviso.hidden = !e.cerrada;
    negro.disabled = e.cerrada;
    negro.setAttribute("aria-pressed", e.negro ? "true" : "false");
    negro.innerHTML = C.icono(e.negro ? "encendida" : "apagada") + "<span>" + (e.negro ? "Quitar pantalla negra" : "Pantalla en negro") + "</span>";
  }
  C.suscribir(pintar);

  /* ¿La Proyección está abierta? Manda un latido cada 2 s. */
  function revisarConexion() {
    var conectada = C.edadLatido() < 6000;
    estado.classList.toggle("on", conectada);
    estadoTxt.textContent = conectada ? "Cabina conectada" : "Cabina sin conexión: abre la Proyección";
  }
  revisarConexion();
  setInterval(revisarConexion, 1000);
})();
