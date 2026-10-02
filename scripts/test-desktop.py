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
if os.environ.get('DEVTRACK_LIVE_GITHUB'):
    env['GH_CONFIG_DIR'] = str(Path.home() / '.config/gh')
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

        assert evaluate("return !['http:', 'https:'].includes(location.protocol)"), 'Desktop binary is loading a server URL instead of its bundled interface'
        for attempt in range(40):
            text = evaluate('return document.body.innerText')
            if 'Overview' in text and 'Recent activity' in text:
                break
            time.sleep(0.25)
        (artifacts / 'page.txt').write_text(text)
        (artifacts / 'screenshot.png').write_bytes(base64.b64decode(request(session + '/screenshot')))
        assert 'Overview' in text and 'Recent activity' in text, 'Dashboard did not render'
        assert evaluate("return document.querySelector('main').getBoundingClientRect().left >= document.querySelector('aside').getBoundingClientRect().right"), 'Sidebar covers dashboard content'
        evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'New Project').click()")
        for attempt in range(40):
            if evaluate("return !!document.querySelector('#new-project-name')"):
                break
            time.sleep(0.25)
        else:
            raise AssertionError('Dashboard New Project did not open the form')
        evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cancel').click()")
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
            wait_for("return !!document.querySelector('#new-project-name')", 'Add Project did not immediately open the form')

        def check_native_picker():
            evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Browse folders').click()")
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
            wait_for("return !!document.querySelector('#new-project-name') && [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Browse folders')", 'Canceling the folder picker did not preserve the project form')

        def fill(selector, value):
            # Wry's WebDriver integration cannot synthesize keyboard events.
            # xdotool needs >=40ms char delay under xvfb or WebKitGTK drops keys.
            window = subprocess.check_output(['xdotool', 'search', '--onlyvisible', '--name', '^DevTrack$'], text=True).splitlines()[-1]
            subprocess.run(['xdotool', 'windowfocus', '--sync', window], check=True)
            evaluate(f'document.querySelector({json.dumps(selector)}).focus()')
            subprocess.run(['xdotool', 'key', 'ctrl+a'], check=True)
            if value:
                subprocess.run(['xdotool', 'type', '--clearmodifiers', '--delay', '60', '--', value], check=True)
            else:
                subprocess.run(['xdotool', 'key', 'BackSpace'], check=True)

        assert evaluate("return !document.querySelector('main').dispatchEvent(new MouseEvent('contextmenu', {bubbles:true,cancelable:true}))"), 'Desktop still exposes the website context menu'
        project_dir = artifacts / 'sample-project'
        project_dir.mkdir()
        (project_dir / 'docs').mkdir()
        (project_dir / 'README.md').write_text('# Sample repository\n\n| Feature | Status |\n| --- | --- |\n| Timer | Added |\n\n[Guide](docs/guide.md)\n')
        (project_dir / 'docs/guide.md').write_text('# Guide\nRead project docs here.\n')
        (project_dir / 'timer.rs').write_text('pub fn pause_timer() {}\n')
        subprocess.run(['git', 'init', str(project_dir)], check=True, capture_output=True)
        for command in [['config','user.name','Test Developer'], ['config','user.email','test@example.test'], ['add','.'], ['commit','-m','feat(timer): add pause timer']]:
            subprocess.run(['git','-C',str(project_dir),*command],check=True,capture_output=True)
        (project_dir / 'maintenance.txt').write_text('routine update')
        subprocess.run(['git','-C',str(project_dir),'add','.'],check=True,capture_output=True)
        subprocess.run(['git','-C',str(project_dir),'commit','-m','chore: maintenance'],check=True,capture_output=True)
        open_project_form()
        check_native_picker()
        assert evaluate("return document.querySelector('#new-project-name').dispatchEvent(new MouseEvent('contextmenu', {bubbles:true,cancelable:true}))"), 'Input editing context menu was suppressed'
        fill('#new-project-name', 'Desktop test project')
        fill('#new-project-path', str(artifacts / 'missing-directory'))
        evaluate("document.querySelector('form button[type=submit]').click()")
        wait_for("return document.querySelector('[role=alert]')?.textContent.includes('Could not create project')", 'Invalid project path did not show an error')
        fill('#new-project-path', str(project_dir))
        evaluate("document.querySelector('form button[type=submit]').click()")
        wait_for("return !document.querySelector('#new-project-name') && [...document.querySelectorAll('h3')].some(h => h.textContent === 'Desktop test project')", 'Created project did not appear in the list')
        (artifacts / 'project-created.png').write_bytes(base64.b64decode(request(session + '/screenshot')))
        evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Archived').click()")
        wait_for("return ![...document.querySelectorAll('h3')].some(h => h.textContent === 'Desktop test project')", 'Archived filter includes active projects')
        evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'All').click()")
        wait_for("return [...document.querySelectorAll('h3')].some(h => h.textContent === 'Desktop test project')", 'All filter did not restore the project')
        database = next((artifacts / 'data').rglob('projects.db'))
        with sqlite3.connect(database) as connection:
            assert connection.execute('SELECT name, path FROM projects').fetchall() == [('Desktop test project', str(project_dir))], 'Project was not persisted correctly'
        open_project_form()
        fill('#new-project-name', 'Desktop test project')
        fill('#new-project-path', str(project_dir))
        evaluate("document.querySelector('form button[type=submit]').click()")
        wait_for("return document.querySelector('[role=alert]')?.textContent.includes('Could not create project')", 'Duplicate project did not show an error')
        evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cancel').click()")
        evaluate("document.querySelector('.project-name').click()")
        wait_for("return location.pathname.includes('/projects/') && !!document.querySelector('.repo-file-list')", 'Project detail did not open')
        assert evaluate("return document.querySelector('.repo-readme').innerText.includes('Sample repository') && !!document.querySelector('.repo-readme table')"), 'README or Markdown table did not render'
        (artifacts / 'project-files.png').write_bytes(base64.b64decode(request(session + '/screenshot')))
        evaluate("[...document.querySelectorAll('.repo-file-row')].find(b => b.innerText.includes('timer.rs')).click()")
        wait_for("return document.querySelector('.source-preview')?.innerText.includes('pause_timer')", 'Source preview failed')
        (project_dir / 'timer.rs').write_text('pub fn pause_timer_updated() {}\n')
        evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Refresh files').click()")
        wait_for("return document.querySelector('.source-preview')?.innerText.includes('pause_timer_updated')", 'File refresh retained stale preview')
        evaluate("[...document.querySelectorAll('.repo-file-row')].find(b => b.innerText.includes('docs')).click()")
        wait_for("return document.querySelector('.file-breadcrumb')?.innerText.includes('docs') && document.querySelector('.repo-file-list')?.innerText.includes('guide.md')", 'Nested folder browsing failed')
        evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Completed work').click()")
        wait_for("return document.querySelector('.work-list')?.innerText.includes('feat(timer): add pause timer')", 'Local history did not load')
        assert evaluate("return !document.querySelector('.work-list').innerText.includes('chore: maintenance')"), 'Routine commits were not hidden by default'
        fill('[aria-label="Filter added function"]','pause_timer')
        wait_for("return document.querySelectorAll('.work-entry').length === 1", 'Function filter failed')
        fill('[aria-label="Filter added function"]','missing_function')
        wait_for("return document.querySelectorAll('.work-entry').length === 0", 'Nonmatching function filter failed')
        fill('[aria-label="Filter added function"]','')
        evaluate("const e=document.querySelector('[aria-label=\"Filter change type\"]');e.value='all';e.dispatchEvent(new Event('change',{bubbles:true}))")
        wait_for("return document.querySelectorAll('.work-entry').length === 2", 'All changes filter failed')
        evaluate("document.querySelector('.work-expand').click()")
        wait_for("return !!document.querySelector('.work-evidence')", 'Commit evidence expansion failed')
        (artifacts / 'project-work.png').write_bytes(base64.b64decode(request(session + '/screenshot')))
        print('PASS: standalone startup, project creation, repository files/README/tables, refreshed previews, nested folders, local commit evidence, feature/function filters')

        if os.environ.get('DEVTRACK_LIVE_GITHUB'):
            original_db=Path.home() / '.local/share/devtrack/projects.db'
            with sqlite3.connect(f'file:{original_db}?mode=ro',uri=True) as connection:
                registered=connection.execute('SELECT id, name, path FROM projects').fetchall()
            for original_id, name, path in registered:
                if not Path(path).is_dir():
                    print(f'SKIP unavailable project: {name}')
                    continue
                args=json.dumps({'name':f'Live check {original_id}','path':path})
                evaluate(f"window.__live=null;window.__TAURI_INTERNALS__.invoke('project_create',{args}).then(p=>window.__TAURI_INTERNALS__.invoke('project_history',{{id:p.id,refresh:true}})).then(h=>window.__live=h).catch(e=>window.__live={{error:String(e)}})")
                for attempt in range(240):
                    value=evaluate('return window.__live')
                    if value is not None: break
                    time.sleep(.25)
                assert value and not value.get('error'), f'History import failed for {name}: {value}'
                if value['source']!='GitHub':
                    print(f'LOCAL ONLY {name}: {value.get("notice")}')
                    continue
                (artifacts / f'github-project-{original_id}.json').write_text(json.dumps(value))
                print(f'GITHUB {name}: {len(value["commits"])} commits; {sum(c["category"] in ["Feature","Bug fix","Function added","Performance"] for c in value["commits"])} feature/fix/function changes')
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
