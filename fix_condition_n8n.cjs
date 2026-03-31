const fs = require('fs');
let wf = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));

const node = wf.nodes.find(n => n.name === '¿IA Encendida?');
if (node && node.parameters.conditions && node.parameters.conditions.boolean) {
    node.parameters.conditions.boolean[0].value1 = "={{ $json.enabled }}";
}

fs.writeFileSync('wf_live.json', JSON.stringify(wf, null, 2), 'utf8');
console.log("Fixed conditional inside wf_live.json");
