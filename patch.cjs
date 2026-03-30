const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('w_orig.json', 'utf8'));

const node = wf.nodes.find(n => n.name === 'Enviar WhatsApp');
if (node) {
  // Using evaluated JavaScript block in n8n UI
  node.parameters.jsonBody = "={{ { number: $json.phone, options: { delay: 1500, presence: 'composing' }, text: $json.responseText } }}";
}

// Remove read-only properties
delete wf.id;
delete wf.createdAt;
delete wf.updatedAt;

fs.writeFileSync('w_new.json', JSON.stringify(wf, null, 2));
