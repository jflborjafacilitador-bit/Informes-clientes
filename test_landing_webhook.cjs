// test_landing_webhook.cjs
const n8nUrl = 'https://n8n-prueba1-n8n.exigs1.easypanel.host';

async function test() {
    console.log("Sending test payload to Landing Webhook...");
    const res = await fetch(`${n8nUrl}/webhook/landing-agent`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            nombre: "Test User Lead",
            correo: "test@lead.com",
            telefono: "5215555555555",
            presupuesto: "1 a 2 millones",
            financiamiento: "Infonavit",
            asesor_id: "5ada3635-c38d-4ba6-af62-a5eac552086c",
            asesor_name: "Asesor Demo",
            whatsapp_instance_id: null,
            whatsapp_instance_name: "admin-prueba",
            welcome_message: "Test message from landing"
        })
    });
    console.log("Response ST:", res.status);
    console.log("Body:", await res.text());
}
test();
