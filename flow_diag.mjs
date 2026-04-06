import { readFileSync, writeFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const apikey = env.match(/VITE_N8N_API_KEY=(.*)/)?.[1]?.trim();
const base = env.match(/VITE_N8N_BASE_URL=(.*)/)?.[1]?.trim();

// Buscar más execuciones - hasta 50
const r = await fetch(base + '/api/v1/executions?workflowId=iJkJqQsNI6u4BXu6&limit=50', {
  headers: { 'X-N8N-API-KEY': apikey }
});
const d = await r.json();

console.log('Total:', d.data.length);

// Buscar una ejecución donde "Descargar Audio/Imagen" o "Convertir" se ejecuten
const mediaExecs = d.data.filter(e => e.status !== undefined);

for (const exec of mediaExecs.slice(0, 15)) {
  const er = await fetch(base + '/api/v1/executions/' + exec.id + '?includeData=true', {
    headers: { 'X-N8N-API-KEY': apikey }
  });
  const ed = await er.json();
  const runData = ed.data?.resultData?.runData || {};
  const nodeNames = Object.keys(runData);
  
  // Ver si corrió Descargar o Convertir
  if (nodeNames.some(n => n.includes('Descargar') || n.includes('Convertir') || n.includes('Whisper') || n.includes('Analizar'))) {
    console.log(`\n=== EXEC ${exec.id} [${exec.status}] - TIENE MEDIA ===`);
    console.log('Nodos:', nodeNames.join(' -> '));
    
    // Obtener el webhook payload original
    const wh = runData['Webhook Evolution WhatsApp']?.[0]?.data?.main?.[0]?.[0]?.json;
    if (wh) {
      const body = wh.body;
      console.log('\n--- Webhook body.event:', body?.event);
      console.log('--- body.data.messageType:', body?.data?.messageType);
      console.log('--- body.data.message keys:', Object.keys(body?.data?.message || {}));
      const msg = body?.data?.message;
      if (msg?.audioMessage) console.log('--- audioMessage keys:', Object.keys(msg.audioMessage));
      if (msg?.imageMessage) console.log('--- imageMessage keys:', Object.keys(msg.imageMessage));
    }
    
    // Ver outputs importantes
    for (const [name, data] of Object.entries(runData)) {
      if (!name.includes('Descargar') && !name.includes('Convertir') && !name.includes('Whisper') && !name.includes('Analizar') && !name.includes('Audio') && !name.includes('Imagen')) continue;
      const nd = data[0];
      console.log(`\n[${nd.executionStatus}] ${name}`);
      if (nd.error) console.log('  ERROR:', nd.error.message, '-', nd.error.description);
      const out = nd.data?.main?.[0]?.[0]?.json;
      if (out) {
        console.log('  Output keys:', Object.keys(out));
        if (out.base64) console.log('  base64 length:', out.base64.length);
        if (out.text) console.log('  text:', out.text);
        if (out.choices) console.log('  choices[0]:', out.choices[0]?.message?.content?.substring(0, 100));
      }
    }
    break; // Solo necesitamos uno para el diagnóstico
  }
}

// Si no encontramos ejecuciones media, mostrar el payload de la última con IF
console.log('\n\n=== REVISANDO CONDICION DEL IF ¿Es Audio? ===');
const lastExec = d.data[0];
const lResult = await fetch(base + '/api/v1/executions/' + lastExec.id + '?includeData=true', {
  headers: { 'X-N8N-API-KEY': apikey }
});
const lData = await lResult.json();
const lRunData = lData.data?.resultData?.runData || {};

// Ver el output del IF de audio
const audioIfData = lRunData['¿Es Audio?'] || lRunData['Es Audio'] || 
  Object.entries(lRunData).find(([k]) => k.includes('Audio'))?.[1];

if (audioIfData?.[0]) {
  console.log('IF Audio data:', JSON.stringify(audioIfData[0]?.data?.main, null, 2).substring(0, 500));
}

// Ver el raw webhook body de la última para entender el formato
const webhookData = lRunData['Webhook Evolution WhatsApp']?.[0]?.data?.main?.[0]?.[0]?.json;
if (webhookData?.body) {
  const body = webhookData.body;
  const msg = body?.data?.message;
  console.log('\nÚltimo webhook payload:');
  console.log('  event:', body?.event);
  console.log('  messageType:', body?.data?.messageType);
  console.log('  message keys:', msg ? Object.keys(msg) : 'no message');
}

writeFileSync('flow_diag.json', JSON.stringify({
  last_webhook: lData.data?.resultData?.runData?.['Webhook Evolution WhatsApp']?.[0]?.data?.main?.[0]?.[0]?.json?.body,
  if_audio_node: lData.data?.resultData?.runData['¿Es Audio?'] || lData.data?.resultData?.runData['¿Es Audio?'] || null,
  all_nodes: Object.keys(lData.data?.resultData?.runData || {})
}, null, 2));
console.log('\nGuardado flow_diag.json');
