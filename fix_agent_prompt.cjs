const fs = require('fs');

let wf;
try {
  wf = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));
} catch (e) {
  console.error("Error reading wf_live.json", e);
  process.exit(1);
}

const aiNode = wf.nodes.find(n => n.name === 'AI Agent');
if (aiNode) {
  aiNode.parameters.text = `={{ $('Webhook Evolution WhatsApp').first()?.json?.body?.data ? ($('Webhook Evolution WhatsApp').first()?.json?.body?.data.message.conversation || $('Webhook Evolution WhatsApp').first()?.json?.body?.data.message.extendedTextMessage?.text || "") : ($('Webhook Landing Page').first()?.json?.body ? ("*INSTRUCCIÓN DEL SISTEMA DE ACTIVACIÓN*\\n\\nHola, tienes que dar el **primer saludo** a este nuevo prospecto.\\n\\nDatos del prospecto:\\n- Nombre: " + $('Webhook Landing Page').first().json.body.nombre + "\\n- Presupuesto: " + $('Webhook Landing Page').first().json.body.presupuesto + "\\n- Financiamiento: " + $('Webhook Landing Page').first().json.body.financiamiento + "\\n\\nMensaje base del asesor que te creó: \\"" + $('Webhook Landing Page').first().json.body.welcome_message + "\\"\\n\\nInstrucción: Escribe el primer mensaje de bienvenida de tu parte. Sé muy natural, empático y menciona brevemente que tomaste nota de su información. Usa un tono humano.") : "") }}`;
  
  fs.writeFileSync('wf_live.json', JSON.stringify(wf, null, 2), 'utf8');
  console.log("Fixed AI Agent prompt inside wf_live.json");
} else {
  console.log("AI Agent node not found.");
}
