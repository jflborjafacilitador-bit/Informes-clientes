const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));

// Safety fix for AI Agent text resolving
const aiAgent = wf.nodes.find(n => n.name === "AI Agent");
if (aiAgent) {
  aiAgent.parameters.text = `={{ $json.body?.data ? ($json.body.data.message.conversation || $json.body.data.message.extendedTextMessage?.text || "") : ($json.body?.nombre ? ("*INSTRUCCIÓN DEL SISTEMA DE ACTIVACIÓN*\\n\\nHola, da el **primer saludo** a este nuevo prospecto.\\n\\nDatos del prospecto:\\n- Nombre: " + $json.body.nombre + "\\n- Presupuesto: " + $json.body.presupuesto + "\\n- Financiamiento: " + $json.body.financiamiento + "\\n\\nMensaje base del asesor que te crió: \\"" + $json.body.welcome_message + "\\"\\n\\nInstrucción: Escribe el primer mensaje de bienvenida de tu parte. Sé muy natural, empático y menciona brevemente que tomaste nota de su información.") : ($json.text || $json.output)) }}`;
}

const sender = wf.nodes.find(n => n.name === "Send WhatsApp via Evolution API");
if (sender) {
  sender.parameters.url = `={{ 'https://n8n-prueba1-evolution-api.exigs1.easypanel.host/message/sendText/' + ($if($('Webhook Evolution WhatsApp').isExecuted, $('Webhook Evolution WhatsApp').first().json.body.instance, $('Webhook Landing Page').first().json.body.whatsapp_instance_name)) }}`;
  const numberParam = sender.parameters.bodyParameters.parameters.find(p => p.name === "number");
  if (numberParam) {
    numberParam.value = `={{ $if($('Webhook Evolution WhatsApp').isExecuted, $('Webhook Evolution WhatsApp').first().json.body.data.key.remoteJid.replace('@s.whatsapp.net', ''), $('Webhook Landing Page').first().json.body.telefono) }}`;
  }
}

if (wf.activeVersion) {
  const activeAi = wf.activeVersion.nodes.find(n => n.name === "AI Agent");
  if (activeAi) activeAi.parameters = aiAgent.parameters;
  const activeSender = wf.activeVersion.nodes.find(n => n.name === "Send WhatsApp via Evolution API");
  if (activeSender) activeSender.parameters = sender.parameters;
}

fs.writeFileSync('wf_live_v2.json', JSON.stringify(wf, null, 2));
console.log('Safe modifications done. Preserved workflow schema stability.');
