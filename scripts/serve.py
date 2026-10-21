#!/usr/bin/env python3
"""Local Casa NL server with restricted Shelly Cloud status and cover endpoints."""
import argparse
import json
import re
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1] / 'dist'
LOCK = threading.Lock()
LAST_REQUEST = 0.0

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def validate_request(data):
    if not isinstance(data, dict):
        raise ValueError('Pedido inválido.')
    host = data.get('server', '')
    if not isinstance(host, str):
        raise ValueError('Servidor inválido.')
    u = urlsplit(host)
    if u.scheme != 'https' or not re.fullmatch(r'shelly-[a-z0-9-]+\.shelly\.cloud', u.netloc, re.I) or u.path not in ('', '/') or u.query or u.fragment:
        raise ValueError('Servidor Shelly Cloud inválido.')
    key = data.get('authKey')
    if not isinstance(key, str) or not key.strip() or len(key) > 4096:
        raise ValueError('Indique a chave de autorização Shelly Cloud.')
    ids = data.get('ids')
    if not isinstance(ids, list) or not 1 <= len(ids) <= 10 or any(not isinstance(i, str) or not re.fullmatch('[a-f0-9]{6,32}', i) for i in ids):
        raise ValueError('Indique entre 1 e 10 IDs Shelly válidos.')
    return 'https://' + u.netloc.lower(), key, list(dict.fromkeys(ids))


def cloud_request(host, key, path, payload):
    global LAST_REQUEST
    # Credentials are never logged or forwarded through redirects.
    url = host + path + '?' + urlencode({'auth_key': key})
    request = Request(url, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    with LOCK:
        time.sleep(max(0, 1.05 - (time.monotonic() - LAST_REQUEST)))
        LAST_REQUEST = time.monotonic()
        with build_opener(NoRedirect).open(request, timeout=15) as response:
            if response.status != 200:
                raise ValueError('Resposta Shelly inesperada.')
            raw = response.read(2 * 1024 * 1024 + 1)
    if len(raw) > 2 * 1024 * 1024:
        raise ValueError('Resposta Shelly demasiado grande.')
    return raw


def cloud_status(data):
    host, key, ids = validate_request(data)
    result = json.loads(cloud_request(host, key, '/v2/devices/api/get', {'ids': ids, 'select': ['status']}))
    if not isinstance(result, list):
        raise ValueError('Resposta inesperada da Shelly Cloud.')
    return result


def validate_cover(data):
    if not isinstance(data, dict):
        raise ValueError('Comando inválido.')
    host, key, ids = validate_request(dict(data, ids=[data.get('id')]))
    channel, position = data.get('channel'), data.get('position')
    if isinstance(channel, bool) or not isinstance(channel, int) or not 0 <= channel <= 15:
        raise ValueError('Canal inválido.')
    valid_position = isinstance(position, str) and position in ('open', 'close', 'stop')
    valid_position |= not isinstance(position, bool) and isinstance(position, (int, float)) and 0 <= position <= 100
    if not valid_position:
        raise ValueError('Posição inválida.')
    return host, key, {'id': ids[0], 'channel': channel, 'position': position}


def cloud_cover(data):
    host, key, payload = validate_cover(data)
    # HTTP 200 is the documented acknowledgment; an empty response is valid.
    cloud_request(host, key, '/v2/devices/api/set/cover', payload)
    return {'accepted': True}


def validate_covers(data):
    if not isinstance(data, dict) or data.get('position') not in ('open', 'close'):
        raise ValueError('Comando conjunto inválido.')
    devices = data.get('devices')
    if not isinstance(devices, list) or not 1 <= len(devices) <= 4:
        raise ValueError('Indique entre 1 e 4 estores.')
    keys = []
    for device in devices:
        if not isinstance(device, dict):
            raise ValueError('Estores inválidos.')
        host, key, payload = validate_cover(dict(data, id=device.get('id'), channel=device.get('channel')))
        channel_key = f"{payload['id']}_{payload['channel']}"
        if channel_key in keys:
            raise ValueError('Estores repetidos.')
        keys.append(channel_key)
    return host, key, keys, {'cover': {'ids': keys, 'command': {'position': data['position']}}}


def cloud_covers(data):
    host, key, keys, payload = validate_covers(data)
    raw = cloud_request(host, key, '/v2/devices/api/set/groups', payload)
    result = json.loads(raw) if raw.strip() else {}
    if not isinstance(result, dict) or result.get('error') or not isinstance(result.get('failedCommands', {}), dict):
        raise ValueError('Resposta de grupo inválida.')
    failures = {str(k).lower(): v if isinstance(v, str) and re.fullmatch('[A-Z_]{1,80}', v) else 'UNCONFIRMED' for k, v in result.get('failedCommands', {}).items()}
    return {'accepted': [k for k in keys if k not in failures], 'failed': {k: failures[k] for k in keys if k in failures}}

class Handler(SimpleHTTPRequestHandler):
    def json_reply(self, status, value):
        body = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path not in ('/api/shelly/status', '/api/shelly/cover', '/api/shelly/covers'):
            return self.json_reply(404, {'error': 'Operação indisponível. Reinicie o servidor Casa NL se estiver a atualizar a aplicação.'})
        # Require same-origin JSON; third-party websites cannot submit credentials here.
        if self.headers.get('Host') not in (f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'):
            return self.json_reply(403, {'error': 'Host não autorizado.'})
        origin = self.headers.get('Origin')
        if origin and origin != 'http://' + self.headers.get('Host', ''):
            return self.json_reply(403, {'error': 'Origem não autorizada.'})
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            return self.json_reply(415, {'error': 'Formato de pedido inválido.'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 16384:
                raise ValueError('Pedido demasiado grande ou vazio.')
            data = json.loads(self.rfile.read(size))
            if self.path == '/api/shelly/status':
                self.json_reply(200, {'devices': cloud_status(data)})
            elif self.path == '/api/shelly/cover':
                self.json_reply(200, cloud_cover(data))
            else:
                self.json_reply(200, cloud_covers(data))
        except HTTPError as error:
            code = error.code
            message = 'Chave inválida ou sem autorização.' if code in (401, 403) else 'Limite de consultas atingido. Aguarde alguns segundos.' if code == 429 else 'A Shelly Cloud recusou o pedido. Verifique a ligação, modo estore, canal e calibração.'
            messages = {'DEVICE_OFFLINE': 'O estore está offline.', 'DEVICE_INVALID_MODE': 'O Shelly não está em modo estore (cover/roller).', 'DEVICE_INVALID_CHANNEL': 'O canal configurado não existe neste Shelly.', 'DEVICE_FAILED_COMMAND': 'O Shelly recusou o comando. Verifique erros e calibração na app Shelly.'}
            try:
                details = json.loads(error.read(8192))
                message = messages.get(details.get('error'), message) if isinstance(details, dict) else message
            except (ValueError, OSError):
                pass
            self.json_reply(502, {'error': message})
        except (URLError, TimeoutError, OSError):
            self.json_reply(502, {'error': 'Não foi possível contactar a Shelly Cloud. Verifique a ligação e o servidor.'})
        except (ValueError, TypeError):
            self.json_reply(400, {'error': 'Pedido ou resposta inválidos. Verifique servidor, chave e IDs.'})

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--open', action='store_true', help='Abrir a app no navegador')
    args = parser.parse_args()
    print(f'Casa NL: http://127.0.0.1:{args.port}/ (Shelly Cloud: consulta e controlo de estores)', flush=True)
    httpd = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(ROOT)))
    if args.open:
        import webbrowser
        webbrowser.open(f'http://127.0.0.1:{args.port}/')
    httpd.serve_forever()
