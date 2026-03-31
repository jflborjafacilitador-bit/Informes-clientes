const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));

// Delete existing connections from Webhook Evolution WhatsApp to AI Agent
if (wf.connections["Webhook Evolution WhatsApp"]?.main?.[0]) {
  wf.connections["Webhook Evolution WhatsApp"].main[0] = wf.connections["Webhook Evolution WhatsApp"].main[0].filter(conn => conn.node !== "AI Agent");
}
if (wf.activeVersion?.connections?.["Webhook Evolution WhatsApp"]?.main?.[0]) {
  wf.activeVersion.connections["Webhook Evolution WhatsApp"].main[0] = wf.activeVersion.connections["Webhook Evolution WhatsApp"].main[0].filter(conn => conn.node !== "AI Agent");
}

const switchNodeId = "b1f2e82b-8a1a-42c2-83bc-4b3d7d4ee2ca";
const whisperNodeId = "a11d2793-9c8a-4db3-afdf-53ec6cfddda1";
const visionNodeId = "e2c34dcb-12ef-4d6a-8d1a-3e2c1fa0eefa";

const newNodes = [
  {
    "parameters": {
      "mode": "rules",
      "rules": {
        "rules": [
          {
            "conditions": {
              "options": {
                "caseSensitive": true,
                "leftValue": "",
                "typeValidation": "strict"
              },
              "conditions": [
                {
                  "id": "e6741de7-31bb-4fde-ba4a-ff1ddbe33d6a",
                  "leftValue": "={{ $json.body.data.messageType }}",
                  "operator": {
                    "type": "string",
                    "operation": "contains",
                    "name": "filter.operator.contains"
                  },
                  "rightValue": "audio"
                }
              ],
              "combinator": "and"
            },
            "renameOutput": true,
            "outputKey": "audio"
          },
          {
            "conditions": {
              "options": {
                "caseSensitive": true,
                "leftValue": "",
                "typeValidation": "strict"
              },
              "conditions": [
                {
                  "id": "f51ad1d1-6782-4161-9fbd-c6f1406e00ca",
                  "leftValue": "={{ $json.body.data.messageType }}",
                  "operator": {
                    "type": "string",
                    "operation": "contains",
                    "name": "filter.operator.contains"
                  },
                  "rightValue": "image"
                }
              ],
              "combinator": "and"
            },
            "renameOutput": true,
            "outputKey": "image"
          }
        ]
      },
      "options": {
        "fallbackOutput": 2
      }
    },
    "id": switchNodeId,
    "name": "Media Switch",
    "type": "n8n-nodes-base.switch",
    "typeVersion": 3,
    "position": [ 400, 400 ]
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
    "position": [ 600, 300 ],
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
    "position": [ 600, 500 ],
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

// Update AI Agent to handle the branches instead
const aiAgentId = wf.nodes.find(n => n.name === "AI Agent").id;

wf.connections["Webhook Evolution WhatsApp"].main[0].push({
  "node": "Media Switch",
  "type": "main",
  "index": 0
});

wf.connections["Media Switch"] = {
  "main": [
    [ // audio
      { "node": "Whisper (Audio to Text)", "type": "main", "index": 0 }
    ],
    [ // image
      { "node": "GPT-4o Vision", "type": "main", "index": 0 }
    ],
    [ // fallback text
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

if (wf.activeVersion) {
  wf.activeVersion.connections["Webhook Evolution WhatsApp"].main[0].push({
    "node": "Media Switch",
    "type": "main",
    "index": 0
  });

  wf.activeVersion.connections["Media Switch"] = wf.connections["Media Switch"];
  wf.activeVersion.connections["Whisper (Audio to Text)"] = wf.connections["Whisper (Audio to Text)"];
  wf.activeVersion.connections["GPT-4o Vision"] = wf.connections["GPT-4o Vision"];
}

fs.writeFileSync('wf_live_v2.json', JSON.stringify(wf, null, 2));
console.log('Saved wf_live_v2.json');
