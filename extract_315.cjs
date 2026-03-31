const fs = require('fs');
try {
  const d = JSON.parse(fs.readFileSync('exec_315.json', 'utf8'));
  const runData = d.data.resultData.runData;
  const sendNode = runData['Send WhatsApp via Evolution API'][0];
  console.log("Error:", sendNode.error);
  console.log("Executed URL:", sendNode.data.main[0]?.[0]?.json?.url || JSON.stringify(sendNode)); 
} catch(e) { console.error(e.message); }
