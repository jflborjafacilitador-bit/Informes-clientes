import { readFileSync, writeFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const apikey = env.match(/VITE_N8N_API_KEY=(.*)/)?.[1]?.trim();
const base = env.match(/VITE_N8N_BASE_URL=(.*)/)?.[1]?.trim();

const r = await fetch(base + '/api/v1/workflows/iJkJqQsNI6u4BXu6', {
  headers: { 'X-N8N-API-KEY': apikey }
});
const wf = await r.json();

// Mostrar todos los nodos con sus IDs y nombres
console.log('=== NODOS ===');
wf.nodes.forEach((n, i) => {
  console.log(i, `"${n.name}"`, n.id || '(no id)', n.type);
});

// Mostrar todas las conexiones
console.log('\n=== CONEXIONES ===');
Object.entries(wf.connections).forEach(([from, conn]) => {
  conn.main?.forEach((outputs, outputIdx) => {
    outputs?.forEach(c => {
      console.log(`  "${from}" -> "${c.node}"`);
    });
  });
});

// Nodo imagen específico
const imgNode = wf.nodes.find(n => n.name?.includes('Imagen GPT') || n.name?.includes('Analizar Imagen'));
if (imgNode) {
  console.log('\n=== NODO IMAGEN GPT-4o ===');
  console.log('ID:', imgNode.id);
  console.log('Type:', imgNode.type);
  console.log('Params:', JSON.stringify(imgNode.parameters, null, 2).substring(0, 1000));
}

// Nodo codigo audio
const codeNode = wf.nodes.find(n => n.name?.includes('Convertir') || n.name?.includes('Base64'));
if (codeNode) {
  console.log('\n=== NODO AUDIO CODE ===');
  console.log('ID:', codeNode.id);
  console.log('Mode:', codeNode.parameters?.mode);
  console.log('Code preview:', codeNode.parameters?.jsCode?.substring(0, 300));
}

// Nodo Whisper
const whisperNode = wf.nodes.find(n => n.name?.includes('Whisper') || n.name?.includes('Transcribir'));
if (whisperNode) {
  console.log('\n=== NODO WHISPER ===');
  console.log('ID:', whisperNode.id);
  console.log('Type:', whisperNode.type);
  console.log('Params:', JSON.stringify(whisperNode.parameters, null, 2).substring(0, 800));
}

// Nodo Descargar Imagen
const dlImg = wf.nodes.find(n => n.name?.includes('Descargar Imagen') || n.name?.includes('Download Imagen'));
if (dlImg) {
  console.log('\n=== NODO DESCARGAR IMAGEN ===');
  console.log('ID:', dlImg.id);
  console.log('Type:', dlImg.type);
  console.log('Code:', dlImg.parameters?.jsCode?.substring(0, 500));
}

// Guardar para analisis
writeFileSync('wf_inspect.json', JSON.stringify({
  nodes: wf.nodes.map(n => ({id: n.id, name: n.name, type: n.type})),
  connections: wf.connections,
  img_node_params: imgNode?.parameters,
  code_node_params: codeNode ? {mode: codeNode.parameters?.mode, code: codeNode.parameters?.jsCode} : null,
  whisper_params: whisperNode?.parameters.bodyParameters || whisperNode?.parameters
}, null, 2));
console.log('\nGuardado en wf_inspect.json');
