#!/usr/bin/env python3
"""Check the real Linux package UI using WebKitWebDriver (no Python dependencies).

Run after building:
  xvfb-run -a python3 scripts/test-desktop.py target/release/devtrack-desktop
Uses temporary app data; never opens the user's database.
"""
import base64
import json
import os
from pathlib import Path
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

binary = Path(sys.argv[1] if len(sys.argv) > 1 else 'target/release/devtrack-desktop').resolve()
artifacts = Path(tempfile.mkdtemp(prefix='devtrack-ui-test-'))
env = os.environ.copy()
for key, name in [('XDG_DATA_HOME', 'data'), ('XDG_CONFIG_HOME', 'config'), ('XDG_CACHE_HOME', 'cache')]:
    directory = artifacts / name
    directory.mkdir()
    env[key] = str(directory)
env.update(TAURI_WEBVIEW_AUTOMATION='true', GDK_BACKEND='x11', WEBKIT_DISABLE_DMABUF_RENDERER='1')
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]


def request(path, body=None, method=None):
    req = urllib.request.Request(
        f'http://127.0.0.1:{port}{path}',
        data=None if body is None else json.dumps(body).encode(),
        headers={'Content-Type': 'application/json'}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            return json.load(response)['value']
    except urllib.error.HTTPError as error:
        raise RuntimeError(error.read().decode()) from error


with (artifacts / 'driver.log').open('w') as log:
    driver = subprocess.Popen(['WebKitWebDriver', f'--port={port}'], env=env, stdout=log, stderr=log)
    session = None
    try:
        for attempt in range(50):
            try:
                request('/status')
                break
            except urllib.error.URLError:
                time.sleep(0.1)
        result = request('/session', {'capabilities': {'alwaysMatch': {
            'webkitgtk:browserOptions': {'binary': str(binary)}}}})
        session = '/session/' + result['sessionId']

        def evaluate(script):
            return request(session + '/execute/sync', {'script': script, 'args': []})

        for attempt in range(40):
            text = evaluate('return document.body.innerText')
            if 'Total Projects' in text and 'Recent Time Entries' in text:
                break
            time.sleep(0.25)
        (artifacts / 'page.txt').write_text(text)
        (artifacts / 'screenshot.png').write_bytes(base64.b64decode(request(session + '/screenshot')))
        assert 'Total Projects' in text and 'Recent Time Entries' in text, 'Dashboard did not render'
        assert evaluate("return document.querySelector('main').getBoundingClientRect().left >= document.querySelector('aside').getBoundingClientRect().right"), 'Sidebar covers dashboard content'
        evaluate("document.querySelector('a[href=\"/projects\"]').click()")
        for attempt in range(40):
            if evaluate("return location.pathname === '/projects' && document.querySelector('main').innerText.includes('Projects')"):
                break
            time.sleep(0.25)
        else:
            raise AssertionError('Projects navigation did not render')
        evaluate("window.__testErrors = []; addEventListener('unhandledrejection', e => window.__testErrors.push(String(e.reason)))")

        def wait_for(script, message):
            for attempt in range(60):
                if evaluate(script):
                    return
                time.sleep(0.25)
            raise AssertionError(message + ': ' + str(evaluate('return window.__testErrors')))

        def open_project_form():
            evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Add Project').click()")
            for attempt in range(60):
                picker = subprocess.run(['xdotool', 'search', '--onlyvisible', '--name', '^Select Project Directory$'], capture_output=True, text=True)
                if picker.returncode == 0:
                    window = picker.stdout.splitlines()[-1]
                    subprocess.run(['xdotool', 'windowfocus', '--sync', window], check=True)
                    subprocess.run(['xdotool', 'key', 'Escape'], check=True)
                    break
                time.sleep(0.25)
            else:
                raise AssertionError('Native directory picker did not open: ' + str(evaluate('return window.__testErrors')))
            wait_for("return !!document.querySelector('#new-project-name')", 'Add Project did not open the form after canceling the picker')

        def fill(selector, value):
            # Wry's WebDriver integration cannot synthesize keyboard events.
            # xdotool needs >=40ms char delay under xvfb or WebKitGTK drops keys.
            window = subprocess.check_output(['xdotool', 'search', '--onlyvisible', '--name', '^DevTrack$'], text=True).splitlines()[-1]
            subprocess.run(['xdotool', 'windowfocus', '--sync', window], check=True)
            evaluate(f'document.querySelector({json.dumps(selector)}).focus()')
            subprocess.run(['xdotool', 'key', 'ctrl+a'], check=True)
            subprocess.run(['xdotool', 'type', '--clearmodifiers', '--delay', '60', '--', value], check=True)

        project_dir = artifacts / 'sample-project'
        project_dir.mkdir()
        open_project_form()
        fill('#new-project-name', 'Desktop test project')
        fill('#new-project-path', str(artifacts / 'missing-directory'))
        evaluate("document.querySelector('form button[type=submit]').click()")
        wait_for("return document.querySelector('[role=alert]')?.textContent.includes('Could not create project')", 'Invalid project path did not show an error')
        fill('#new-project-path', str(project_dir))
        evaluate("document.querySelector('form button[type=submit]').click()")
        wait_for("return !document.querySelector('#new-project-name') && [...document.querySelectorAll('h3')].some(h => h.textContent === 'Desktop test project')", 'Created project did not appear in the list')
        (artifacts / 'project-created.png').write_bytes(base64.b64decode(request(session + '/screenshot')))
        database = next((artifacts / 'data').rglob('projects.db'))
        with sqlite3.connect(database) as connection:
            assert connection.execute('SELECT name, path FROM projects').fetchall() == [('Desktop test project', str(project_dir))], 'Project was not persisted correctly'
        open_project_form()
        fill('#new-project-name', 'Desktop test project')
        fill('#new-project-path', str(project_dir))
        evaluate("document.querySelector('form button[type=submit]').click()")
        wait_for("return document.querySelector('[role=alert]')?.textContent.includes('Could not create project')", 'Duplicate project did not show an error')
        print('PASS: dashboard, navigation, native directory picker, project creation/persistence, invalid path and duplicate error handling')
    finally:
        if session:
            try:
                request(session, method='DELETE')
            except Exception as error:
                print(f'Session cleanup: {error}', file=sys.stderr)
        driver.terminate()
        try:
            driver.wait(timeout=10)
        except subprocess.TimeoutExpired:
            driver.kill()
            driver.wait()
        print(f'Test artifacts: {artifacts}', flush=True)
