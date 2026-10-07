"""Offline syntax/security checks only: never execute production/install/model commands."""
import ast
import json
from pathlib import Path
import re
import shlex
import subprocess
import sys
import tomllib
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
checks = []
python_sources = []

def shell(text, location):
    result = subprocess.run(['/bin/bash', '-n'], input=text, text=True, capture_output=True)
    assert result.returncode == 0, (location, result.stderr)
    checks.append({'location': location, 'intent': 'syntax only; not executed', 'kind': 'bash'})
    words = shlex.split(text)
    if words[:2] == ['python3', '-c']:
        ast.parse(words[2])
        python_sources.append(words[2])

def walk(value, location):
    if isinstance(value, dict):
        for key, child in value.items():
            if key == 'cmd': shell(child, location + '/cmd')
            elif key == 'commands':
                for i, command in enumerate(child): shell(command, f'{location}/commands/{i}')
            else: walk(child, location + '/' + key)
    elif isinstance(value, list):
        for i, child in enumerate(value): walk(child, f'{location}/{i}')

for filename in ['src/default-data.json', 'public/data/default-data.json', 'src/weekly-002.json']:
    walk(json.loads((ROOT / filename).read_text()), filename)
posts = json.loads((ROOT / 'public/data/posts.json').read_text())
for post in posts:
    for i, match in enumerate(re.finditer(r'```([^\n]*)\n(.*?)\n```', post['content'], re.S)):
        kind, content = match.groups()
        location = post['slug'] + f'/fence/{i}'
        if kind == 'bash': shell(content, location)
        elif kind == 'toml': tomllib.loads(content)
        elif kind == 'json': json.loads(content)
        elif kind == 'yaml':
            result = subprocess.run(['ruby', '-ryaml', '-e', 'YAML.safe_load(STDIN.read)'], input=content, text=True, capture_output=True)
            assert result.returncode == 0, (location, result.stderr)
        if kind != 'bash': checks.append({'location': location, 'intent': 'parse/review only; not deployment', 'kind': kind})

# Extract the actual printed program's redirect handler and exercise it without networking.
for source in python_sources:
    tree = ast.parse(source)
    handler = next(n for n in tree.body if isinstance(n, ast.ClassDef))
    namespace = {'urllib': __import__('urllib')}
    exec(compile(ast.Module(body=[handler], type_ignores=[]), '<offline-handler>', 'exec'), namespace)
    req = urllib.request.Request('https://api.openai.com/v1/models', headers={'Authorization': 'Bearer TEST-ONLY-KEY'})
    for destination in ['https://example.invalid/steal', 'https://api.openai.com/other', 'http://api.openai.com/']:
        try:
            namespace['NoRedirect']().redirect_request(req, None, 302, 'Found', {}, destination)
            raise AssertionError('Redirect allowed')
        except urllib.error.HTTPError:
            pass
    assert 'TEST-ONLY-KEY' not in source
    assert 'getpass.GetPassWarning' in source and 'isatty' in source
    # Actually run only the rejecting no-TTY branch; it must never reach networking.
    result = subprocess.run([sys.executable, '-c', source], input='TEST-ONLY-KEY\n', capture_output=True, text=True)
    assert result.returncode != 0
    assert 'TEST-ONLY-KEY' not in result.stdout + result.stderr

print(json.dumps({'checks': checks, 'offlineCredentialPrograms': len(python_sources), 'status': 'passed'}, ensure_ascii=False, indent=2))
