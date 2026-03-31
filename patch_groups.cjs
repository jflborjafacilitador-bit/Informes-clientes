const fs = require('fs');
let wf = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));

const node = wf.nodes.find(n => n.name === 'Ignorar Mensajes de IA');
if (node && node.parameters.conditions && node.parameters.conditions.boolean) {
    // Make sure we only add it if it's not already there
    if (!node.parameters.conditions.boolean.some(c => c.value1.includes('@g.us'))) {
        node.parameters.conditions.boolean.push({
            "value1": "={{ $json.body.data.key.remoteJid?.includes('@g.us') }}",
            "operation": "equal",
            "value2": false
        });
        node.parameters.combineOperation = 'all'; // Must match both
    }
}

fs.writeFileSync('wf_live.json', JSON.stringify(wf, null, 2), 'utf8');
console.log("Added group ignoring patch internally.");
