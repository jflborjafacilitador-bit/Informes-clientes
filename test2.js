const http = require('https');
const d1 = JSON.stringify({ number: '5215646376057', options: { delay: 1000 }, textMessage: { text: 'test1' } });
const d2 = JSON.stringify({ number: '5215646376057', text: 'test2' });
const d3 = JSON.stringify({ number: '5215646376057', textMessage: { text: 'test3' } });

function req(body) {
  return new Promise(r => {
    const q = http.request({
      hostname: 'n8n-prueba1-evolution-api.exigs1.easypanel.host', 
      path: '/message/sendText/admin-prueba', 
      method: 'POST', 
      headers: {'apikey':'429683C4C977415CAAFCCE10F7D57E11', 'Content-Type':'application/json'}
    }, res => {
      let d = ''; res.on('data', c=>d+=c); res.on('end', ()=>r({s:res.statusCode, b:d}));
    });
    q.write(body); q.end();
  });
}

(async () => {
  console.log('T1', await req(d1));
  console.log('T2', await req(d2));
  console.log('T3', await req(d3));
})();
