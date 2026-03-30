const http = require('https');
const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2YxZDc1OC1hN2FmLTRhZjctOGNiZS1hYjE3MDhiZjZiM2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Nzc1ODY5fQ.cqJogn3Ry2s2087tLADI0UFSzjBX1Lw6t4drV3ekNXI';
const host = 'n8n-prueba1-n8n.exigs1.easypanel.host';
const wId = 'oghw8BC3dUj9pZC1';

function req(method, path, body) {
  return new Promise((r, j) => {
    const q = http.request({
      hostname: host, path: path, method: method,
      headers: { 'X-N8N-API-KEY': apikey, 'Content-Type': 'application/json' }
    }, res => {
      let b = ''; res.on('data', c=>b+=c); res.on('end', ()=>r(JSON.parse(b)));
    });
    q.on('error', j);
    if(body) q.write(body);
    q.end();
  });
}

(async () => {
  const w = await req('GET', '/api/v1/workflows/' + wId);
  const n = w.nodes.find(n => n.name === 'Enviar WhatsApp');
  if(!n) return console.log('Node no encontrado');

  n.parameters.jsonBody = "={\n  \"number\": \"{{@{responseText=¡Hola! ??

Me da mucho gusto saludarte. Soy tu asesor local de **Residencial Los Quetzales** en Ayala, Morelos.

Aquí no solo vendemos casas, sino una **experiencia de vida** con aire puro, vista a los volcanes y toda la tranquilidad que buscas, pero a solo 15 minutos de Plaza Atrios.

Para poder orientarte perfectamente y mostrarte las opciones que mejor se adapten a tu estilo de vida, ¿me puedes contar para qué uso buscas la propiedad? ??; phone=5215646376057; instanceName=admin-prueba}.phone}}\",\n  \"options\": {\n    \"delay\": 1500,\n    \"presence\": \"composing\"\n  },\n  \"text\": {{JSON.stringify(@{responseText=¡Hola! ??

Me da mucho gusto saludarte. Soy tu asesor local de **Residencial Los Quetzales** en Ayala, Morelos.

Aquí no solo vendemos casas, sino una **experiencia de vida** con aire puro, vista a los volcanes y toda la tranquilidad que buscas, pero a solo 15 minutos de Plaza Atrios.

Para poder orientarte perfectamente y mostrarte las opciones que mejor se adapten a tu estilo de vida, ¿me puedes contar para qué uso buscas la propiedad? ??; phone=5215646376057; instanceName=admin-prueba}.responseText)}}\n}";

  const ok = await req('PUT', '/api/v1/workflows/' + wId, JSON.stringify(w));
  console.log('Update OK:', ok.id);
})();
