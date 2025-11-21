const API_URL = "/api/uci/registros";

const FIELDS = {
    fechaIngreso: "fecha_de_ingreso",
    fechaEgreso: "fecha_de_egreso",
    edad: "edad",
    sexo: "sexo",
    condicion: "condicion_al_egreso",
    diagnostico: "diagnostico",
    nombre: "nombre_y_apellido"
};

let charts = {
    sexo: null,
    condicion: null
};

document.addEventListener("DOMContentLoaded", function () {
    inicializarFormulario();
    cargarDashboard();
});

async function cargarDashboard() {
    actualizarEstadoConexion("Cargando datos...", "success");
    try {
        const datos = await obtenerDatos();
        actualizarResumen(datos);
        actualizarGraficos(datos);
        actualizarTabla(datos);
        actualizarEstadoConexion("Conectado a BASE_UCI", "success");
        actualizarFooter();
    } catch (error) {
        actualizarEstadoConexion("Error al conectar", "danger");
    }
}

async function obtenerDatos() {
    const respuesta = await fetch(API_URL);
    const json = await respuesta.json();
    if (!json || json.status !== "ok") {
        throw new Error(json && json.detail ? json.detail : "Error desconocido");
    }
    const datos = Array.isArray(json.data) ? json.data : [];
    return datos;
}

function actualizarResumen(datos) {
    const total = datos.length;
    const conteoSexo = {};
    const edades = [];

    datos.forEach(function (fila) {
        const sexoRaw = (fila[FIELDS.sexo] || "").toString().trim();
        const sexoNorm = normalizarSexo(sexoRaw);
        if (sexoNorm) {
            conteoSexo[sexoNorm] = (conteoSexo[sexoNorm] || 0) + 1;
        }
        const edadNum = Number(fila[FIELDS.edad]);
        if (!Number.isNaN(edadNum) && edadNum > 0) {
            edades.push(edadNum);
        }
    });

    const totalFem = conteoSexo["F"] || 0;
    const totalMas = conteoSexo["M"] || 0;

    const edadPromedio = edades.length > 0
        ? (edades.reduce(function (a, b) { return a + b; }, 0) / edades.length)
        : 0;

    asignarTexto("stat-total", total);
    asignarTexto("stat-femenino", totalFem);
    asignarTexto("stat-masculino", totalMas);
    asignarTexto("stat-edad-promedio", edades.length > 0 ? edadPromedio.toFixed(1) : "–");

    const badge = document.getElementById("badge-registros");
    if (badge) {
        badge.textContent = total + " registros";
    }
}

function actualizarGraficos(datos) {
    const conteoSexo = {};
    const conteoCondicion = {};

    datos.forEach(function (fila) {
        const sexoRaw = (fila[FIELDS.sexo] || "").toString().trim();
        const sexoNorm = normalizarSexo(sexoRaw);
        if (sexoNorm) {
            conteoSexo[sexoNorm] = (conteoSexo[sexoNorm] || 0) + 1;
        }

        const condRaw = (fila[FIELDS.condicion] || "").toString().trim();
        if (condRaw) {
            conteoCondicion[condRaw] = (conteoCondicion[condRaw] || 0) + 1;
        }
    });

    const etiquetasSexo = Object.keys(conteoSexo).map(function (k) {
        if (k === "F") {
            return "Femenino";
        }
        if (k === "M") {
            return "Masculino";
        }
        return k;
    });
    const valoresSexo = etiquetasSexo.map(function (etiqueta) {
        if (etiqueta === "Femenino") {
            return conteoSexo["F"];
        }
        if (etiqueta === "Masculino") {
            return conteoSexo["M"];
        }
        return conteoSexo[etiqueta] || 0;
    });

    const etiquetasCond = Object.keys(conteoCondicion);
    const valoresCond = etiquetasCond.map(function (k) { return conteoCondicion[k]; });

    const ctxSexo = document.getElementById("chartSexo");
    if (ctxSexo) {
        const contextSexo = ctxSexo.getContext("2d");
        if (charts.sexo) {
            charts.sexo.destroy();
        }
        charts.sexo = new Chart(contextSexo, {
            type: "doughnut",
            data: {
                labels: etiquetasSexo,
                datasets: [{
                    data: valoresSexo
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: "#e5e7eb"
                        }
                    }
                }
            }
        });
    }

    const ctxCond = document.getElementById("chartCondicion");
    if (ctxCond) {
        const contextCond = ctxCond.getContext("2d");
        if (charts.condicion) {
            charts.condicion.destroy();
        }
        charts.condicion = new Chart(contextCond, {
            type: "bar",
            data: {
                labels: etiquetasCond,
                datasets: [{
                    data: valoresCond
                }]
            },
            options: {
                responsive: true,
                indexAxis: "y",
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: { color: "#e5e7eb" },
                        grid: { color: "rgba(148, 163, 184, 0.3)" }
                    },
                    y: {
                        ticks: { color: "#e5e7eb" },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

function actualizarTabla(datos) {
    var tbody = document.querySelector("#tabla-registros tbody");
    if (!tbody) {
        return;
    }
    tbody.innerHTML = "";

    var ultimos = datos.slice(-50).reverse();
    ultimos.forEach(function (fila) {
        var tr = document.createElement("tr");

        agregarCelda(tr, fila[FIELDS.fechaIngreso]);
        agregarCelda(tr, fila[FIELDS.fechaEgreso]);
        agregarCelda(tr, fila[FIELDS.edad]);
        agregarCelda(tr, fila[FIELDS.sexo]);
        agregarCelda(tr, fila[FIELDS.condicion]);
        agregarCelda(tr, fila[FIELDS.diagnostico]);
        agregarCelda(tr, fila[FIELDS.nombre]);

        tbody.appendChild(tr);
    });
}

function inicializarFormulario() {
    var form = document.getElementById("form-registro");
    if (!form) {
        return;
    }

    form.addEventListener("submit", function (evento) {
        evento.preventDefault();

        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            return;
        }

        guardarRegistro(form);
    });
}

async function guardarRegistro(form) {
    var boton = document.getElementById("btn-submit");
    var textoOriginal = boton ? boton.textContent : "";
    if (boton) {
        boton.disabled = true;
        boton.textContent = "Guardando...";
    }

    var payload = {
        fecha_de_ingreso: form.fecha_de_ingreso.value,
        fecha_de_egreso: form.fecha_de_egreso.value,
        edad: form.edad.value,
        sexo: form.sexo.value,
        condicion_al_egreso: form.condicion_al_egreso.value,
        diagnostico: form.diagnostico.value,
        nombre_y_apellido: form.nombre_y_apellido.value
    };

    try {
        var respuesta = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        var json = await respuesta.json();
        if (!json || json.status !== "ok") {
            var mensaje = json && json.detail ? json.detail : "Error al guardar";
            alert(mensaje);
        } else {
            form.reset();
            form.classList.remove("was-validated");
            await cargarDashboard();
        }
    } catch (error) {
        alert("No se pudo guardar el registro");
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = textoOriginal;
        }
    }
}

function normalizarSexo(valor) {
    if (!valor) {
        return "";
    }
    var v = valor.toString().trim().toUpperCase();
    if (v === "F" || v.startsWith("FEM")) {
        return "F";
    }
    if (v === "M" || v.startsWith("MAS")) {
        return "M";
    }
    return v;
}

function asignarTexto(id, texto) {
    var el = document.getElementById(id);
    if (el) {
        el.textContent = texto;
    }
}

function agregarCelda(tr, contenido) {
    var td = document.createElement("td");
    td.textContent = contenido == null ? "" : contenido;
    tr.appendChild(td);
}

function actualizarEstadoConexion(texto, tipo) {
    var badge = document.getElementById("badge-estado");
    if (!badge) {
        return;
    }
    badge.textContent = texto;
    badge.classList.remove("bg-success-subtle", "text-success-emphasis", "bg-danger-subtle", "text-danger-emphasis");
    if (tipo === "success") {
        badge.classList.add("bg-success-subtle", "text-success-emphasis");
    }
    if (tipo === "danger") {
        badge.classList.add("bg-danger-subtle", "text-danger-emphasis");
    }
}

function actualizarFooter() {
    var el = document.getElementById("footer-update");
    if (!el) {
        return;
    }
    var ahora = new Date();
    var partes = [
        ahora.getFullYear(),
        String(ahora.getMonth() + 1).padStart(2, "0"),
        String(ahora.getDate()).padStart(2, "0"),
        String(ahora.getHours()).padStart(2, "0"),
        String(ahora.getMinutes()).padStart(2, "0")
    ];
    el.textContent = "Última actualización: " + partes[0] + "-" + partes[1] + "-" + partes[2] + " " + partes[3] + ":" + partes[4];
}
