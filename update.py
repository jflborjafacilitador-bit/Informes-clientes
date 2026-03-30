import urllib.request
import json
import ssl

url = "https://n8n-prueba1-n8n.exigs1.easypanel.host/api/v1/workflows/oghw8BC3dUj9pZC1"
apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2YxZDc1OC1hN2FmLTRhZjctOGNiZS1hYjE3MDhiZjZiM2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Nzc1ODY5fQ.cqJogn3Ry2s2087tLADI0UFSzjBX1Lw6t4drV3ekNXI"
headers = {"X-N8N-API-KEY": apikey, "Content-Type": "application/json"}
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req_get = urllib.request.Request(url, headers=headers, method="GET")
with urllib.request.urlopen(req_get, context=ctx) as r:
    wf = json.loads(r.read().decode())

for node in wf["nodes"]:
    if node["name"] == "Enviar WhatsApp":
        # Fijar el cuerpo del mensaje de forma robusta
        node["parameters"]["jsonBody"] = "={\n  \"number\": \"{{$json.phone}}\",\n  \"options\": {\n    \"delay\": 1500,\n    \"presence\": \"composing\"\n  },\n  \"text\": \"{{$json.responseText}}\"\n}"

for key in ["id", "createdAt", "updatedAt"]:
    if key in wf:
        del wf[key]

req_put = urllib.request.Request(url, data=json.dumps(wf).encode(), headers=headers, method="PUT")
with urllib.request.urlopen(req_put, context=ctx) as r:
    print("STATUS", r.status)
