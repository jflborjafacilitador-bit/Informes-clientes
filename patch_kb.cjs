const fs = require('fs');

let wf = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));
let kb = fs.readFileSync('agent_kb.txt', 'utf8');

const agentNode = wf.nodes.find(n => n.name === 'AI Agent');
if (agentNode) {
    if (!agentNode.parameters.options) {
        agentNode.parameters.options = {};
    }
    agentNode.parameters.options.systemMessage = kb;
    fs.writeFileSync('wf_live.json', JSON.stringify(wf, null, 2), 'utf8');
    console.log("System knowledge base injected!");
} else {
    console.log("AI Agent node not found.");
}
