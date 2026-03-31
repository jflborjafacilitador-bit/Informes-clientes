const fs = require('fs');
let content = fs.readFileSync('src/pages/WhatsApp.tsx', 'utf8');
const nuevo = fs.readFileSync('nuevo_contexto.txt', 'utf8');

const regex = /const DEFAULT_LLMS_CONTEXT = `[\s\S]*?`;/;
if (regex.test(content)) {
    content = content.replace(regex, 'const DEFAULT_LLMS_CONTEXT = `'+nuevo.replace(/`/g, '\\`')+'`;');
    fs.writeFileSync('src/pages/WhatsApp.tsx', content);
    console.log("Updated WhatsApp.tsx successfully.");
} else {
    console.error("Could not find DEFAULT_LLMS_CONTEXT block");
}
