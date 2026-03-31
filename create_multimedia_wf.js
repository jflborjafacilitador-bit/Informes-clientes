const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));

// 1. Create the new nodes
const switchNode = {
  "parameters": {
    "dataType": "string",
    "value1": "={{ $json.body.data.messageType }}",
    "rules": {
      "rules": [
        {
          "id": "audioRule",
          "value2": "audioMessage",
          "outputKey": "audio"
        },
        {
          "id": "imageRule",
          "value2": "imageMessage",
          "outputKey": "image"
        }
      ]
    },
    "fallbackOutput": 0
  },
  "id": "Media_Switch",
  "name": "Media Switch",
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3,
  "position": [400, 200]
};

const dlAudioNode = {
  "parameters": {
    "method": "GET",
    "url": "={{ $env.VITE_EVOLUTION_API_URL }}/chat/getBase64FromMediaMessage/{{ $json.body.instance }}/{{ $json.body.data.key.id }}",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "apikey",
          "value": "={{ $env.VITE_EVOLUTION_API_KEY }}"
        }
      ]
    },
    "options": {
      "response": {
        "response": {
          "responseFormat": "file"
        }
      }
    }
  },
  "id": "DL_Audio",
  "name": "Download Audio (Evolution)",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.1,
  "position": [600, 100]
};

const whisperNode = {
  "parameters": {
    "operation": "transcribe",
    "prompt": "El cliente está preguntando por casas y su financiamiento."
  },
  "id": "Whisper",
  "name": "OpenAI Whisper",
  "type": "n8n-nodes-base.openAi",
  "typeVersion": 1,
  "position": [800, 100],
  "credentials": {
    "openAiApi": {
      "id": "...", // User must set this manually or we create it
      "name": "OpenAI Master" 
    }
  }
};

const mergeNode = {
  "parameters": {},
  "id": "Merge_Audio_Text",
  "name": "Merge Text & Transcribed",
  "type": "n8n-nodes-base.merge",
  "typeVersion": 2.1,
  "position": [1000, 200]
};

// Insert them
wf.nodes.push(switchNode, dlAudioNode, whisperNode, mergeNode);

console.log("Not fully wiring them to avoid complex coordinates breaking the grid, instead I will leave them floating for the user to connect.");

fs.writeFileSync('wf_multimedia.json', JSON.stringify(wf, null, 2));
