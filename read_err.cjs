const fs = require('fs');
const json = fs.readFileSync('cred_output.txt', 'utf16le');
console.log(json.substring(0, 500).replace(/\n/g, ' '));
