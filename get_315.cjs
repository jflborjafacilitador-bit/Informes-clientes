const n8nUrl = 'https://n8n-prueba1-n8n.exigs1.easypanel.host';
const n8nKey = 'n8n_api_43bd3db21f92e92c2dfc8debb5b780373ab1a3a69a23c34e3fb4b9538fa';
fetch(n8nUrl + '/api/v1/executions/315?includeData=true', { headers: { 'X-N8N-API-KEY': n8nKey } })
.then(r => r.json())
.then(d => { 
  const errorData = d.data.resultData.error; 
  console.log(JSON.stringify(errorData, null, 2)); 
  require('fs').writeFileSync('exec_315.json', JSON.stringify(d.data.resultData.runData, null, 2));
})
.catch(console.error);
