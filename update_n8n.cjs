const fs = require('fs');
let d = fs.readFileSync('wf_live.json', 'utf8');
let j = JSON.parse(d);

let n = j.nodes.find(x => x.name === 'Send WhatsApp via Evolution API');

if (n) {
  // Fix URL expression
  n.parameters.url = "={{ 'https://n8n-prueba1-evolution-api.exigs1.easypanel.host/message/sendText/' + ($('Webhook Evolution WhatsApp').first()?.json?.body?.instance || $('Webhook Landing Page').first()?.json?.body?.whatsapp_instance_name) }}";

  // Fix number expression
  let params = n.parameters.bodyParameters.parameters;
  let p = params.find(x => x.name === 'number');
  if (p) {
    p.value = "={{ $('Webhook Evolution WhatsApp').first()?.json?.body?.data?.key?.remoteJid?.replace('@s.whatsapp.net', '') || $('Webhook Landing Page').first()?.json?.body?.telefono }}";
  }

  fs.writeFileSync('wf_live.json', JSON.stringify(j, null, 2));
  console.log('Successfully updated wf_live.json');
} else {
  console.error('Node not found!');
}
