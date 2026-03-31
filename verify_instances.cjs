const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = envFile.split('\n').reduce((acc, line) => {
  const i = line.indexOf('=');
  if (i > 0 && !line.startsWith('#')) acc[line.substring(0, i).trim()] = line.substring(i + 1).trim();
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const evolutionUrl = env['VITE_EVOLUTION_API_URL'];
const evolutionKey = env['VITE_EVOLUTION_API_KEY'];
const globalWebhookUrl = `${env['VITE_N8N_BASE_URL']}/webhook/whatsapp-agent`;


const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInstances() {
  console.log(`Checking Global Webhook: ${globalWebhookUrl}`);
  
  const { data: instances, error } = await supabase
    .from('whatsapp_instances')
    .select('*');

  if (error) {
    console.error('Error fetching Supabase instances', error);
    return;
  }

  for (let inst of instances) {
    console.log(`\n--- Instance: ${inst.instance_name} (${inst.phone_label}) ---`);
    console.log(`Supabase Status: ${inst.status}`);
    console.log(`Assigned User ID: ${inst.assigned_user_id}`);
    console.log(`AI Enabled: ${inst.ai_enabled}`);
    console.log(`Context matches default length? ${inst.llms_context?.length > 100 ? 'YES' : 'NO'} (${inst.llms_context?.substring(0, 50)}...)`);

    // Fetch Webhook from Evolution
    try {
      const res = await fetch(`${evolutionUrl}/webhook/find/${inst.instance_name}`, {
        headers: { 'apikey': evolutionKey }
      });
      const webhookData = await res.json();
      console.log(`Evolution Webhook configured:`, webhookData?.url || 'NONE');
      
      if (webhookData?.url !== globalWebhookUrl) {
          console.log(`[ACTION NEEDED] Expected ${globalWebhookUrl} but found ${webhookData?.url}`);
          // Update it automatically!
          console.log(`Updating Webhook to new Global URL...`);
          const updateRes = await fetch(`${evolutionUrl}/webhook/set/${inst.instance_name}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
              body: JSON.stringify({
                  url: globalWebhookUrl,
                  webhookByEvents: false,
                  webhookBase64: false,
                  events: ["MESSAGES_UPSERT"]
              })
          });
          const updateJson = await updateRes.json();
          console.log(`Update Result:`, updateJson?.message || 'Success');
      } else {
          console.log(`[OK] Webhook is perfectly aligned with Master Ecosystem.`);
      }

    } catch (e) {
      console.error('Error contacting Evolution API', e.message);
    }
  }
}

checkInstances();
