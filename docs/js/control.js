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
  /* «Cerrar cabina» solo existe aquí (nunca en la pantalla proyectada) y pide dos confirmaciones:
     1) el aviso con lo que hace el cierre y la copia (simulada); 2) una última confirmación. */
  function ultimaConfirmacion(alConfirmar) {
    var previo = document.activeElement;
    var velo = document.createElement("div");
    velo.className = "velo";
    velo.innerHTML =
      '<div class="dialogo" role="dialog" aria-modal="true" aria-labelledby="uc-titulo">' +
        '<div class="ficha">' + C.icono("alerta") + "</div>" +
        '<h2 id="uc-titulo">Última confirmación</h2>' +
        "<p>La pantalla proyectada mostrará «Cabina cerrada» y se reiniciará el estado. En esta maqueta no se borra nada real.</p>" +
        '<div class="acciones">' +
          '<button type="button" class="btn sec" id="uc-no">No, volver</button>' +
          '<button type="button" class="btn nar" id="uc-si">Cerrar cabina ahora</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(velo);

    function salir() {
      document.removeEventListener("keydown", teclas);
      velo.remove();
      if (previo && previo.focus) { previo.focus(); }
    }
    function teclas(ev) {
      if (ev.key === "Escape") { salir(); }
      if (ev.key === "Tab") {
        var bs = velo.querySelectorAll("button");
        var primero = bs[0], ultimo = bs[bs.length - 1];
        if (ev.shiftKey && document.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
        else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
      }
    }
    document.addEventListener("keydown", teclas);
    velo.querySelector("#uc-no").addEventListener("click", salir);
    velo.querySelector("#uc-si").addEventListener("click", function () { salir(); alConfirmar(); });
    velo.querySelector("#uc-no").focus();   // el foco empieza en la opción segura
  }
  cerrar.addEventListener("click", function () {
    C.confirmarCierre(function () {
      ultimaConfirmacion(function () { C.escribir({ cerrada: true, negro: false }); });
    });
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
