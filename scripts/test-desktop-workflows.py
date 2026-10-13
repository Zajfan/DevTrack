#!/usr/bin/env python3
"""Exercise native desktop workflows on Linux, Windows and macOS.

Build: cargo build -p devtrack-desktop --features desktop-test --locked
Run:   python scripts/test-desktop-workflows.py target/debug/devtrack-desktop
Linux requires a display (use xvfb-run -a on CI). All business data is isolated.
These checks cover schema upgrades, not installer upgrades between releases.
"""
import argparse
import json
from pathlib import Path
import platform
import sqlite3
import subprocess
import tempfile
import traceback

from desktop_webdriver import Desktop

NAME = 'Workflow project'
NOTE = '# Native desktop notes\n\nKeep Swedish text: räksmörgås.\n'
LEGACY_NOTE = '# Existing notes\n\nPreserve this during migration.\n'


def seed_legacy(data, project):
    (data / 'notes').mkdir(parents=True)
    with sqlite3.connect(data / 'projects.db') as connection:
        connection.executescript((Path(__file__).parent / 'fixtures/desktop-legacy.sql').read_text())
        connection.execute("INSERT INTO projects (id,name,path,tags) VALUES (1,'Legacy project',?,'existing')", (str(project),))
    (data / 'notes/Legacy project.md').write_text(LEGACY_NOTE, encoding='utf-8')


def verify_legacy(data):
    with sqlite3.connect(data / 'projects.db') as connection:
        assert connection.execute('PRAGMA integrity_check').fetchone() == ('ok',)
        assert connection.execute('PRAGMA foreign_key_check').fetchall() == []
        assert connection.execute('SELECT title,description,status,priority,due_date,target_version FROM tasks WHERE id=1').fetchone() == (
            'Keep legacy task', 'Existing task description', 'Done', 'High', '2026-11-01', '')
        assert connection.execute('SELECT task_id,title,done FROM subtasks').fetchall() == [(1, 'Keep legacy subtask', 1)]
        assert connection.execute('SELECT task_id,start_time,end_time,duration_seconds,description,paused_at FROM time_entries').fetchall() == [
            (1, 1767268800, 1767268860, 60, 'Existing time entry', None)]
    assert (data / 'notes/Legacy project.md').read_text(encoding='utf-8') == LEGACY_NOTE


def open_project(app):
    app.click('a[href="/projects"]')
    app.button(NAME)
    app.wait("return !!document.querySelector('.repo-readme')", 'Project README')


def run(binary, artifacts):
    data = artifacts / 'data'
    project = artifacts / 'repository with spaces'
    project.mkdir()
    (project / 'README.md').write_text('# Verification repository\n\nNative filesystem access.\n', encoding='utf-8')
    (project / 'example.rs').write_text('pub fn verification_example() {}\n', encoding='utf-8')
    for command in [['init'], ['config', 'user.name', 'DevTrack Test'], ['config', 'user.email', 'test@example.test'], ['add', '.'], ['commit', '-m', 'feat: add verification example']]:
        subprocess.run(['git', '-C', str(project), *command], check=True, capture_output=True)
    seed_legacy(data, project)

    with Desktop(binary, data, artifacts, 'first-launch') as app:
        verify_legacy(data)
        app.capture('overview')
        app.click('a[href="/all-tasks"]')
        app.wait("return document.querySelector('main').innerText.includes('Keep legacy task')", 'Migrated task visible')
        app.click('a[href="/projects"]')
        app.button('Add Project')
        app.fill('#new-project-name', NAME)
        app.fill('#new-project-path', str(artifacts / 'does-not-exist'))
        app.click('form button[type=submit]')
        app.wait("return document.querySelector('[role=alert]')?.textContent.includes('Could not create project')", 'Invalid path validation')
        app.fill('#new-project-path', str(project))
        app.click('form button[type=submit]')
        app.wait("return !document.querySelector('#new-project-name') && document.querySelectorAll('.project-table-row').length===2", 'Project creation')
        app.capture('projects')
        open_project(app)
        app.wait("return document.querySelector('.repo-readme').innerText.includes('Verification repository')", 'README from disk')
        app.wait("return [...document.querySelectorAll('.repo-file-row')].some(e=>e.innerText.includes('example.rs'))", 'Source file listed')
        app.evaluate("[...document.querySelectorAll('.repo-file-row')].find(e=>e.innerText.includes('example.rs')).click()")
        app.wait("return document.querySelector('.source-preview')?.innerText.includes('verification_example')", 'Source preview')
        app.button('Completed work')
        app.wait("return document.querySelector('.work-list')?.innerText.includes('feat: add verification example')", 'Local Git history')
        app.button('Planned work')
        app.button('Add Task')
        app.fill('#task-title', 'Verify persistence')
        app.fill('#task-desc', 'Saved by the native application')
        app.fill('#task-version', '1.0.1')
        app.click('form button[type=submit]')
        app.wait("return !document.querySelector('#task-title') && !!document.querySelector('[aria-label=\"Edit task\"]')", 'Task creation')
        app.click('[aria-label="Edit task"]')
        app.fill('#task-version', '1.1.0-alpha.1')
        app.click('form button[type=submit]')
        app.wait("return !document.querySelector('#task-title') && document.querySelector('main').innerText.includes('1.1.0-alpha.1')", 'Task editing')
        app.click('[aria-label="Mark as done"]')
        app.wait("return !document.querySelector('[aria-label=\"Mark as done\"]')", 'Task completion')
        app.click('a[href="/all-tasks"]')
        app.wait("return document.querySelectorAll('[aria-label=\"Reopen task\"]').length===2", 'Completed tasks in global view')
        app.capture('tasks')
        app.click('a[href="/notes"]')
        app.fill('textarea', NOTE)
        app.button('Save')
        app.wait("return [...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Saved' && b.disabled)", 'Notes saved')
        app.capture('notes')
        app.quit()

    with sqlite3.connect(data / 'projects.db') as connection:
        assert connection.execute('SELECT title,description,status,target_version FROM tasks WHERE id<>1').fetchall() == [
            ('Verify persistence', 'Saved by the native application', 'Done', '1.1.0-alpha.1')]
    assert (data / f'notes/{NAME}.md').read_text(encoding='utf-8') == NOTE

    # Move the actual repository while the app is stopped, then repair its
    # location through the UI. Covers native path handling on every platform.
    moved = artifacts / 'moved repository'
    project.rename(moved)
    with Desktop(binary, data, artifacts, 'restart') as app:
        app.click('a[href="/projects"]')
        app.click(f'[aria-label="Edit {NAME}"]')
        app.fill('.project-path-input', str(moved))
        app.button('Save changes')
        app.wait("return !document.querySelector('.project-edit-dialog')", 'Project location update')
        open_project(app)
        app.wait("return document.querySelector('.repo-readme').innerText.includes('Verification repository')", 'README at moved location')
        app.click('a[href="/notes"]')
        app.wait(f'return document.querySelector("textarea")?.value==={json.dumps(NOTE)}', 'Notes after process restart')
        app.click('a[href="/all-tasks"]')
        app.wait("return document.querySelectorAll('[aria-label=\"Reopen task\"]').length===2 && document.querySelector('main').innerText.includes('1.1.0-alpha.1')", 'Completed tasks after process restart')
        app.capture('persisted-tasks')
        app.quit()

    with Desktop(binary, data, artifacts, 'second-restart') as app:
        open_project(app)
        app.wait("return document.querySelector('.repo-readme').innerText.includes('Verification repository')", 'Moved location persists after restart')
        app.capture('moved-project')
        app.quit()
    verify_legacy(data)
    with sqlite3.connect(data / 'projects.db') as connection:
        saved_path = connection.execute('SELECT path FROM projects WHERE name=?', (NAME,)).fetchone()[0]
        assert Path(saved_path).samefile(moved), saved_path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('binary', type=Path)
    parser.add_argument('--artifacts', type=Path, help='New directory for logs, screenshots and fixture data')
    args = parser.parse_args()
    if args.artifacts:
        args.artifacts.resolve().mkdir(parents=True, exist_ok=False)
        artifacts = args.artifacts.resolve()
    else:
        artifacts = Path(tempfile.mkdtemp(prefix='devtrack-workflows-'))
    result = {'platform': platform.platform(), 'binary': str(args.binary.resolve()), 'passed': False}
    print(f'Test artifacts: {artifacts}', flush=True)
    try:
        run(args.binary, artifacts)
        result['passed'] = True
        print('PASS: legacy migration, project creation/relocation, files/README/Git, task creation/edit/completion, notes and two process restarts', flush=True)
    except Exception:
        result['error'] = traceback.format_exc()
        raise
    finally:
        (artifacts / 'result.json').write_text(json.dumps(result, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
