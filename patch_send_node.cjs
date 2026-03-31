const fs = require('fs');

let wf = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));

const sendNode = wf.nodes.find(n => n.name === 'Send WhatsApp via Evolution API');
if (sendNode) {
    // Fix URL
    sendNode.parameters.url = "={{ 'https://n8n-prueba1-evolution-api.exigs1.easypanel.host/message/sendText/' + ($('Webhook Evolution WhatsApp').last()?.json?.body?.instance || $('Webhook Landing Page').last()?.json?.body?.whatsapp_instance_name) }}";

    // Fix body parameters (Phone Number)
    if (sendNode.parameters.bodyParameters && sendNode.parameters.bodyParameters.parameters) {
        const numberParam = sendNode.parameters.bodyParameters.parameters.find(p => p.name === 'number');
        if (numberParam) {
            numberParam.value = "={{ $('Webhook Evolution WhatsApp').last()?.json?.body?.data?.key?.remoteJid?.replace('@s.whatsapp.net', '') || $('Webhook Landing Page').last()?.json?.body?.telefono }}";
        }
    }
    
    fs.writeFileSync('wf_live.json', JSON.stringify(wf, null, 2), 'utf8');
    console.log("Fixed Send WhatsApp via Evolution API node parameters!");
} else {
    console.log("Node not found!");
}
