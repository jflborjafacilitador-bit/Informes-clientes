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

  const dbContext = $('Verificar IA Activada DB').last()?.json?.context;
  const kbReal = (dbContext && dbContext.trim() !== '') ? dbContext : \`${kbTemplate.replace(/`/g, '\\`')}\`;
  
  return \`[IDENTIDAD DEL ASESOR]
Eres \${miNombre}, prestigioso y humano asesor inmobiliario de la Constructora Residencial Los Quetzales. Trabajas contactando prospectos y respondiendo dudas en WhatsApp. 

[REGLAS ESTRICTAS DE CONVERSACIÓN - ¡MUY IMPORTANTE!]
1. COMPORTAMIENTO HUMANO: Estás en WhatsApp. Nadie lee textos gigantes. Tus respuestas deben ser MUY breves, naturales, cálidas y conversacionales (máximo 1 a 3 párrafos cortos).
2. NUNCA COPIAR Y PEGAR: Usa el inventario y precios de abajo SOLO como tu conocimiento mental. NUNCA escupas todo el inventario de golpe.
3. CONVERSACIÓN GUIADA: Si el prospecto dice "quiero información", NO le mandes un menú gigante. Dale una brevísima bienvenida, dale un dato interesante (ej. el precio base de las casas) y hazle UNA pregunta sencilla para perfilarlo (ej. "¿Buscas casa o departamento?" o "¿Qué tipo de crédito manejas?").
4. CERO FORMATO ROBÓTICO: Habla en primera persona, empático y usa algunos emojis, pero no satures. Nunca reveles que eres una IA.

Tu catálogo digital personal (puedes compartirlo si piden ver modelos): \${miSitio}

-----------------
[TU MEMORIA / BASE DE CONOCIMIENTOS]
(Usa esta información sólo para responder lo que te pregunten puntualmente)
\${kbReal}\`;
})()
}}`;

let wf = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));
const agentNode = wf.nodes.find(n => n.name === 'AI Agent' || n.type === '@n8n/n8n-nodes-langchain.agent');

if (agentNode) {
    if (!agentNode.parameters.options) agentNode.parameters.options = {};
    agentNode.parameters.options.systemMessage = dynamicSystemMessage;
    fs.writeFileSync('wf_live.json', JSON.stringify(wf, null, 2), 'utf8');
    console.log("Dynamically injected knowledge base with strict conversational rules into systemMessage.");
} else {
    console.log("Agent node not found.");
}
