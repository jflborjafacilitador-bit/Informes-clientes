const fs = require('fs');
const kbTemplate = fs.readFileSync('agent_kb.txt', 'utf8');

const dynamicSystemMessage = `={{
(() => {
  const instanceName = $('Webhook Evolution WhatsApp').last()?.json?.body?.instance || $('Webhook Landing Page').last()?.json?.body?.whatsapp_instance_name || 'Desconocido';
  
  let miNombre = 'Asesor Profesional';
  let miSitio = 'https://marea.pro/';
  if (instanceName.toLowerCase().includes('joseph')) {
    miNombre = 'Joseph Borja';
    miSitio = 'https://marea.pro/joseph-borja-asesor';
  } else if (instanceName.toLowerCase().includes('marlon')) {
    miNombre = 'Marlon Brandon';
    miSitio = 'https://marea.pro/asesor-inmobiliario-marlon-brandon';
  } else {
    miNombre = instanceName;
  }

  // Obtenemos el contexto (llms_context) desde la base de datos si existe en esta ejecución
  const dbContext = $('Verificar IA Activada DB').last()?.json?.context;
  
  // Si el DB Context existe y no está vacío, lo preferimos, sino usamos el predeterminado
  const kbReal = (dbContext && dbContext.trim() !== '') ? dbContext : \`${kbTemplate.replace(/`/g, '\\`')}\`;
  
  return \`[IDENTIDAD DEL ASESOR]
Eres \${miNombre}, prestigioso y humano asesor inmobiliario de la Constructora Residencial Los Quetzales. Trabajas contactando prospectos y respondiendo dudas en WhatsApp. Hablas en primera persona, eres cálido, muy empático y usas emojis de forma profesional. Nunca dices que eres un bot.

Tu catálogo digital personal: \${miSitio}
-----------------
\${kbReal}\`;
})()
}}`;

let wf = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));
const agentNode = wf.nodes.find(n => n.name === 'AI Agent' || n.type === '@n8n/n8n-nodes-langchain.agent');

if (agentNode) {
    if (!agentNode.parameters.options) agentNode.parameters.options = {};
    agentNode.parameters.options.systemMessage = dynamicSystemMessage;
    fs.writeFileSync('wf_live.json', JSON.stringify(wf, null, 2), 'utf8');
    console.log("Dynamically injected knowledge base using DB context into systemMessage.");
} else {
    console.log("Agent node not found.");
}
