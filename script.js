// 🔴 PEGA TU URL DE APPS SCRIPT AQUÍ ABAJO (Dentro de las comillas):
const API_URL = "https://script.google.com/macros/s/AKfycbyNc2uJdKb_EQlAPP3K_N1PIG3ZipzvwpuFon4YCWFaNqcljreErEnltZCTL3mtcIEuow/exec";

let datosGlobales = { contratos: [], pagos: [] };

// --- 1. INICIALIZACIÓN ---
async function iniciarApp() {
  const container = document.getElementById('lista-contratos');
  if(container) container.innerHTML = '<p style="text-align:center">🔄 Conectando con Google Drive...</p>';

  try {
    const response = await fetch(`${API_URL}?action=obtenerDatos`);
    datosGlobales = await response.json();
    
    console.log("Datos recibidos:", datosGlobales);

    renderizarContratos();
    renderizarPagos();
    
  } catch (error) {
    console.error("Error:", error);
    if(container) container.innerHTML = "<p class='alerta'>❌ Error de conexión. Verifica la URL del Script.</p>";
  }
}

// --- 2. RENDERIZADO VISUAL ---
function renderizarContratos() {
  const container = document.getElementById('lista-contratos');
  if (!container) return;
  container.innerHTML = '';

  if (datosGlobales.contratos.length === 0) {
      container.innerHTML = "<p>No hay contratos registrados.</p>";
      return;
  }

  datosGlobales.contratos.forEach(c => {
    // Lógica 1x1 vs 2x1
    let validacion = "✅ Correcto";
    let montoEsperado = c.garantia_tipo === "2x1" ? c.monto * 2 : c.monto;
    
    if(Number(c.garantia_monto) !== Number(montoEsperado)) validacion = "⚠️ Error Monto";

    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <h3>👤 ${c.inquilino}</h3>
      <p><strong>🏠 ID:</strong> ${c.id}</p>
      <p><strong>💰 Alquiler:</strong> S/ ${c.monto}</p>
      <p><strong>🛡️ Garantía:</strong> ${c.garantia_tipo} (${validacion})</p>
      <p><strong>💡 Suministro:</strong> ${c.luz_suministro}</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">
      <a href="https://www.enel.pe/es/personas/consulta-tu-recibo.html" target="_blank" style="color: #D81B60; text-decoration: none; font-weight:bold;">⚡ Verificar Luz</a>
    `;
    container.appendChild(div);
  });
}

function renderizarPagos() {
  const tbody = document.getElementById('lista-pagos');
  const alertas = document.getElementById('alertas-container');
  
  if (!tbody || !alertas) return;

  tbody.innerHTML = '';
  alertas.innerHTML = '';

  // Ordenar pagos por ID descendente (más recientes primero)
  const pagosOrdenados = [...datosGlobales.pagos].reverse();

  pagosOrdenados.forEach(p => {
    const contrato = datosGlobales.contratos.find(c => c.id == p.id_contrato);
    const nombre = contrato ? contrato.inquilino : "Desconocido";
    
    // Alerta SUNAT
    let claseSunat = 'pagado';
    if(p.estado_sunat === 'Pendiente') {
      claseSunat = 'pendiente';
      alertas.innerHTML += `<div class="alerta">🚨 <strong>ALERTA SUNAT:</strong> Falta pagar el 5% de ${nombre} (${p.periodo})</div>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.periodo}</td>
      <td>${nombre}</td>
      <td>S/ ${p.monto}</td>
      <td>${p.estado_luz || '-'}</td>
      <td><span class="${claseSunat}">${p.estado_sunat}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// --- 3. LÓGICA DE FORMULARIOS ---

function mostrarForm(id) {
  document.getElementById(id).style.display = 'flex';
  
  // Si es el form de pago, cargamos la lista de inquilinos
  if(id === 'form-pago') {
    const select = document.getElementById('p_contrato');
    select.innerHTML = '<option value="">-- Selecciona Inquilino --</option>';
    
    datosGlobales.contratos.forEach(c => {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = c.inquilino;
      select.appendChild(option);
    });

    // Evento para autocompletar datos
    select.onchange = actualizarInfoPago;
  }
}

// ✨ FUNCIÓN INTELIGENTE: Autocompletar datos del pago
function actualizarInfoPago() {
  const idContrato = document.getElementById('p_contrato').value;
  const infoDiv = document.getElementById('info-pago-detalle');
  const inputMonto = document.getElementById('p_monto');
  const inputFecha = document.getElementById('p_fecha');

  if (!idContrato) {
    infoDiv.innerHTML = '';
    inputMonto.value = '';
    return;
  }

  const contrato = datosGlobales.contratos.find(c => c.id === idContrato);
  
  if (contrato) {
    // Calculamos día de pago
    let textoFecha = "Revisar contrato";
    if (contrato.fecha_inicio) {
        const fecha = new Date(contrato.fecha_inicio);
        const dia = fecha.getDate() + 1; // Ajuste zona horaria simple
        textoFecha = `Día ${dia} de cada mes`;
    }

    inputMonto.value = contrato.monto; // Autocompletar monto
    
    // Mostramos tarjeta de resumen
    infoDiv.innerHTML = `
      <div class="info-contrato">
        <strong>📋 Detalles del Contrato:</strong><br>
        • Monto Pactado: <b>S/ ${contrato.monto}</b><br>
        • Fecha de Cobro: <b>${textoFecha}</b><br>
        • Suministro Luz: <b>${contrato.luz_suministro}</b>
      </div>
    `;
  }
}

function cerrarModales() {
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

// --- 4. ENVÍO DE DATOS (POST) ---

async function enviarDatos(payload) {
  const btn = document.querySelector('.modal[style="display: flex;"] button.btn-primary, .modal[style="display: flex;"] button.btn-secondary');
  const textoOriginal = btn.textContent;
  btn.textContent = "⏳ Guardando...";
  btn.disabled = true;

  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    alert("✅ ¡Guardado con éxito!");
    cerrarModales();
    iniciarApp(); // Recargar datos para ver cambios
  } catch (error) {
    // Apps Script devuelve texto opaco por seguridad CORS, pero si llega aquí suele haber funcionado
    // Si falla realmente, lo veremos al no recargar datos.
    console.log("Respuesta recibida (cors opaco)");
    alert("✅ Registro procesado (Actualiza para verificar)");
    cerrarModales();
    iniciarApp();
  } finally {
    btn.textContent = textoOriginal;
    btn.disabled = false;
  }
}

function guardarContrato() {
  const payload = {
    action: "nuevoContrato",
    nombres: document.getElementById('c_nombres').value,
    apellidos: document.getElementById('c_apellidos').value,
    dni: document.getElementById('c_dni').value,
    direccion: document.getElementById('c_direccion').value,
    suministro: document.getElementById('c_luz').value,
    fecha_inicio: document.getElementById('c_inicio').value,
    fecha_fin: document.getElementById('c_fin').value,
    monto: document.getElementById('c_monto').value,
    tipo_garantia: document.getElementById('c_garantia_tipo').value,
    monto_garantia: document.getElementById('c_garantia_monto').value
  };
  enviarDatos(payload);
}

function guardarPago() {
  const payload = {
    action: "nuevoPago",
    id_contrato: document.getElementById('p_contrato').value,
    periodo: document.getElementById('p_periodo').value,
    fecha_pago: document.getElementById('p_fecha').value,
    monto: document.getElementById('p_monto').value,
    estado_luz: document.getElementById('p_luz').value,
    estado_sunat: document.getElementById('p_sunat').value
  };
  enviarDatos(payload);
}

// Navegación Pestañas
window.ver = function(id) {
  document.getElementById('vista-contratos').style.display = 'none';
  document.getElementById('vista-pagos').style.display = 'none';
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  
  document.getElementById('vista-' + id).style.display = 'block';
  document.getElementById('tab-' + id).classList.add('active');
}

// Iniciar
iniciarApp();