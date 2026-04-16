const fs = require('fs');
const wfPath = 'C:\\\\Users\\\\Latitude\\\\.gemini\\\\antigravity\\\\brain\\\\b4e65b0f-0900-42e1-8f46-958e3cad77b3\\\\.system_generated\\\\steps\\\\1332\\\\output.txt';

let data = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
let wf = data.data;

// Nodes to delete
const nodesToDelete = new Set([
  'Get Lead (Texto)', 'Update Lead ia_ativa (Texto)',
  'Get Lead (Áudio)', 'Update Lead ia_ativa (Áudio)',
  'Get Lead (Imagem)', 'Update Lead ia_ativa (Imagem)',
  'Get Lead (Vídeo)', 'Update Lead ia_ativa (Vídeo)',
  'Get Lead (PDF)', 'Update Lead ia_ativa (PDF)'
]);

wf.nodes = wf.nodes.filter(n => !nodesToDelete.has(n.name));

// Change references from $('Get Lead (XXX)').item.json[0].telefone to $('dados').item.json.telefone
// or $('dados').item.json.telefone.replace('@s.whatsapp.net','') for Redis

wf.nodes.forEach(n => {
  if (n.name.startsWith('envia_')) {
    // n.parameters.bodyParameters.parameters[0] is "number"
    const param = n.parameters.bodyParameters.parameters.find(p => p.name === 'number');
    if (param) param.value = "={{ $('dados').item.json.telefone }}";
  }

  if (n.name.startsWith('Redis Bloqueia')) {
    n.parameters.key = "={{ String($('dados').item.json.telefone).replace('@s.whatsapp.net', '') }}_bloqueioPermanente";
  }
});

// Fix connections
let newConns = {};

for (const [sourceNode, targetsObj] of Object.entries(wf.connections)) {
  if (nodesToDelete.has(sourceNode)) continue;
  
  newConns[sourceNode] = { main: [] };
  
  let targetArr = targetsObj.main[0];
  let newTargetArr = [];
  
  for (const t of targetArr) {
    if (nodesToDelete.has(t.node)) {
      // Find what the deleted node was connected to!
      // 'Switch Tipo' -> 'Get Lead (XXX)' -> 'envia_xxx'
      // If we are 'Switch Tipo', and target is 'Get Lead (Texto)', we want to connect to 'envia_texto'.
    } else {
      newTargetArr.push(t);
    }
  }

  if (newTargetArr.length > 0) {
    newConns[sourceNode].main.push(newTargetArr);
  }
}

// Manually map Switch Tipo outputs
newConns['Switch Tipo'] = {
  main: [
    [{ "node": "envia_texto", "type": "main", "index": 0 }],
    [{ "node": "envia_audio", "type": "main", "index": 0 }],
    [{ "node": "envia_imagem", "type": "main", "index": 0 }],
    [{ "node": "envia_video", "type": "main", "index": 0 }],
    [{ "node": "envia_pdf", "type": "main", "index": 0 }]
  ]
};

// Map Redis -> Respond
newConns['Redis Bloqueia (Texto)'] = { main: [[ { "node": "Respond Texto", "type": "main", "index": 0 } ]] };
newConns['Redis Bloqueia (Áudio)'] = { main: [[ { "node": "Respond Áudio", "type": "main", "index": 0 } ]] };
newConns['Redis Bloqueia (Imagem)'] = { main: [[ { "node": "Respond Imagem", "type": "main", "index": 0 } ]] };
newConns['Redis Bloqueia (Vídeo)'] = { main: [[ { "node": "Respond Vídeo", "type": "main", "index": 0 } ]] };
newConns['Redis Bloqueia (PDF)'] = { main: [[ { "node": "Respond PDF", "type": "main", "index": 0 } ]] };

wf.connections = newConns;

fs.writeFileSync('C:\\\\Users\\\\Latitude\\\\.gemini\\\\antigravity\\\\brain\\\\b4e65b0f-0900-42e1-8f46-958e3cad77b3\\\\modified_wf.json', JSON.stringify({
  nodes: wf.nodes,
  connections: wf.connections
}, null, 2));

console.log("Written!");
