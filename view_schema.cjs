const fs = require('fs');
const out = fs.readFileSync('schema_out.txt', 'utf16le');
console.log(out.replace(/\s+/g, ' '));
