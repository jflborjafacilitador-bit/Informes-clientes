const fs = require('fs');
let wf = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));

const memNode = wf.nodes.find(n => n.name === 'Window Buffer Memory');
if (memNode) {
    memNode.parameters.sessionKey = "={{ $('Webhook Evolution WhatsApp').first()?.json?.body?.data?.key?.remoteJid || $('Webhook Landing Page').first()?.json?.body?.telefono || 'default' }}";
    fs.writeFileSync('wf_live.json', JSON.stringify(wf, null, 2), 'utf8');
    console.log("Memory sessionKey fixed!");
}
