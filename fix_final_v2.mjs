/**
 * FIX DEFINITIVO V2:
 * Insertar un nodo Set entre "Descargar Imagen Base64" y "Analizar Imagen GPT-4o"
 * que construye la image_url completa como string.
 * Luego el HTTP Request lee ese string ya construido.
 * 
 * Esto es la forma más robusta de manejar concatenación en n8n.
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

// ============================================================
// PASO 1: Nodo "Set" que prepara la data_url de la imagen
// Se inserta ENTRE "Descargar Imagen Base64" y "Analizar Imagen GPT-4o"
// ============================================================
const setNodeExists = wf.nodes.find(n => n.id === 'node-set-image-url');
if (!setNodeExists) {
  const setNode = {
    id: 'node-set-image-url',
    name: 'Preparar URL Imagen',
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [820, 520],
    parameters: {
      mode: 'manual',
      duplicateItem: false,
      assignments: {
        assignments: [
          {
            id: 'img-data-url',
            name: 'imageDataUrl',
            value: "={{ 'data:image/jpeg;base64,' + $json.base64 }}",
            type: 'string'
          },
          {
            id: 'base64-pass',
            name: 'base64',
            value: '={{ $json.base64 }}',
            type: 'string'
          }
        ]
      },
      options: {}
    }
  };
  wf.nodes.push(setNode);
  console.log('Set node agregado');
} else {
  console.log('Set node ya existe');
}

// ============================================================
// PASO 2: Nodo "Analizar Imagen GPT-4o" (HTTP Request)
// Ahora usa {{ $json.imageDataUrl }} que ya tiene el data:image/jpeg;base64,...
// ============================================================
const imgNodeIdx = wf.nodes.findIndex(n => n.id === 'node-analyze-image');
wf.nodes[imgNodeIdx] = {
  id: 'node-analyze-image',
  name: 'Analizar Imagen GPT-4o',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [1060, 520],
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
    contentType: 'json',
    specifyBody: 'json',
    // El jsonBody se evalua como expresion completa usando ={{ }}
    // Y dentro se accede a $json.imageDataUrl que ya tiene el prefijo data:image/jpeg;base64,
    jsonBody: `={{ JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Describe brevemente esta imagen en espanol para un asesor inmobiliario. Maximo 80 palabras." },
          { type: "image_url", image_url: { url: $json.imageDataUrl } }
        ]
      }],
      max_tokens: 150
    }) }}`,
    options: {}
  }
};
console.log('HTTP Request node actualizado');

// ============================================================
// PASO 3: Actualizar conexiones para incluir el Set node
// Descargar Imagen -> Set (Preparar URL) -> Analizar Imagen GPT-4o
// ============================================================

// Buscar qué nodo conecta a Analizar Imagen actualmente
const prevConn = Object.entries(wf.connections).find(([nodeName, conn]) => {
  return conn.main?.[0]?.some(c => c.node === 'Analizar Imagen GPT-4o');
});
console.log('Conexion previa a Analizar Imagen:', prevConn?.[0]);

const sourceNode = prevConn?.[0] || 'Descargar Imagen Base64';

// Redirigir: source -> Set node -> Analizar Imagen
wf.connections[sourceNode] = {
  main: [[{ node: 'Preparar URL Imagen', type: 'main', index: 0 }]]
};
wf.connections['Preparar URL Imagen'] = {
  main: [[{ node: 'Analizar Imagen GPT-4o', type: 'main', index: 0 }]]
};

console.log('Conexiones actualizadas');
console.log('Total nodos:', wf.nodes.length);

// Enviar
const payload = {
  name: wf.name,
  nodes: wf.nodes,
  connections: wf.connections,
  settings: wf.settings,
  staticData: wf.staticData
};

console.log('\nEnviando a n8n...');
const resp = await fetch(base + '/api/v1/workflows/iJkJqQsNI6u4BXu6', {
  method: 'PUT',
  headers: { 'X-N8N-API-KEY': apikey, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
const result = await resp.json();
if (resp.ok) {
  console.log('SUCCESS! Version:', result.versionId, '| Nodos:', result.nodes?.length);
} else {
  console.error('ERROR:', resp.status, JSON.stringify(result).substring(0, 400));
}
