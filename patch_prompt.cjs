const fs = require('fs');

let wf = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));

const promptUpdates = `
[CONVERSATION LOGIC - MODO INFORMATIVO]
- REGLA DE ORO: TUS RESPUESTAS DEBEN SER EXTREMADAMENTE BREVES Y CONCISAS. Máximo 2 o 3 oraciones cortas por mensaje. NUNCA envíes bloques enormes de texto.
- TONO: 100% humano, conversacional, como si estuvieras chateando en WhatsApp.
- PROHIBICIONES ESTRICTAS: 
  1. NO vendemos departamentos. SOLO vendemos CASAS. Si te preguntan por departamentos, aclara que solo vendemos casas en formato residencial.
  2. NO manejamos precios en dólares (USD). Todos nuestros precios son en Pesos Mexicanos (MXN).
  3. NO tenemos desarrollos en otras ciudades, solo en Ayala, Morelos.
- No pidas información innecesaria: Si el cliente pregunta por precios, dáselos brevemente y directo al punto.
- Cierre: Termina siempre con una pregunta concisa (ej. "¿Te interesa algún modelo en particular?" o "¿Quieres que te mande la ubicación?").
`;

// Helper to update systemMessage options in the nodes
function updateNode(node) {
  if (node.name === 'AI Agent' && node.parameters && node.parameters.options && node.parameters.options.systemMessage) {
    let msg = node.parameters.options.systemMessage;
    // Replace the old conversation logic section
    msg = msg.replace(/\[CONVERSATION LOGIC - MODO INFORMATIVO\][\s\S]*?\[RECURSOS Y ENLACES\]/, promptUpdates.trim() + '\\r\\n\\r\\n[RECURSOS Y ENLACES]');
    node.parameters.options.systemMessage = msg;
  }
}

wf.nodes.forEach(updateNode);
if (wf.activeVersion && wf.activeVersion.nodes) {
  wf.activeVersion.nodes.forEach(updateNode);
}

fs.writeFileSync('wf_live.json', JSON.stringify(wf, null, 2));
console.log("wf_live.json patched successfully.");
