// TU URL DE GOOGLE SHEETS YA ESTÁ CONFIGURADA AQUÍ:
const API_URL = "https://script.google.com/macros/s/AKfycbx1jcYzGuYKOKaMlWsco4pZ4CQf-1eYFkCXNf4Qa2sRw7KbqwLghpSxF__uDp1CAy-7vw/exec";

let datosGlobales = {};

async function iniciarApp() {
  const container = document.getElementById('lista-contratos');
  
  // Mostramos mensaje de carga
  if(container) container.innerHTML = '<p>🔄 Conectando con tu Google Drive...</p>';

  try {
    const response = await fetch(`${API_URL}?action=obtenerDatos`);
    datosGlobales = await response.json();
    
    console.log("Datos recibidos:", datosGlobales); // Para depuración

    renderizarContratos();
    renderizarPagos();
    
  } catch (error) {
    console.error("Error:", error);
    if(container) container.innerHTML = "<p class='alerta'>❌ Error cargando datos. Verifica que tu script esté implementado como 'Cualquier usuario'.</p>";
  }
}

function renderizarContratos() {
  const container = document.getElementById('lista-contratos');
  if (!container) return;
  container.innerHTML = '';

  if (datosGlobales.contratos.length === 0) {
      container.innerHTML = "<p>No hay contratos registrados en la hoja.</p>";
      return;
  }

  datosGlobales.contratos.forEach(c => {
    // Validación de Garantía (1x1 vs 2x1)
    let validacion = "✅";
    let montoEsperado = c.garantia_tipo === "2x1" ? c.monto * 2 : c.monto;
    
    // Convertimos a números para evitar errores de texto vs número
    if(Number(c.garantia_monto) !== Number(montoEsperado)) validacion = "⚠️ Error Monto";

    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <h3>${c.inquilino}</h3>
      <p><strong>Alquiler:</strong> S/ ${c.monto}</p>
      <p><strong>Garantía:</strong> ${c.garantia_tipo} (${validacion})</p>
      <p style="font-size: 0.9em; color: #666;">Suministro: ${c.luz_suministro}</p>
      <a href="https://www.enel.pe/es/personas/consulta-tu-recibo.html" target="_blank" style="color: #007bff; text-decoration: none;">Link Luz del Sur/Enel</a>
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

  datosGlobales.pagos.forEach(p => {
    // Buscar nombre del inquilino cruzando el ID
    const contrato = datosGlobales.contratos.find(c => c.id == p.id_contrato);
    const nombre = contrato ? contrato.inquilino : "Desconocido";
    
    // Alerta SUNAT (Impuesto a la Renta)
    let claseSunat = 'pagado';
    if(p.estado_sunat === 'Pendiente') {
      claseSunat = 'pendiente';
      // Agregamos la alerta visual arriba
      alertas.innerHTML += `<div class="alerta">🚨 <strong>ALERTA SUNAT:</strong> Debes pagar el 5% del alquiler de ${nombre} (${p.periodo})</div>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.periodo}</td>
      <td>${nombre}</td>
      <td>S/ ${p.monto}</td>
      <td class="${claseSunat}">${p.estado_sunat}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Función para cambiar de pestaña
window.ver = function(id) {
  document.getElementById('vista-contratos').style.display = 'none';
  document.getElementById('vista-pagos').style.display = 'none';
  
  // Quitamos clase 'active' a todos los botones
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  
  // Mostramos la sección elegida
  document.getElementById('vista-' + id).style.display = 'block';
  
  // Marcamos el botón como activo (esto requiere que pases 'this' en el HTML, 
  // pero por simplicidad dejaremos la lógica visual básica).
}

// Arrancar la app
iniciarApp();