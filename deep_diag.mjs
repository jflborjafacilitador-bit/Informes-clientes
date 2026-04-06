/**
 * DIAGNÓSTICO PROFUNDO - Audio e Imagen en n8n
 * Obtiene la última ejecución con media y analiza CADA nodo
 */
import { readFileSync, writeFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const apikey = env.match(/VITE_N8N_API_KEY=(.*)/)?.[1]?.trim();
const base = env.match(/VITE_N8N_BASE_URL=(.*)/)?.[1]?.trim();

const r = await fetch(base + '/api/v1/executions?workflowId=iJkJqQsNI6u4BXu6&limit=30', {
  headers: { 'X-N8N-API-KEY': apikey }
});
const d = await r.json();

// Encontrar ejecuciones con nodos de media
const mediaExecs = d.data.filter(e => {
  // filtramos por fechas recientes o status error
  return true; // obtenemos todas y filtramos despues
});

console.log('Total executions found:', d.data.length);

// Analizar las últimas 5
const report = [];
for (const exec of d.data.slice(0, 8)) {
  const er = await fetch(base + '/api/v1/executions/' + exec.id + '?includeData=true', {
    headers: { 'X-N8N-API-KEY': apikey }
  });
  const ed = await er.json();
  const runData = ed.data?.resultData?.runData || {};
  const nodeNames = Object.keys(runData);
  
  const hasMedia = nodeNames.some(n => 
    n.includes('Audio') || n.includes('Imagen') || n.includes('Binario') || n.includes('Whisper')
  );
  
  if (!hasMedia) continue;
  
  const entry = {
    id: exec.id,
    status: exec.status,
    startedAt: exec.startedAt,
    nodes: {}
  };
  
  // Analizar cada nodo relevante
  for (const [nodeName, nodeData] of Object.entries(runData)) {
    if (!nodeData?.[0]) continue;
    const nd = nodeData[0];
    entry.nodes[nodeName] = {
      status: nd.executionStatus,
      error: nd.error?.message,
      // Output del nodo
      output_keys: nd.data?.main?.[0]?.[0]?.json ? Object.keys(nd.data.main[0][0].json) : [],
      // Para nodos específicos extraer data clave
      ...(nodeName.includes('Whisper') && {
        whisper_text: nd.data?.main?.[0]?.[0]?.json?.text
      }),
      ...(nodeName.includes('Analizar') && {
        gpt_response: nd.data?.main?.[0]?.[0]?.json?.choices?.[0]?.message?.content?.substring(0, 200),
        gpt_error: nd.data?.main?.[0]?.[0]?.json?.error
      }),
      ...(nodeName.includes('AI Agent') && {
        agent_input_text: nd.data?.main?.[0]?.[0]?.json?.input?.substring?.(0, 200) || '(no input field)',
        agent_output: nd.data?.main?.[0]?.[0]?.json?.output?.substring?.(0, 200)
      }),
      ...(nodeName.includes('Download') || nodeName.includes('Descargar') && {
        has_base64: !!nd.data?.main?.[0]?.[0]?.json?.base64,
        base64_len: nd.data?.main?.[0]?.[0]?.json?.base64?.length
      }),
      ...(nodeName.includes('Binario') && {
        has_binary: !!nd.data?.main?.[0]?.[0]?.binary,
        binary_keys: nd.data?.main?.[0]?.[0]?.binary ? Object.keys(nd.data.main[0][0].binary) : []
      })
    };
  }
  
  report.push(entry);
}

writeFileSync('deep_diag.json', JSON.stringify(report, null, 2));
console.log('\n=== REPORTE DE NODOS CON MEDIA ===\n');
for (const exec of report) {
  console.log(`\nExec ${exec.id} [${exec.status}] ${exec.startedAt}`);
  console.log('Nodos ejecutados:', Object.keys(exec.nodes).join(' -> '));
  for (const [name, data] of Object.entries(exec.nodes)) {
    console.log(`  [${data.status || 'ok'}] ${name}`);
    if (data.error) console.log(`    ERROR: ${data.error}`);
    if (data.whisper_text !== undefined) console.log(`    Transcripcion: "${data.whisper_text}"`);
    if (data.gpt_response !== undefined) console.log(`    GPT Vision: "${data.gpt_response}"`);
    if (data.gpt_error !== undefined) console.log(`    GPT Error: ${JSON.stringify(data.gpt_error)}`);
    if (data.has_base64 !== undefined) console.log(`    Base64: ${data.has_base64} (len=${data.base64_len})`);
    if (data.has_binary !== undefined) console.log(`    Binary: ${data.has_binary} keys=${data.binary_keys}`);
    if (data.agent_input_text) console.log(`    Agent INPUT: "${data.agent_input_text}"`);
    if (data.agent_output) console.log(`    Agent OUTPUT: "${data.agent_output}"`);
    if (data.output_keys?.length) console.log(`    Output keys: ${data.output_keys.join(', ')}`);
  }
}
