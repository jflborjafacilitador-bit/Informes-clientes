/**
 * FIX DEFINITIVO: 
 * - $helpers NO existe en n8n Code node
 * - Usar fetch() nativo de Node.js 18+ que sí está disponible
 * - El Code node de audio también tiene el mismo problema potencial
 */
import { readFileSync, writeFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const apikey = env.match(/VITE_N8N_API_KEY=(.*)/)?.[1]?.trim();
const base = env.match(/VITE_N8N_BASE_URL=(.*)/)?.[1]?.trim();
const OPENAI_KEY = 'Bearer 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';

const r = await fetch(base + '/api/v1/workflows/iJkJqQsNI6u4BXu6', {
  headers: { 'X-N8N-API-KEY': apikey }
});
const wf = await r.json();

// ========================================================
// FIX: Nodo "Analizar Imagen GPT-4o"
// - NO usar $helpers.httpRequest (no disponible en Code node)
// - Usar el nodo HTTP Request nativo de n8n en su lugar
// - MEJOR SOLUCIÓN: Convertir a nodo n8n HTTP Request configurado
//   correctamente con los campos del body como expression
// ========================================================

// La verdadera solución es usar el HTTP Request node de n8n
// con el body como CAMPO JSON individual (no jsonBody completo)
// usando "specifyBody: keypairs" donde cada campo puede ser una expresión separada

const imgNodeIdx = wf.nodes.findIndex(n => n.id === 'node-analyze-image');
console.log('Imagen node:', wf.nodes[imgNodeIdx]?.name, 'type:', wf.nodes[imgNodeIdx]?.type);

// Volver al HTTP Request node pero usando la forma CORRECTA:
// Poner la expresion $json.base64 DIRECTAMENTE en el campo url de image_url
// usando specifyBody: json con el objeto donde SOLO el campo url contiene expresion
wf.nodes[imgNodeIdx] = {
  id: 'node-analyze-image',
  name: 'Analizar Imagen GPT-4o',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [940, 520],
  parameters: {
    method: 'POST',
    url: 'https://api.openai.com/v1/chat/completions',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'Authorization', value: OPENAI_KEY },
        { name: 'Content-Type', value: 'application/json' }
      ]
    },
    sendBody: true,
    // Usar specifyBody: 'json' con un objeto COMPLETO que usa expresion n8n CORRECTA
    // La key es que el jsonBody completo sea la expresion, retornando el objeto
    specifyBody: 'json',
    jsonBody: `={
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Describe esta imagen en espanol, maximo 80 palabras, para un asesor inmobiliario."
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,{{ $json.base64 }}"
          }
        }
      ]
    }
  ]
}`,
    options: {}
  }
};

// ========================================================
// También verificar y arreglar el nodo de audio "Convertir Base64 a Binario"
// que podría tener el mismo problema con $input.first()
// El problema real: en modo runOnceForEachItem, usar $input.item
// En modo runOnceForAllItems, usar $input.first()
// ========================================================
const codeNodeIdx = wf.nodes.findIndex(n => n.id === 'node-b64-to-binary');
console.log('Code node:', wf.nodes[codeNodeIdx]?.name, 'mode:', wf.nodes[codeNodeIdx]?.parameters?.mode);

// Verificar si el Whisper node existe y tiene los params correctos
const audioNodeIdx = wf.nodes.findIndex(n => n.id === 'node-transcribe-audio');
console.log('Audio node:', wf.nodes[audioNodeIdx]?.name);
console.log('Audio params:', JSON.stringify(wf.nodes[audioNodeIdx]?.parameters?.bodyParameters?.parameters, null, 2));

// Guardar y enviar
const payload = {
  name: wf.name,
  nodes: wf.nodes,
  connections: wf.connections,
  settings: wf.settings,
  staticData: wf.staticData
};

console.log('\nEnviando fix a n8n...');
const resp = await fetch(base + '/api/v1/workflows/iJkJqQsNI6u4BXu6', {
  method: 'PUT',
  headers: { 'X-N8N-API-KEY': apikey, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const result = await resp.json();
if (resp.ok) {
  const imgNodeFixed = result.nodes?.find(n => n.id === 'node-analyze-image');
  console.log('SUCCESS! Version:', result.versionId);
  console.log('Imagen node type:', imgNodeFixed?.type);
} else {
  console.error('ERROR:', resp.status, JSON.stringify(result).substring(0, 500));
}

writeFileSync('fix_done.json', JSON.stringify({
  img_node_type: wf.nodes[imgNodeIdx]?.type,
  img_node_jsonBody_preview: wf.nodes[imgNodeIdx]?.parameters?.jsonBody?.substring(0, 150),
  code_node_mode: wf.nodes[codeNodeIdx]?.parameters?.mode
}, null, 2));
