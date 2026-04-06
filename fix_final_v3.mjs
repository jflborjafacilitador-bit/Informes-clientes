/**
 * FIX DEFINITIVO V3 - Basado en el workflow real inspeccionado:
 * 
 * PROBLEMA 1: "Analizar Imagen GPT-4o" (node-analyze-image)
 *   jsonBody usa {{ $json.base64 }} dentro de ={ }, lo cual no funciona en n8n
 *   FIX: Usar specifyBody: 'keypairs' donde cada campo JSON es una expresion separada
 *   O mejor: usar el body como JSON con expression correcta para el campo url
 * 
 * PROBLEMA 2: "Convertir Base64 a Binario" (node-b64-to-binary) 
 *   No tiene jsCode definido (code_node_params: {})
 *   FIX: Agregar el codigo correcto para convertir base64 a binario
 * 
 * NO TOCAR:
 *   - IF nodes, webhook, AI Agent, DeepSeek, Memory, Send WhatsApp
 *   - Conexiones (excepto las relacionadas a imagen)
 */
import { readFileSync, writeFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const apikey = env.match(/VITE_N8N_API_KEY=(.*)/)?.[1]?.trim();
const base = env.match(/VITE_N8N_BASE_URL=(.*)/)?.[1]?.trim();
const OPNK = 'Bearer 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';

const r = await fetch(base + '/api/v1/workflows/iJkJqQsNI6u4BXu6', {
  headers: { 'X-N8N-API-KEY': apikey }
});
const wf = await r.json();

// ================================================================
// FIX 1: "Analizar Imagen GPT-4o" - usar specifyBody: keypairs
// En n8n, para body con arrays anidados lo más robusto es usar
// un nodo Code donde se hace el fetch directamente con node-fetch/fetch
// ================================================================
const imgNodeIdx = wf.nodes.findIndex(n => n.id === 'node-analyze-image');

// La forma CORRECTA en n8n para pasar base64 largo al HTTP Request:
// No usar jsonBody con ={{ }} ya que n8n no parse bien {{ }} dentro
// La solución es cambiar a specifyBody: 'string' y construir el JSON como expresion
wf.nodes[imgNodeIdx] = {
  ...wf.nodes[imgNodeIdx],
  parameters: {
    method: 'POST',
    url: 'https://api.openai.com/v1/chat/completions',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'Authorization', value: OPNK },
        { name: 'Content-Type', value: 'application/json' }
      ]
    },
    sendBody: true,
    // Usar specifyBody: 'string' y construir el JSON string completo como expresion
    // Esto permite concatenar $json.base64 correctamente
    specifyBody: 'string',
    body: `={{ JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: [{ type: "text", text: "Describe brevemente esta imagen en español para un asesor inmobiliario. Máximo 80 palabras." }, { type: "image_url", image_url: { url: "data:image/jpeg;base64," + $json.base64 } }] }], max_tokens: 150 }) }}`,
    options: {}
  }
};
console.log('FIX 1: Actualizado nodo Analizar Imagen GPT-4o con specifyBody: string');

// ================================================================
// FIX 2: "Convertir Base64 a Binario" - agregar codigo correcto
// Recibe de "Descargar Audio Base64": { base64: "...", mimetype: "audio/ogg" }
// Debe producir binary data para el nodo Whisper
// El Whisper espera $binary.data (formBinaryData)
// ================================================================
const codeNodeIdx = wf.nodes.findIndex(n => n.id === 'node-b64-to-binary');

wf.nodes[codeNodeIdx] = {
  ...wf.nodes[codeNodeIdx],
  parameters: {
    mode: 'runOnceForAllItems',
    jsCode: `
// Recibe: $input.first().json.base64 y $input.first().json.mimetype
// Produce: item con binary.data para el nodo Whisper

const item = $input.first();
const base64 = item.json.base64;
const mimetype = item.json.mimetype || 'audio/ogg; codecs=opus';
const fileType = mimetype.includes('ogg') ? 'ogg' : 'mp3';

if (!base64) {
  throw new Error('No se encontro base64 en el nodo anterior: ' + JSON.stringify(item.json).substring(0, 200));
}

// Convertir base64 a Buffer y crear binario
const buffer = Buffer.from(base64, 'base64');
const binaryData = await this.helpers.prepareBinaryData(buffer, 'audio.' + fileType, mimetype);

return [{ json: item.json, binary: { data: binaryData } }];
`
  }
};
console.log('FIX 2: Actualizado nodo Convertir Base64 a Binario con codigo correcto');

// ================================================================
// Verificar el Whisper node - debe usar formBinaryData con $binary.data
// Si ya tiene eso configurado, no tocar
// ================================================================
const whisperNodeIdx = wf.nodes.findIndex(n => n.id === 'node-transcribe-audio');
const whisperParams = wf.nodes[whisperNodeIdx]?.parameters;
console.log('FIX 3: Whisper params verificados:', JSON.stringify(whisperParams?.bodyParameters?.parameters, null, 2));

// ================================================================
// Tambien verificar que el AI Agent tenga el input text correcto
// para manejar tanto texto como imagen/audio transcrito
// ================================================================
const aiAgentIdx = wf.nodes.findIndex(n => n.name === 'AI Agent');
const aiParams = wf.nodes[aiAgentIdx]?.parameters;
console.log('AI Agent texto prompt (primeros 300 chars):', aiParams?.text?.substring(0, 300));

// Enviar cambios
const payload = {
  name: wf.name,
  nodes: wf.nodes,
  connections: wf.connections,
  settings: wf.settings,
  staticData: wf.staticData
};

console.log('\nEnviando fixes a n8n...');
const resp = await fetch(base + '/api/v1/workflows/iJkJqQsNI6u4BXu6', {
  method: 'PUT',
  headers: { 'X-N8N-API-KEY': apikey, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
const result = await resp.json();
if (resp.ok) {
  console.log('SUCCESS! Version:', result.versionId);
  console.log('Nodos totales:', result.nodes?.length);
  
  // Verificar los nodos arreglados
  const imgFixed = result.nodes?.find(n => n.id === 'node-analyze-image');
  const codeFixed = result.nodes?.find(n => n.id === 'node-b64-to-binary');
  console.log('\nImagen node specifyBody:', imgFixed?.parameters?.specifyBody);
  console.log('Code node mode:', codeFixed?.parameters?.mode);
  console.log('Code node tiene jsCode:', !!codeFixed?.parameters?.jsCode);
} else {
  console.error('ERROR:', resp.status, JSON.stringify(result).substring(0, 500));
}
