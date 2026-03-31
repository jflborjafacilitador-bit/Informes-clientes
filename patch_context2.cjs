const fs = require('fs');
let content = fs.readFileSync('src/services/whatsappService.ts', 'utf8');
const nuevo = fs.readFileSync('nuevo_contexto.txt', 'utf8');

const regex = /export const DEFAULT_LLMS_CONTEXT = `[\s\S]*?`;/;
if (regex.test(content)) {
    content = content.replace(regex, 'export const DEFAULT_LLMS_CONTEXT = `'+nuevo.replace(/`/g, '\\`')+'`;');
    fs.writeFileSync('src/services/whatsappService.ts', content);
    console.log("Updated whatsappService.ts successfully.");
} else {
    console.error("Could not find DEFAULT_LLMS_CONTEXT block");
}
