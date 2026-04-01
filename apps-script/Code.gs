// ==========================================
// Apps Script: Registro de Leads - Los Quetzales
// Hojas: "Landing" (desde landing page) | "Personales" (registro manual)
// Última actualización: 2026-04-01
// ==========================================

function doPost(e) {
  try {
    // Parsear body (viene como text/plain con JSON adentro)
    var raw = e.postData.contents;
    var data = JSON.parse(raw);

    // Determinar en qué hoja escribir
    var sheetName = data.hoja || 'Landing'; // default: Landing si no se especifica
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    // Si la hoja no existe, crearla con el nombre recibido
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // Agregar encabezados
      sheet.appendRow(['Fecha', 'Nombre', 'Telefono', 'Correo', 'Presupuesto', 'Financiamiento', 'Asesor', 'Estado', 'Notas']);
      // Dar formato al header
      var headerRange = sheet.getRange(1, 1, 1, 9);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#1a1a2e');
      headerRange.setFontColor('#ffffff');
    }

    // Agregar la fila con los datos
    sheet.appendRow([
      data.fecha || new Date().toLocaleDateString('es-MX'),
      data.nombre || '',
      data.telefono || '',
      data.correo || '',
      data.presupuesto || '',
      data.financiamiento || '',
      data.asesor || '',
      data.estado || 'Lead',
      data.notas || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, hoja: sheetName }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Para pruebas manuales desde el editor de Apps Script
function testDoPost() {
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        hoja: 'Landing',
        fecha: '01/04/2026',
        nombre: 'Test Apps Script',
        telefono: '5512345678',
        correo: 'test@quetzales.com',
        presupuesto: 'Entre 1.5 y 2.0 mdp',
        financiamiento: 'COFINAVIT',
        asesor: 'Joseph',
        estado: 'Lead',
        notas: 'Prueba manual desde editor'
      })
    }
  };
  var result = doPost(fakeEvent);
  Logger.log(result.getContent());
}
