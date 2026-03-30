const http = require('https');
const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2YxZDc1OC1hN2FmLTRhZjctOGNiZS1hYjE3MDhiZjZiM2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Nzc1ODY5fQ.cqJogn3Ry2s2087tLADI0UFSzjBX1Lw6t4drV3ekNXI';

const getW = () => new Promise(r => {
  http.get({hostname: 'n8n-prueba1-n8n.exigs1.easypanel.host', path: '/api/v1/workflows/oghw8BC3dUj9pZC1', headers: {'X-N8N-API-KEY':apikey}}, res=>{
    let d=''; res.on('data', c=>d+=c); res.on('end', ()=>r(JSON.parse(d)));
  });
});

const putW = (w) => new Promise((r, j) => {
  const req = http.request({hostname: 'n8n-prueba1-n8n.exigs1.easypanel.host', path: '/api/v1/workflows/oghw8BC3dUj9pZC1', method: 'PUT', headers: {'X-N8N-API-KEY':apikey, 'Content-Type':'application/json'}}, res=>{
    let d=''; res.on('data', c=>d+=c); res.on('end', ()=>r({status:res.statusCode, data:d}));
  });
  req.on('error', j);
  req.write(JSON.stringify(w));
  req.end();
});

(async () => {
  const w = await getW();
  const n = w.nodes.find(n => n.name === 'Enviar WhatsApp');
  n.parameters.jsonBody = "={{ JSON.stringify({ number: $json.phone, options: { delay: 1500, presence: 'composing' }, text: $json.responseText }) }}";
  console.log("Subiendo workflow...");
  const res = await putW(w);
  console.log("STATUS:", res.status);
  console.log("RES:", res.data);
})();
