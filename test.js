const http = require('https');

function send(bodyStr) {
  return new Promise((res, rej) => {
    const req = http.request({
      hostname: 'n8n-prueba1-evolution-api.exigs1.easypanel.host',
      path: '/message/sendText/admin-prueba',
      method: 'POST',
      headers: { 'apikey': '429683C4C977415CAAFCCE10F7D57E11', 'Content-Type': 'application/json' }
    }, (response) => {
      let data = '';
      response.on('data', d => data += d);
      response.on('end', () => res({status: response.statusCode, data}));
    });
    req.on('error', rej);
    req.write(bodyStr);
    req.end();
  });
}

async function run() {
  const t1 = await send(JSON.stringify({ number: "5215646376057", options: { delay: 1000 }, textMessage: { text: "t1" } }));
  console.log("T1:", t1);
  const t2 = await send(JSON.stringify({ number: "5215646376057", options: { delay: 1000 }, text: "t2" }));
  console.log("T2:", t2);
}
run();
