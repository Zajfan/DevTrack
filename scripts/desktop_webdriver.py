"""Small W3C WebDriver client for opt-in DevTrack automation builds.

Uses only Python's standard library. The app runs its real native webview and
Rust backend; no API calls are mocked. Each invocation owns its child process.
"""
import base64
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request


class Desktop:
    def __init__(self, binary, data, artifacts, phase):
        self.binary = Path(binary).resolve()
        self.data = Path(data).resolve()
        self.artifacts = Path(artifacts)
        self.phase = phase
        self.process = None
        self.session = None
        self.log = None
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            self.port = sock.getsockname()[1]
        # Do not route localhost automation through a CI HTTP proxy.
        self.http = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def request(self, path, body=None, timeout=30):
        request = urllib.request.Request(
            f'http://127.0.0.1:{self.port}{path}',
            data=None if body is None else json.dumps(body).encode(),
            headers={'Content-Type': 'application/json'})
        try:
            with self.http.open(request, timeout=timeout) as response:
                return json.load(response)['value']
        except urllib.error.HTTPError as error:
            raise RuntimeError(error.read().decode()) from error

    def __enter__(self):
        env = os.environ.copy()
        env.update(DEVTRACK_TEST_DATA_DIR=str(self.data), TAURI_WEBDRIVER_PORT=str(self.port))
        if sys.platform.startswith('linux'):
            env.update(GDK_BACKEND='x11', WEBKIT_DISABLE_DMABUF_RENDERER='1', WEBKIT_DISABLE_COMPOSITING_MODE='1')
            for key in ('XDG_DATA_HOME', 'XDG_CONFIG_HOME', 'XDG_CACHE_HOME'):
                directory = self.data / key.lower()
                directory.mkdir(parents=True, exist_ok=True)
                env[key] = str(directory)
        self.log = (self.artifacts / f'{self.phase}-app.log').open('w', encoding='utf-8')
        try:
            self.process = subprocess.Popen([str(self.binary)], env=env, stdout=self.log, stderr=self.log)
            deadline = time.monotonic() + 60
            while True:
                if self.process.poll() is not None:
                    raise RuntimeError(f'App exited with {self.process.returncode}; see {self.phase}-app.log')
                try:
                    self.request('/status', timeout=2)
                    break
                except (urllib.error.URLError, TimeoutError):
                    if time.monotonic() >= deadline:
                        raise RuntimeError('WebDriver did not start; build with --features desktop-test')
                    time.sleep(0.2)
            result = self.request('/session', {'capabilities': {'alwaysMatch': {}}})
            self.session = '/session/' + result['sessionId']
            self.wait("return document.querySelector('main')?.innerText.includes('Recent activity')", 'Overview startup')
            # Windows uses http://tauri.localhost for bundled assets.
            assert self.evaluate("return ['tauri:', 'asset:'].includes(location.protocol) || location.hostname === 'tauri.localhost'"), 'App loaded a development server'
            self.evaluate("window.__verificationErrors=[]; addEventListener('error',e=>window.__verificationErrors.push(e.message)); addEventListener('unhandledrejection',e=>window.__verificationErrors.push(String(e.reason)))")
            return self
        except BaseException:
            self.close()
            raise

    def evaluate(self, script, *args):
        return self.request(self.session + '/execute/sync', {'script': script, 'args': list(args)})

    def wait(self, script, description, timeout=20):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self.evaluate(script):
                return
            time.sleep(0.2)
        raise AssertionError(f'Timed out: {description}')

    def click(self, selector):
        self.wait(f'return !!document.querySelector({json.dumps(selector)})', selector)
        self.evaluate('document.querySelector(arguments[0]).click()', selector)

    def button(self, label):
        predicate = f"[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==={json.dumps(label)} && !b.disabled)"
        self.wait(f'return !!({predicate})', label)
        self.evaluate(f'({predicate}).click()')

    def fill(self, selector, value):
        self.wait(f'return !!document.querySelector({json.dumps(selector)})', selector)
        # Use the native setter so React receives the input change. This tests
        # form handling, not OS keyboard synthesis or native folder dialogs.
        self.evaluate("""
            const input=document.querySelector(arguments[0]);
            const prototype=input.tagName==='TEXTAREA' ? HTMLTextAreaElement.prototype :
                input.tagName==='SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(prototype,'value').set.call(input,arguments[1]);
            input.dispatchEvent(new Event('input',{bubbles:true}));
            input.dispatchEvent(new Event('change',{bubbles:true}));
        """, selector, value)

    def capture(self, name):
        stem = self.artifacts / f'{self.phase}-{name}'
        stem.with_suffix('.txt').write_text(self.evaluate('return document.body.innerText'), encoding='utf-8')
        stem.with_suffix('.png').write_bytes(base64.b64decode(self.request(self.session + '/screenshot')))

    def quit(self):
        # Wait for a real process exit; a page reload is not a persistence test.
        errors = self.evaluate('return window.__verificationErrors')
        assert errors == [], f'Unhandled frontend errors: {errors}'
        self.evaluate("setTimeout(()=>window.__TAURI_INTERNALS__.invoke('quit_app'),100); return true")
        self.process.wait(timeout=15)
        assert self.process.returncode == 0, f'App exited with {self.process.returncode}'

    def close(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=10)
        if self.log:
            self.log.close()

    def __exit__(self, error_type, error, traceback):
        try:
            if error_type and self.session and self.process.poll() is None:
                try:
                    self.capture('failure')
                except Exception as capture_error:
                    print(f'Failure capture unavailable: {capture_error}', flush=True)
        finally:
            self.close()
