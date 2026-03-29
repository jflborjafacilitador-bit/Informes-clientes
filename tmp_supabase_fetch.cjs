const url = "https://mxucntphfihiyctxiffs.supabase.co/rest/v1/whatsapp_instances?select=*";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14dWNudHBoZmloaXljdHhpZmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTI0NjgsImV4cCI6MjA4ODE2ODQ2OH0.O8laFOL5q-J5f5qIAN1TenRa2Ax2U53XIxR-VOw4LZY";

fetch(url, {
  headers: {
    "apikey": key,
    "Authorization": "Bearer " + key
  }
}).then(r => r.json()).then(d => {
  console.log("Instancias en BDD:");
  console.log(JSON.stringify(d, null, 2));
}).catch(console.error);
