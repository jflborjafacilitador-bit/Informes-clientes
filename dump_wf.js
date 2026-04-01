const fs = require('fs');
const d = JSON.parse(fs.readFileSync('wf_current_live.json'));

const agent = d.nodes.find(n => n.name === 'AI Agent');
const sendWa = d.nodes.find(n => n.name === 'Send WhatsApp');
const hookLanding = d.nodes.find(n => n.name === 'Webhook Landing Page');
const mem = d.nodes.find(n => n.name === 'Window Buffer Memory');

const out = {
  agentText: agent?.parameters?.text,
  agentSys: agent?.parameters?.options?.systemMessage,
  sendWa: sendWa?.parameters,
  hookLanding: hookLanding?.parameters,
  mem: mem?.parameters
};

fs.writeFileSync('wf_debug.json', JSON.stringify(out, null, 2));
console.log('Saved to wf_debug.json');
