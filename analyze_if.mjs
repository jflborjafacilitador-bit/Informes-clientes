import { readFileSync, writeFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const apikey = env.match(/VITE_N8N_API_KEY=(.*)/)?.[1]?.trim();
const base = env.match(/VITE_N8N_BASE_URL=(.*)/)?.[1]?.trim();

// Obtener las últimas 50 ejecuciones con IDs
const r = await fetch(base + '/api/v1/executions?workflowId=iJkJqQsNI6u4BXu6&limit=50', {
  headers: { 'X-N8N-API-KEY': apikey }
});
const d = await r.json();

// Ejecuciones con error o que llegaron a Descargar
let mediaExecId = null;
for (const exec of d.data) {
  if (exec.status === 'error') {
    const er = await fetch(base + '/api/v1/executions/' + exec.id + '?includeData=true', {
      headers: { 'X-N8N-API-KEY': apikey }
    });
    const ed = await er.json();
    const runData = ed.data?.resultData?.runData || {};
    const hasMedia = Object.keys(runData).some(n => 
      n.includes('Descargar') || n.includes('Whisper') || n.includes('Convertir'));
    if (hasMedia) {
      mediaExecId = exec.id;
      // Obtener el webhook payload completo
      const webhookBody = runData['Webhook Evolution WhatsApp']?.[0]?.data?.main?.[0]?.[0]?.json?.body;
      const errorNode = ed.data?.resultData?.error;
      
      console.log(`\n=== EXEC ${exec.id} (media execution) ===`);
      console.log('event:', webhookBody?.event);
      console.log('messageType:', webhookBody?.data?.messageType);
      console.log('message keys:', Object.keys(webhookBody?.data?.message || {}));
      
      const msg = webhookBody?.data?.message;
      if (msg?.audioMessage) {
        console.log('audioMessage:', JSON.stringify(msg.audioMessage, null, 2).substring(0, 400));
      }
      if (msg?.imageMessage) {
        console.log('imageMessage:', JSON.stringify(msg.imageMessage, null, 2).substring(0, 400));
      }
      
      console.log('\nNodos ejecutados:', Object.keys(runData).join(' -> '));
      
      // Ver qué pasa en el nodo IF audio
      const audioIfKey = Object.keys(runData).find(k => k.includes('Audio') && k.includes('Es'));
      if (audioIfKey) {
        const ifData = runData[audioIfKey][0];
        console.log(`\nIF Audio (${audioIfKey}):`, ifData.executionStatus);
        console.log('IF output main[0]:', JSON.stringify(ifData.data?.main?.[0]?.length));
        console.log('IF output main[1]:', JSON.stringify(ifData.data?.main?.[1]?.length));
      }
      
      // Ver nodo Descargar
      const dlKey = Object.keys(runData).find(k => k.includes('Descargar'));
      if (dlKey) {
        const dlData = runData[dlKey][0];
        console.log(`\nDescargar (${dlKey}):`, dlData.executionStatus);
        if (dlData.error) console.log('Error:', dlData.error.message, dlData.error.description);
        const out = dlData.data?.main?.[0]?.[0]?.json;
        if (out) {
          console.log('Output keys:', Object.keys(out));
          if (out.base64) console.log('base64 length:', out.base64.length);
        }
      }
      
      // Ver todos los nodos con error
      for (const [name, nodeRuns] of Object.entries(runData)) {
        if (nodeRuns[0]?.error) {
          console.log(`\nERROR en [${name}]:`, nodeRuns[0].error.message);
          console.log('  description:', nodeRuns[0].error.description?.substring(0, 300));
        }
      }
      
      writeFileSync('media_exec_full.json', JSON.stringify({
        id: exec.id,
        webhook_body: webhookBody,
        nodes: Object.fromEntries(Object.entries(runData).map(([k,v]) => [k, {
          status: v[0]?.executionStatus,
          error: v[0]?.error?.message,
          output_json: v[0]?.data?.main?.[0]?.[0]?.json,
          output_binary_keys: v[0]?.data?.main?.[0]?.[0]?.binary ? Object.keys(v[0].data.main[0][0].binary) : null
        }]))
      }, null, 2));
      
      break;
    }
  }
}

if (!mediaExecId) {
  console.log('No se encontro ejecucion con media. Busca errores en el IF condition');
  
  // Ver el WORKFLOW actual para entender qué condición usa el IF
  const wfR = await fetch(base + '/api/v1/workflows/iJkJqQsNI6u4BXu6', {
    headers: { 'X-N8N-API-KEY': apikey }
  });
  const wf = await wfR.json();
  
  const audioIfNode = wf.nodes.find(n => n.name?.includes('Audio') && n.type?.includes('if'));
  const imgIfNode = wf.nodes.find(n => n.name?.includes('Imagen') && n.type?.includes('if'));
  
  console.log('IF Audio node:', JSON.stringify(audioIfNode?.parameters, null, 2));
  console.log('IF Imagen node:', JSON.stringify(imgIfNode?.parameters, null, 2));
  
  // Mostrar todos los nodos para ver sus tipos
  wf.nodes.forEach(n => {
    if (n.name?.includes('Audio') || n.name?.includes('Imagen') || n.name?.includes('Es ')) {
      console.log(`\nNodo: "${n.name}" tipo: ${n.type}`);
      console.log('Params:', JSON.stringify(n.parameters, null, 2).substring(0, 500));
    }
  });
}
