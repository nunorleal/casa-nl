import importlib.util
import io
import json
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

spec = importlib.util.spec_from_file_location('casa_server', Path(__file__).resolve().parents[1] / 'scripts' / 'serve.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

class GatewayTests(unittest.TestCase):
    def request(self, **kwargs):
        return dict(server='https://shelly-1-eu.shelly.cloud', authKey='FAKE-TEST-KEY', ids=['aabbcc112233'], **kwargs)

    def test_validation_and_no_arbitrary_credential_destination(self):
        value = self.request()
        for host in ['http://shelly-1-eu.shelly.cloud', 'https://evil.test', 'https://shelly-1-eu.shelly.cloud.evil.test', 'https://user@shelly-1-eu.shelly.cloud', 'https://shelly-1-eu.shelly.cloud:9999', 'https://shelly-1-eu.shelly.cloud/?key=x']:
            with self.assertRaises(ValueError): server.validate_request(dict(value, server=host))
        for ids in [[], ['invalid!'], ['aabbcc'] * 11]:
            with self.assertRaises(ValueError): server.validate_request(dict(value, ids=ids))
        self.assertEqual(server.validate_request(value)[2], ['aabbcc112233'])

    def test_cloud_request_is_read_only_batched_and_redirects_disabled(self):
        opener = MagicMock()
        opener.open.return_value.__enter__.return_value.status = 200
        opener.open.return_value.__enter__.return_value.read.return_value = b'[{"id":"aabbcc112233","online":1}]'
        with patch.object(server, 'build_opener', return_value=opener) as build, patch.object(server.time, 'sleep'):
            result = server.cloud_status(self.request())
        request = opener.open.call_args[0][0]
        self.assertIn('/v2/devices/api/get?', request.full_url)
        self.assertEqual(json.loads(request.data), {'ids':['aabbcc112233'], 'select':['status']})
        self.assertEqual(result[0]['online'], 1)
        self.assertIs(build.call_args[0][0], server.NoRedirect)

    def handler(self, path, origin='http://127.0.0.1:8080', host='127.0.0.1:8080', content_type='application/json'):
        h = object.__new__(server.Handler)
        body = json.dumps(self.request()).encode()
        h.path = path
        h.headers = {'Host':host,'Origin':origin,'Content-Type':content_type,'Content-Length':str(len(body))}
        h.server = MagicMock(server_port=8080)
        h.rfile = io.BytesIO(body)
        h.json_reply = MagicMock()
        return h

    def test_only_status_endpoint_and_same_origin_json_are_accepted(self):
        for path, origin, host, content_type, expected in [('/api/shelly/control','http://127.0.0.1:8080','127.0.0.1:8080','application/json',404),('/api/shelly/status','https://evil.test','127.0.0.1:8080','application/json',403),('/api/shelly/status','http://evil.test','evil.test','application/json',403),('/api/shelly/status','http://127.0.0.1:8080','127.0.0.1:8080','text/plain',415)]:
            h = self.handler(path, origin, host, content_type)
            with patch.object(server, 'cloud_status') as cloud: h.do_POST();cloud.assert_not_called()
            self.assertEqual(h.json_reply.call_args[0][0],expected)

    def test_proxy_success_and_generic_errors_never_leak_credentials(self):
        h = self.handler('/api/shelly/status')
        with patch.object(server, 'cloud_status', return_value=[]): h.do_POST()
        h.json_reply.assert_called_with(200, {'devices':[]})
        with patch.object(server, 'cloud_status', side_effect=server.URLError('FAKE-TEST-KEY')): h.do_POST()
        self.assertNotIn('FAKE-TEST-KEY',str(h.json_reply.call_args))

    def test_cover_commands_validate_channel_position_and_destination(self):
        base = dict(self.request(), id='aabbcc112233', channel=0, position='open')
        for position in ['open','close','stop',0,50,100,33.5]:
            self.assertEqual(server.validate_cover(dict(base,position=position))[2]['position'],position)
        for position in [-1,101,True,None,'toggle',float('nan')]:
            with self.assertRaises(ValueError): server.validate_cover(dict(base,position=position))
        for channel in [-1,16,True,0.5,None]:
            with self.assertRaises(ValueError): server.validate_cover(dict(base,channel=channel))
        with self.assertRaises(ValueError): server.validate_cover(dict(base,server='https://evil.test'))

    def test_cover_uses_only_dedicated_endpoint_and_accepts_empty_200(self):
        opener=MagicMock()
        opener.open.return_value.__enter__.return_value.status=200
        opener.open.return_value.__enter__.return_value.read.return_value=b''
        with patch.object(server,'build_opener',return_value=opener), patch.object(server.time,'sleep'):
            result=server.cloud_cover(dict(self.request(),id='aabbcc112233',channel=0,position=50))
        self.assertTrue(result['accepted'])
        request=opener.open.call_args[0][0]
        self.assertIn('/v2/devices/api/set/cover?',request.full_url)
        self.assertEqual(json.loads(request.data),{'id':'aabbcc112233','channel':0,'position':50})

    def test_status_route_never_calls_cover_and_cover_route_is_explicit(self):
        h=self.handler('/api/shelly/status')
        with patch.object(server,'cloud_status',return_value=[]),patch.object(server,'cloud_cover') as cover:
            h.do_POST();cover.assert_not_called()
        h=self.handler('/api/shelly/cover')
        with patch.object(server,'cloud_cover',return_value={'accepted':True}) as cover:
            h.do_POST();cover.assert_called_once()
        h.json_reply.assert_called_with(200,{'accepted':True})

    def test_group_validates_ids_channels_limit_and_action(self):
        base=dict(self.request(),devices=[{'id':'aabbcc112233','channel':0},{'id':'aabbcc112233','channel':1}],position='close')
        _,_,keys,payload=server.validate_covers(base)
        self.assertEqual(keys,['aabbcc112233_0','aabbcc112233_1'])
        self.assertEqual(payload,{'cover':{'ids':keys,'command':{'position':'close'}}})
        for action in ['toggle',50,True,None]:
            with self.assertRaises(ValueError):server.validate_covers(dict(base,position=action))
        for devices in [[],base['devices']*3,[base['devices'][0]]*2,[{'id':'bad!','channel':0}],[{'id':'aabbcc112233','channel':True}]]:
            with self.assertRaises(ValueError):server.validate_covers(dict(base,devices=devices))

    def test_group_maps_partial_failures_to_exact_channels(self):
        base=dict(self.request(),devices=[{'id':'aabbcc112233','channel':0},{'id':'aabbcc112233','channel':1}],position='open')
        with patch.object(server,'cloud_request',return_value=b'{"failedCommands":{"AABBCC112233_1":"DEVICE_OFFLINE"}}') as upstream:
            result=server.cloud_covers(base)
        self.assertEqual(upstream.call_args[0][2],'/v2/devices/api/set/groups')
        self.assertEqual(result,{'accepted':['aabbcc112233_0'],'failed':{'aabbcc112233_1':'DEVICE_OFFLINE'}})
        with patch.object(server,'cloud_request',return_value=b''):
            self.assertEqual(server.cloud_covers(base)['accepted'],['aabbcc112233_0','aabbcc112233_1'])
        for raw in [b'[]',b'{"failedCommands":[]}',b'{"error":"BAD_REQUEST"}',b'invalid']:
            with patch.object(server,'cloud_request',return_value=raw),self.assertRaises(ValueError):server.cloud_covers(base)

    def test_group_route_is_explicit_and_status_never_moves_devices(self):
        h=self.handler('/api/shelly/covers')
        with patch.object(server,'cloud_covers',return_value={'accepted':[],'failed':{}}) as covers:
            h.do_POST();covers.assert_called_once()
        h=self.handler('/api/shelly/status')
        with patch.object(server,'cloud_status',return_value=[]),patch.object(server,'cloud_covers') as covers:
            h.do_POST();covers.assert_not_called()

if __name__ == '__main__': unittest.main()
