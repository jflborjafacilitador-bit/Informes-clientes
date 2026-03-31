const fs = require('fs');
const d = JSON.parse(fs.readFileSync('n8n_latest_exec_data.json', 'utf8'));
const run = d.data.resultData.runData;
const keys = Object.keys(run);
const lastNodeName = keys[keys.length - 1];
const lastNodeExecuteData = run[lastNodeName][0];
if (lastNodeExecuteData.error) {
    fs.writeFileSync('n8n_error.txt', JSON.stringify({
        node: lastNodeName,
        error: lastNodeExecuteData.error
    }, null, 2));
} else {
    fs.writeFileSync('n8n_error.txt', 'No error in the last node!');
}
