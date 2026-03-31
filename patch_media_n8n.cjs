const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));

// 1. Reubicar "AI Agent" más a la derecha para dejar espacio
const aiNode = wf.nodes.find(n => n.name === 'AI Agent');
if (aiNode && aiNode.position) {
  aiNode.position[0] += 600; // Move it to the right
}

// 2. Crear los nuevos nodos

const mediaSwitch = {
  "parameters": {
    "dataType": "string",
    "value1": "={{ $json.body.data.message.messageType }}",
    "rules": {
      "rules": [
        {
          "id": "270ad377-ad6d-426b-8cf7-23f46f4eb14b",
          "value2": "audioMessage",
          "outputKey": "audio"
        },
        {
          "id": "40203f19-9745-42cf-bb13-3ff135f60d69",
          "value2": "imageMessage",
          "outputKey": "image"
        }
      ]
    },
    "fallbackOutput": 0
  },
  "id": "media-switch-id",
  "name": "Filtrar Multimedia",
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3,
  "position": [
    aiNode.position[0] - 500,
    aiNode.position[1]
  ]
};

// 3. Modificar las conexiones: 
// Lo que iba a AI Agent (desde ¿IA Encendida?) ahora va a Filtrar Multimedia.
if (wf.connections['¿IA Encendida?'] && wf.connections['¿IA Encendida?']['main'] && wf.connections['¿IA Encendida?']['main'][0]) {
  const encendidaOutputs = wf.connections['¿IA Encendida?']['main'][0];
  const toDeleteIndex = encendidaOutputs.findIndex(co => co.node === 'AI Agent');
  
  if (toDeleteIndex > -1) {
    encendidaOutputs.splice(toDeleteIndex, 1);
    encendidaOutputs.push({
      "node": "Filtrar Multimedia",
      "type": "main",
      "index": 0
    });
  }
}

// Conectar Filtrar Multimedia -> AI Agent (Fallback: Text)
wf.connections['Filtrar Multimedia'] = {
  "main": [
    // [0] Text (Fallback)
    [
      {
        "node": "AI Agent",
        "type": "main",
        "index": 0
      }
    ],
    // [1] Audio rule
    [],
    // [2] Image rule
    []
  ]
};

// Agregar un nodo para recordarle al usuario configurar Whisper/Vision visualmente
const noteNode = {
  "parameters": {
    "content": "## Notas de Multimedia\nAquí se derivarán los Audios e Imágenes.\nAñade tus nodos de OpenAI (Whisper y Vision) en las salidas 1 y 2 de este Switch y conéctalos de vuelta al AI Agent.",
    "height": 200,
    "width": 300,
    "color": 6
  },
  "type": "n8n-nodes-base.stickyNote",
  "position": [
    aiNode.position[0] - 500,
    aiNode.position[1] - 250
  ],
  "name": "Note_Media",
  "typeVersion": 1,
  "id": "note-media-id"
};

wf.nodes.push(mediaSwitch, noteNode);

fs.writeFileSync('wf_multimedia.json', JSON.stringify(wf, null, 2));
console.log("wf_multimedia.json creado exitosamente");
