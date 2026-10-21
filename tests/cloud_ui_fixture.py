"""Isolated UI fixture: all Cloud calls are replaced; no physical devices are used."""
import importlib.util
import json
from functools import partial
from pathlib import Path

spec=importlib.util.spec_from_file_location('cloud_gateway',Path(__file__).resolve().parents[1]/'scripts'/'serve.py')
gateway=importlib.util.module_from_spec(spec)
spec.loader.exec_module(gateway)
positions={}

def no_network(*args,**kwargs):
    raise AssertionError('Outbound Cloud access is forbidden in this fixture')

def status(data):
    _,_,ids=gateway.validate_request(data)
    return [{'id':device_id,'online':1,'code':'TESTE-SIMULADO','gen':'G2','status':{'cover:0':{'state':'stopped','current_pos':positions.get(device_id+'_0',50),'pos_control':True,'apower':0,'errors':[]}}} for device_id in ids]

def command(data):
    _,_,payload=gateway.validate_cover(data)
    target=payload['position']
    if target!='stop':positions[payload['id']+'_'+str(payload['channel'])]=100 if target=='open' else 0 if target=='close' else target
    return {'accepted':True}

def group(data):
    _,_,keys,payload=gateway.validate_covers(data)
    failed={k:'DEVICE_FAILED_COMMAND' for k in keys if k.startswith('deadbeefbad0_')}
    for k in keys:
        if k not in failed:positions[k]=100 if data['position']=='open' else 0
    return {'accepted':[k for k in keys if k not in failed],'failed':failed}

gateway.cloud_request=no_network
gateway.cloud_status=status
gateway.cloud_cover=command
gateway.cloud_covers=group

# Browser adapter is confined to this test server. No Shelly request can escape.
SHIM = r'''<script>
(()=>{const original=window.fetch.bind(window);window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'?input:input.url,location.href);
 if(!url.hostname.endsWith('.shelly.cloud'))return original(input,options);
 const data=JSON.parse(options.body||'{}'),base={server:url.origin,authKey:url.searchParams.get('auth_key')};let route,payload;
 if(url.pathname==='/v2/devices/api/get'){route='status';payload={ids:data.ids}}
 else if(url.pathname==='/v2/devices/api/set/cover'){route='cover';payload=data}
 else if(url.pathname==='/v2/devices/api/set/groups'){route='covers';payload={devices:data.cover.ids.map(k=>{const i=k.lastIndexOf('_');return {id:k.slice(0,i),channel:Number(k.slice(i+1))}}),position:data.cover.command.position}}
 else throw Error('Cloud access forbidden in isolated fixture');
 const r=await original('/api/shelly/'+route,{...options,body:JSON.stringify({...base,...payload})}),result=await r.json();
 return new Response(JSON.stringify(!r.ok?result:route==='status'?result.devices:route==='covers'?{failedCommands:result.failed}:{}),{status:r.status,headers:{'Content-Type':'application/json'}});
};})();
</script>'''

class Fixture(gateway.Handler):
    def do_GET(self):
        if self.path.split('?')[0] not in ('/','/index.html'):return super().do_GET()
        body=(gateway.ROOT/'index.html').read_text().replace('<head>','<head>'+SHIM).replace('<body>','<body><div style="position:fixed;right:8px;bottom:8px;z-index:1000;background:#b03e20;color:white;padding:10px;font-size:12px;border-radius:8px;pointer-events:none">TESTE SIMULADO · sem dispositivos reais</div>').encode()
        self.send_response(200)
        self.send_header('Content-Type','text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(body)

if __name__=='__main__':
    print('Fixture SIMULADA: http://127.0.0.1:8081/ — sem acesso Cloud',flush=True)
    gateway.ThreadingHTTPServer(('127.0.0.1',8081),partial(Fixture,directory=str(gateway.ROOT))).serve_forever()
