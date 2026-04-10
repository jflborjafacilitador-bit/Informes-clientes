/**
 * ====================================================
 * GOOGLE APPS SCRIPT — Sincronización bidireccional
 * Proyecto: Los Quetzales CRM
 * ====================================================
 *
 * INSTRUCCIONES DE INSTALACIÓN (una sola vez, ~5 min):
 *
 * 1. Abre el Google Sheet de clientes
 * 2. Ve a: Extensiones → Apps Script
 * 3. Borra el código que aparece por defecto
 * 4. Pega TODO el contenido de este archivo
 * 5. Haz clic en "Guardar" (ícono de disco)
 * 6. Haz clic en "Desplegar" → "Nueva implementación"
 * 7. Tipo: "Aplicación web"
 *    - Ejecutar como: Yo (tu cuenta Google)
 *    - Quién tiene acceso: Cualquier usuario
 * 8. Haz clic en "Implementar"
 * 9. Copia la URL que aparece (empieza con https://script.google.com/macros/...)
 * 10. Pégala en src/services/googleSheets.ts en la constante APPS_SCRIPT_URL
 * ====================================================
 */

const SHEET_NAME = 'Hoja1'; // Nombre de la pestaña en tu Google Sheet

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];

    // Si viene una acción de actualización
    if (e.parameter.action === 'update') {
      return handleUpdate(sheet, e.parameter);
    }

    // Default: devolver todos los datos como JSON
    return readAllRows(sheet);

  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

function readAllRows(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse({ rows: [] });

  const headers = data[0];
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Saltar filas completamente vacías
    if (!row.some(function(cell) { return String(cell).trim() !== ''; })) continue;

    const obj = {};
    headers.forEach(function(h, j) {
      obj[String(h).trim()] = String(row[j] === null || row[j] === undefined ? '' : row[j]).trim();
    });
    obj['_rowIndex'] = i + 1; // número de fila real en el Sheet
    rows.push(obj);
  }

  return jsonResponse({ rows: rows, total: rows.length });
}

function handleUpdate(sheet, params) {
  const phone  = String(params.phone  || '').trim();
  const status = params.status  ? String(params.status).trim() : null;
  const assigned = params.assigned !== undefined ? String(params.assigned).trim() : null;

  if (!phone) {
    return jsonResponse({ success: false, error: 'Teléfono requerido' });
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(function(h) { return String(h).trim(); });

  const phoneCol    = headers.indexOf('Teléfono');
  const statusCol   = headers.indexOf('Estado');
  const assignedCol = headers.indexOf('Asesor Asignado');

  if (phoneCol === -1) {
    return jsonResponse({ success: false, error: 'No se encontró columna Teléfono' });
  }

  for (let i = 1; i < data.length; i++) {
    const rowPhone = String(data[i][phoneCol] || '').trim();
    if (rowPhone !== phone) continue;

    if (status !== null && statusCol >= 0) {
      sheet.getRange(i + 1, statusCol + 1).setValue(status);
    }
    if (assigned !== null && assignedCol >= 0) {
      sheet.getRange(i + 1, assignedCol + 1).setValue(assigned);
    }

    return jsonResponse({ success: true, updatedRow: i + 1 });
  }

  return jsonResponse({ success: false, error: 'No se encontró el teléfono: ' + phone });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
