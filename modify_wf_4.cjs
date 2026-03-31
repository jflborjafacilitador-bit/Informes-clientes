const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));

// Delete existing connections from Webhook Evolution WhatsApp to AI Agent
if (wf.connections["Webhook Evolution WhatsApp"]?.main?.[0]) {
  wf.connections["Webhook Evolution WhatsApp"].main[0] = wf.connections["Webhook Evolution WhatsApp"].main[0].filter(conn => conn.node !== "AI Agent");
}
if (wf.activeVersion?.connections?.["Webhook Evolution WhatsApp"]?.main?.[0]) {
  wf.activeVersion.connections["Webhook Evolution WhatsApp"].main[0] = wf.activeVersion.connections["Webhook Evolution WhatsApp"].main[0].filter(conn => conn.node !== "AI Agent");
}

const ifAudioId = "b1f2e82b-8a1a-42c2-83bc-4b3d7d4ee2ca";
const ifImageId = "b2f2e82b-8a1a-42c2-83bc-4b3d7d4ee2cb";
const whisperNodeId = "a11d2793-9c8a-4db3-afdf-53ec6cfddda1";
const visionNodeId = "e2c34dcb-12ef-4d6a-8d1a-3e2c1fa0eefa";

const newNodes = [
  {
    "parameters": {
      "conditions": {
        "string": [
          {
            "value1": "={{ $json.body.data && $json.body.data.messageType ? $json.body.data.messageType : '' }}",
            "operation": "contains",
            "value2": "audio"
          }
        ]
      }
    },
    "id": ifAudioId,
    "name": "Is Audio?",
    "type": "n8n-nodes-base.if",
    "typeVersion": 1,
    "position": [ 300, 300 ]
  },
  {
    "parameters": {
      "conditions": {
        "string": [
          {
            "value1": "={{ $json.body.data && $json.body.data.messageType ? $json.body.data.messageType : '' }}",
            "operation": "contains",
            "value2": "image"
          }
        ]
      }
    },
    "id": ifImageId,
    "name": "Is Image?",
    "type": "n8n-nodes-base.if",
    "typeVersion": 1,
    "position": [ 400, 500 ]
  },
  {
    "parameters": {
      "model": "whisper-1",
      "binaryPropertyName": "data",
      "options": {}
    },
    "id": whisperNodeId,
    "name": "Whisper (Audio to Text)",
    "type": "n8n-nodes-base.openAi",
    "typeVersion": 1,
    "position": [ 600, 200 ],
    "credentials": {
      "openAiApi": {
        "id": "openAiApi",
        "name": "OpenAI API"
      }
    }
  },
  {
    "parameters": {
      "modelId": {
        "__rl": true,
        "value": "gpt-4o-mini",
        "mode": "list",
        "cachedResultName": "GPT-4O-MINI"
      },
      "messages": {
        "values": [
          {
            "content": "Analiza la imagen enviada por el cliente de Residencial Los Quetzales. Describe brevemente qué es (plano, fachada, boucher de pago, etc) para que el agente te lea y pueda responder.",
            "type": "text"
          },
          {
            "content": "={{ $json.body.data.message.imageMessage.url }}",
            "type": "imageUrl"
          }
        ]
      },
      "options": {}
    },
    "id": visionNodeId,
    "name": "GPT-4o Vision",
    "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
    "typeVersion": 1,
    "position": [ 600, 400 ],
    "credentials": {
      "openAiApi": {
        "id": "openAiApi",
        "name": "OpenAI API"
      }
    }
  }
];

wf.nodes.push(...newNodes);
if (wf.activeVersion) wf.activeVersion.nodes.push(...newNodes);

wf.connections["Webhook Evolution WhatsApp"].main[0].push({
  "node": "Is Audio?",
  "type": "main",
  "index": 0
});

wf.connections["Is Audio?"] = {
  "main": [
    [ // TRUE -> Audio
      { "node": "Whisper (Audio to Text)", "type": "main", "index": 0 }
    ],
    [ // FALSE -> Check Image
      { "node": "Is Image?", "type": "main", "index": 0 }
    ]
  ]
};

wf.connections["Is Image?"] = {
  "main": [
    [ // TRUE -> Image
      { "node": "GPT-4o Vision", "type": "main", "index": 0 }
    ],
    [ // FALSE -> Text (AI Agent)
      { "node": "AI Agent", "type": "main", "index": 0 }
    ]
  ]
};

// Map output from Whisper to AI Agent
wf.connections["Whisper (Audio to Text)"] = {
  "main": [
    [ { "node": "AI Agent", "type": "main", "index": 0 } ]
  ]
};

// Map output from Vision to AI Agent
wf.connections["GPT-4o Vision"] = {
  "main": [
    [ { "node": "AI Agent", "type": "main", "index": 0 } ]
  ]
};

// Safety fix for AI Agent text resolving
const aiAgent = wf.nodes.find(n => n.name === "AI Agent");
if (aiAgent) {
  aiAgent.parameters.text = `={{ $json.body?.data ? ($json.body.data.message.conversation || $json.body.data.message.extendedTextMessage?.text || "") : ($json.body?.nombre ? ("*INSTRUCCIÓN DEL SISTEMA DE ACTIVACIÓN*\\n\\nHola, da el **primer saludo** a este nuevo prospecto.\\n\\nDatos del prospecto:\\n- Nombre: " + $json.body.nombre + "\\n- Presupuesto: " + $json.body.presupuesto + "\\n- Financiamiento: " + $json.body.financiamiento + "\\n\\nMensaje base del asesor que te crió: \\"" + $json.body.welcome_message + "\\"\\n\\nInstrucción: Escribe el primer mensaje de bienvenida de tu parte. Sé muy natural, empático y menciona brevemente que tomaste nota de su información.") : ($json.text || $json.output)) }}`;
}

const sender = wf.nodes.find(n => n.name === "Send WhatsApp via Evolution API");
if (sender) {
  sender.parameters.url = `={{ 'https://n8n-prueba1-evolution-api.exigs1.easypanel.host/message/sendText/' + ($if($('Webhook Evolution WhatsApp').isExecuted, $('Webhook Evolution WhatsApp').first().json.body.instance, $('Webhook Landing Page').first().json.body.whatsapp_instance_name)) }}`;
  const numberParam = sender.parameters.bodyParameters.parameters.find(p => p.name === "number");
  if (numberParam) {
    numberParam.value = `={{ $if($('Webhook Evolution WhatsApp').isExecuted, $('Webhook Evolution WhatsApp').first().json.body.data.key.remoteJid.replace('@s.whatsapp.net', ''), $('Webhook Landing Page').first().json.body.telefono) }}`;
  }
}

if (wf.activeVersion) {
  wf.activeVersion.connections["Webhook Evolution WhatsApp"].main[0].push({
    "node": "Is Audio?",
    "type": "main",
    "index": 0
  });

  wf.activeVersion.connections["Is Audio?"] = wf.connections["Is Audio?"];
  wf.activeVersion.connections["Is Image?"] = wf.connections["Is Image?"];
  wf.activeVersion.connections["Whisper (Audio to Text)"] = wf.connections["Whisper (Audio to Text)"];
  wf.activeVersion.connections["GPT-4o Vision"] = wf.connections["GPT-4o Vision"];
  
  const activeAi = wf.activeVersion.nodes.find(n => n.name === "AI Agent");
  if (activeAi) activeAi.parameters = aiAgent.parameters;
  const activeSender = wf.activeVersion.nodes.find(n => n.name === "Send WhatsApp via Evolution API");
  if (activeSender) activeSender.parameters = sender.parameters;
}

fs.writeFileSync('wf_live_v2.json', JSON.stringify(wf, null, 2));
console.log('Modified AI Agent and generated wf_live_v2.json safely!');
