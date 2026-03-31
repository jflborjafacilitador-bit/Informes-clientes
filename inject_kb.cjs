const fs = require('fs');

const wfString = fs.readFileSync('wf_live.json', 'utf8');
const kbText = fs.readFileSync('agent_kb.txt', 'utf8');

let wf = JSON.parse(wfString);

function updateNode(node) {
  if (node.name === 'AI Agent' && node.parameters && node.parameters.options && node.parameters.options.systemMessage) {
    let msg = node.parameters.options.systemMessage;
    // msg contains a JS block: const kbReal = ... ? dbContext : `...`;
    
    // We will find the boundaries
    const prefix = "const kbReal = (dbContext && dbContext.trim() !== '') ? dbContext : `";
    const startIndex = msg.indexOf(prefix);
    if(startIndex === -1) return;
    const bodyStart = startIndex + prefix.length;
    
    const suffix = "`;\n  \n  return `[IDENTIDAD DEL ASESOR]";
    const endIndex = msg.indexOf(suffix);
    if(endIndex === -1) return;
    
    const newMsg = msg.substring(0, bodyStart) + kbText + msg.substring(endIndex);
    node.parameters.options.systemMessage = newMsg;
  }
}

wf.nodes.forEach(updateNode);
if (wf.activeVersion && wf.activeVersion.nodes) {
  wf.activeVersion.nodes.forEach(updateNode);
}

fs.writeFileSync('wf_live.json', JSON.stringify(wf, null, 2));
console.log("wf_live.json injected successfully.");
