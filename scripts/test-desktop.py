#!/usr/bin/env python3
"""Check the real Linux package UI using WebKitWebDriver (no Python dependencies).

Run after building:
  xvfb-run -a python3 scripts/test-desktop.py target/release/devtrack-desktop
Uses temporary app data; never opens the user's database.
Set DEVTRACK_SKIP_SCREENSHOTS=1 when the host WebDriver cannot capture a bundled
WebKit version. All DOM, navigation, and persistence checks still run.
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
fixture_bin = artifacts / 'bin'
fixture_bin.mkdir()
fixture_gh = fixture_bin / 'gh'
fixture_gh.write_text("#!/usr/bin/env python3\nimport os,sys,json\nif 'repos/fixture/repo/issues' in sys.argv:\n print(json.dumps([{'number':42,'title':'GitHub planned feature','body':'Open issue from fixture','milestone':{'title':'v0.5'},'labels':[],'created_at':'2026-01-01T00:00:00Z'},{'number':43,'title':'Pull request hidden','pull_request':{}}]))\nelse:\n os.execv('/usr/bin/gh',['gh',*sys.argv[1:]])\n")
fixture_python = fixture_bin / 'gh-fixture.py'
fixture_python.write_text(fixture_gh.read_text())
fixture_gh.write_text('#!/bin/sh\nunset PYTHONHOME PYTHONPATH\nexec /usr/bin/python3 \"' + str(fixture_python) + '\" \"$@\"\n')
fixture_gh.chmod(0o755)
env['PATH'] = str(fixture_bin) + os.pathsep + env.get('PATH','')
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


def snapshot(name):
    # A host WebDriver may not support captures from bundled WebKit versions.
    if not os.environ.get('DEVTRACK_SKIP_SCREENSHOTS'):
        (artifacts / name).write_bytes(base64.b64decode(request(session + '/screenshot')))


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
        snapshot('screenshot.png')
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
            (artifacts / 'failure-page.txt').write_text(evaluate('return document.body.innerText'))
            snapshot('failure.png')
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
        snapshot('project-created.png')
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
        snapshot('project-files.png')
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
        snapshot('project-work.png')
        subprocess.run(['git','-C',str(project_dir),'remote','add','origin','https://github.com/fixture/repo.git'],check=True,capture_output=True)
        evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Planned work').click()")
        wait_for("return [...document.querySelectorAll('h1')].some(h => h.innerText === 'Planned work')", 'Planned work tab failed')
        wait_for("return [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Sync GitHub issues' && !b.disabled)", 'Issue cache did not finish loading')
        evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sync GitHub issues').click()")
        wait_for("return document.querySelector('.github-issue-row')?.innerText.includes('GitHub planned feature')", 'GitHub issue did not load')
        assert not evaluate("return document.body.innerText.includes('Pull request hidden')"), 'Pull request leaked into planned issues'
        for title, version in [('Later release','1.10'), ('Alpha stage','0.1.0-alpha.1'), ('Sooner release','1.2')]:
            evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Add Task').click()")
            wait_for("return !!document.querySelector('#task-title')", 'Task creation form failed')
            fill('#task-title',title)
            fill('#task-version',version)
            evaluate("document.querySelector('form button[type=submit]').click()")
            wait_for("return !document.querySelector('#task-title')", 'Task creation failed')
        evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Newest').click()")
        wait_for("return [...document.querySelectorAll('h3')].at(-1)?.innerText.includes('GitHub planned feature')", 'Newest sorting did not compare local and GitHub dates')
        evaluate("const e=document.querySelector('[aria-label=\"Filter task source\"]');e.value='github';e.dispatchEvent(new Event('change',{bubbles:true}))")
        wait_for("return document.querySelectorAll('[aria-label=\"Edit task\"]').length === 0 && document.querySelectorAll('.github-issue-row').length === 1", 'GitHub source filter failed')
        evaluate("const e=document.querySelector('[aria-label=\"Filter task source\"]');e.value='all';e.dispatchEvent(new Event('change',{bubbles:true}))")
        evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase() === 'version').click()")
        wait_for("return document.querySelectorAll('.task-version-heading').length === 4", 'Version groups failed')
        assert evaluate("return [...document.querySelectorAll('.task-version-heading')].map(e=>e.firstChild.textContent).join('|')") == 'Version 0.1.0-alpha.1|Version 0.5|Version 1.2|Version 1.10', 'Version order is lexical instead of numeric'
        evaluate("const e=document.querySelector('[aria-label=\"Filter target version\"]');e.value='1.2';e.dispatchEvent(new Event('change',{bubbles:true}))")
        wait_for("return document.querySelectorAll('[aria-label=\"Edit task\"]').length === 1", 'Task version filter failed')
        evaluate("document.querySelector('[aria-label=\"Edit task\"]').click()")
        wait_for("return document.querySelector('#task-version')?.value === '1.2'", 'Task version not loaded for editing')
        fill('#task-version','1.0')
        evaluate("document.querySelector('form button[type=submit]').click()")
        wait_for("return !document.querySelector('#task-title')", 'Task version edit failed')
        evaluate("const e=document.querySelector('[aria-label=\"Filter target version\"]');e.value='all';e.dispatchEvent(new Event('change',{bubbles:true}))")
        wait_for("return document.querySelector('.task-version-heading')?.innerText.includes('0.1.0-alpha.1')", 'Version filter reset failed')
        evaluate("document.querySelector('[aria-label=\"Mark as done\"]').click()")
        wait_for("return document.querySelectorAll('[aria-label=\"Edit task\"]').length === 2", 'Completed task remains in planned Todo view')
        with sqlite3.connect(database) as connection:
            rows=connection.execute('SELECT title,target_version,status FROM tasks ORDER BY title').fetchall()
            assert rows==[('Alpha stage','0.1.0-alpha.1','Done'),('Later release','1.10','Todo'),('Sooner release','1.0','Todo')], f'Task versions were not persisted: {rows}'
        snapshot('planned-work.png')
        evaluate("document.querySelector('a[href=\"/all-tasks\"]').click()")
        wait_for("return document.querySelectorAll('[data-work-source=local]').length === 3 && document.querySelectorAll('[data-work-source=github]').length === 1 && document.querySelectorAll('[data-work-source=commit]').length === 1", 'All Tasks omitted local, GitHub or completed work')
        assert evaluate("return !document.querySelector('[data-work-source=github] button[aria-label]') && !document.querySelector('[data-work-source=commit] button[aria-label]')"), 'Remote work exposes local mutation controls'
        evaluate("const e=document.querySelector('[aria-label=\"Filter work status\"]');e.value='Todo';e.dispatchEvent(new Event('change',{bubbles:true}))")
        wait_for("return [...document.querySelectorAll('.task-version-badge')].map(e=>e.innerText).join('|') === 'v0.5|v1.0|v1.10'", 'Global task version sorting failed')
        evaluate("document.querySelector('[aria-label=\"Mark as done\"]').click()")
        wait_for("return document.querySelectorAll('[data-work-source=local]').length === 1", 'Global completion failed')
        evaluate("document.querySelector('a[href=\"/\"]').click()")
        wait_for("return [...document.querySelectorAll('.overview-stat')].find(e=>e.innerText.includes('Open tasks'))?.querySelector('.stat-value').innerText === '2'", 'Overview did not combine local and GitHub open tasks')
        wait_for("return [...document.querySelectorAll('.overview-stat')].find(e=>e.innerText.includes('Completed'))?.querySelector('.stat-value').innerText === '3'", 'Overview did not count two completed tasks plus meaningful commit')
        assert evaluate("return document.querySelector('main').innerText.includes('GitHub planned feature')"), 'Up next omitted GitHub task'
        snapshot('overview-work.png')
        evaluate("document.querySelector('a[href=\"/reports\"]').click()")
        wait_for("return document.querySelectorAll('[data-work-source]').length === 5", 'Reports empty despite local and repository work')
        wait_for("return document.querySelector('main').innerText.includes('No time entries for this period')", 'Report invented tracked time for work')
        assert evaluate("return !document.querySelector('[aria-label=\"Mark as done\"]')"), 'Report unexpectedly edits task state'
        snapshot('reports-work.png')
        evaluate("document.querySelector('a[href=\"/all-tasks\"]').click()")
        wait_for("return document.querySelectorAll('[aria-label=\"Reopen task\"]').length === 2", 'Global completed tasks missing')
        evaluate("document.querySelectorAll('[aria-label=\"Reopen task\"]')[1].click()")
        wait_for("return document.querySelectorAll('[aria-label=\"Mark as done\"]').length === 2", 'Global reopen failed')
        evaluate("location.reload()")
        wait_for("return document.querySelectorAll('[data-work-source]').length === 5", 'Local/remote work did not persist across restart')
        print('PASS: mixed work in All Tasks/Overview/Reports, meaningful completed counts, read-only remote rows, completion/reopen and cached reload')
        with sqlite3.connect(database) as connection:
            original_project_id=connection.execute("SELECT id FROM projects WHERE name='Desktop test project'").fetchone()[0]
        tag_fixture=json.dumps({'id':original_project_id,'tags':'shared tag, C++ & tools/#'})
        same_path=json.dumps(str(project_dir))
        evaluate(f"window.__tagsReady=null;(async()=>{{const invoke=window.__TAURI_INTERNALS__.invoke;await invoke('project_update',{tag_fixture});const match=await invoke('project_create',{{name:'Matching archived project',path:{same_path}}});await invoke('project_update',{{id:match.id,tags:'shared tag',status:'Archived'}});const other=await invoke('project_create',{{name:'Partial tag project',path:{same_path}}});await invoke('project_update',{{id:other.id,tags:'shared tagline'}});window.__tagsReady=true}})().catch(e=>window.__tagsReady=String(e))")
        wait_for("return window.__tagsReady === true", 'Tag fixtures failed')
        evaluate(f"location.pathname='/projects/{original_project_id}'")
        wait_for("return document.querySelectorAll('.about-tags .project-tag').length === 2", 'Project detail tags did not render')
        evaluate("[...document.querySelectorAll('.about-tags .project-tag')].find(a=>a.innerText==='shared tag').click()")
        wait_for("return location.pathname==='/projects' && document.querySelectorAll('.project-name').length === 2", 'Clickable tag did not include all matching projects')
        assert evaluate("return [...document.querySelectorAll('.project-name')].map(e=>e.innerText).sort().join('|')")=='Desktop test project|Matching archived project', 'Tag filter used partial matches or excluded archived projects'
        fill('[aria-label="Filter projects"]','Desktop')
        wait_for("return document.querySelectorAll('.project-name').length === 1", 'Search within tagged projects failed')
        evaluate("[...document.querySelectorAll('.project-tag')].find(a=>a.innerText==='shared tag').click()")
        wait_for("return document.querySelectorAll('.project-name').length === 2 && document.querySelector('[aria-label=\"Filter projects\"]').value === ''", 'Clicking the selected tag did not restore all matching projects')
        evaluate("document.querySelector('[aria-label=\"Clear tag filter\"]').click()")
        wait_for("return !new URLSearchParams(location.search).has('tag') && document.querySelectorAll('.project-name').length === 2", 'Clear tag filter failed')
        evaluate("[...document.querySelectorAll('.project-tag')].find(a=>a.innerText==='C++ & tools/#').click()")
        wait_for("return new URLSearchParams(location.search).get('tag')==='C++ & tools/#' && document.querySelectorAll('.project-name').length === 1", 'Card tag link did not encode reserved characters')
        snapshot('tag-filter.png')
        print('PASS: clickable detail/card tags, exact matching, archived matches, clear filter, URL encoding')
        print('PASS: planned work, task creation/editing/version persistence, numeric/prerelease sorting, version filter, Done exclusion')
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
                evaluate(f"window.__live=null;window.__TAURI_INTERNALS__.invoke('project_create',{args}).then(p=>{{window.__liveProjectId=p.id;return window.__TAURI_INTERNALS__.invoke('project_history',{{id:p.id,refresh:true}})}}).then(h=>window.__live=h).catch(e=>window.__live={{error:String(e)}})")
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
                evaluate("window.__issueImport=null;window.__TAURI_INTERNALS__.invoke('project_issues',{id:window.__liveProjectId,refresh:true}).then(h=>window.__issueImport=h).catch(e=>window.__issueImport={error:String(e)})")
                for attempt in range(160):
                    issues=evaluate('return window.__issueImport')
                    if issues is not None: break
                    time.sleep(.25)
                assert issues and not issues.get('error'), f'Issue import failed for {name}: {issues}'
                (artifacts / f'issues-project-{original_id}.json').write_text(json.dumps(issues))
                print(f'ISSUES {name}: {len(issues["issues"])} open GitHub issues')

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
