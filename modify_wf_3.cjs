const fs = require('fs');
let wf = JSON.parse(fs.readFileSync('wf_live_v2.json', 'utf8'));

// 1. Fix the `AI Agent` text parameter so it reads correctly relying on what fired
const aiAgent = wf.nodes.find(n => n.name === "AI Agent");
if (aiAgent) {
  // If it comes from WhatsApp webhook, $json.body.data will exist
  // If it comes from Landing webhook, $json.body.nombre will exist
  aiAgent.parameters.text = `={{ $json.body.data ? ($json.body.data.message.conversation || $json.body.data.message.extendedTextMessage?.text || $json.body.data.message.audioMessage?.mimetype || "") : ($json.body.nombre ? ("*INSTRUCCION DEL SISTEMA*\\n\\nHola, da el primer saludo a este prospecto.\\nNombre: " + $json.body.nombre + "\\nPresupuesto: " + $json.body.presupuesto + "\\nFinanciamiento: " + $json.body.financiamiento + "\\n\\nMensaje del asesor: \\"" + $json.body.welcome_message + "\\"") : $json.output) }}`;
  
  // Wait, if it comes from Whisper, it will have $json.output !
  // Whisper outputs the transcript in $json.text
  // So let's handle Whisper output:
  aiAgent.parameters.text = `={{ $json.body?.data ? ($json.body.data.message.conversation || $json.body.data.message.extendedTextMessage?.text || "") : ($json.body?.nombre ? ("*INSTRUCCIÓN DEL SISTEMA DE ACTIVACIÓN*\\n\\nHola, da el **primer saludo** a este nuevo prospecto.\\n\\nDatos del prospecto:\\n- Nombre: " + $json.body.nombre + "\\n- Presupuesto: " + $json.body.presupuesto + "\\n- Financiamiento: " + $json.body.financiamiento + "\\n\\nMensaje base del asesor que te crió: \\"" + $json.body.welcome_message + "\\"\\n\\nInstrucción: Escribe el primer mensaje de bienvenida de tu parte. Sé muy natural, empático y menciona brevemente que tomaste nota de su información.") : ($json.text || $json.output)) }}`;
}

// 2. Fix `Send WhatsApp via Evolution API`
const sender = wf.nodes.find(n => n.name === "Send WhatsApp via Evolution API");
if (sender) {
  // Try to use safe node checks
  sender.parameters.url = `={{ 'https://n8n-prueba1-evolution-api.exigs1.easypanel.host/message/sendText/' + ($if($('Webhook Evolution WhatsApp').isExecuted, $('Webhook Evolution WhatsApp').first().json.body.instance, $('Webhook Landing Page').first().json.body.whatsapp_instance_name)) }}`;
  
  const numberParam = sender.parameters.bodyParameters.parameters.find(p => p.name === "number");
  if (numberParam) {
    numberParam.value = `={{ $if($('Webhook Evolution WhatsApp').isExecuted, $('Webhook Evolution WhatsApp').first().json.body.data.key.remoteJid.replace('@s.whatsapp.net', ''), $('Webhook Landing Page').first().json.body.telefono) }}`;
  }
}

// 3. Update Register CRM for the case of Landing Page
const registerCrm = wf.nodes.find(n => n.name === "Registrar Cliente CRM");
// If it's landing page, the RPC already registers it, so we don't need this node to run! 
// Wait, "Ignorar Mensajes de IA" is ONLY attached to Webhook Evolution WhatsApp.
// And "Webhook Landing Page" is connected DIRECTLY to "AI Agent". So Registrar Cliente CRM is NEVER called for Landing Page!
// This means the n8n logic for Landing was correct mechanically, EXCEPT that it failed at Send WhatsApp because of missing .isExecuted checks!

// 4. Update the node values in activeVersion as well
if (wf.activeVersion) {
  const activeAi = wf.activeVersion.nodes.find(n => n.name === "AI Agent");
  if (activeAi) activeAi.parameters = aiAgent.parameters;
  const activeSender = wf.activeVersion.nodes.find(n => n.name === "Send WhatsApp via Evolution API");
  if (activeSender) activeSender.parameters = sender.parameters;
}

fs.writeFileSync('wf_live_v2.json', JSON.stringify(wf, null, 2));
console.log('Modified AI Agent and sender nodes to use solid $if checks and handle Whisper transcipts!');
