const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('w_orig.json', 'utf8'));

const node = wf.nodes.find(n => n.name === 'Enviar WhatsApp');
if (node) {
  // We want EXACTLY THIS JSONSTRING inside jsonBody
  node.parameters.jsonBody = "={\n  \"number\": \"{{@{responseText=¡Hola! ??

Me da mucho gusto saludarte. Soy tu asesor local de **Residencial Los Quetzales** en Ayala, Morelos.

Aquí no solo vendemos casas, sino una **experiencia de vida** con aire puro, vista a los volcanes y toda la tranquilidad que buscas, pero a solo 15 minutos de Plaza Atrios.

Para poder orientarte perfectamente y mostrarte las opciones que mejor se adapten a tu estilo de vida, ¿me puedes contar para qué uso buscas la propiedad? ??; phone=5215646376057; instanceName=admin-prueba}.phone}}\",\n  \"options\": {\n    \"delay\": 1500,\n    \"presence\": \"composing\"\n  },\n  \"text\": \"{{@{responseText=¡Hola! ??

Me da mucho gusto saludarte. Soy tu asesor local de **Residencial Los Quetzales** en Ayala, Morelos.

Aquí no solo vendemos casas, sino una **experiencia de vida** con aire puro, vista a los volcanes y toda la tranquilidad que buscas, pero a solo 15 minutos de Plaza Atrios.

Para poder orientarte perfectamente y mostrarte las opciones que mejor se adapten a tu estilo de vida, ¿me puedes contar para qué uso buscas la propiedad? ??; phone=5215646376057; instanceName=admin-prueba}.responseText}}\"\n}";
}

// Remove read-only properties
delete wf.id;
delete wf.createdAt;
delete wf.updatedAt;

fs.writeFileSync('w_new.json', JSON.stringify(wf, null, 2));
