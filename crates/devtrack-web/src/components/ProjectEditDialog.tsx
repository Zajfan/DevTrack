import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { FolderOpen, Save, X } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import { useUpdateProject } from '@hooks/useApi';
import { useSearchParams } from 'react-router-dom';
import { selectProjectDirectory } from './NativeDialogs';
import type { Project } from '../types';

export function ProjectEditDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const dialogRef = useRef<HTMLElement>(null);
  const updateProject = useUpdateProject();
  const [name, setName] = useState(project.name);
  const [path, setPath] = useState(project.path);
  const [status, setStatus] = useState(project.status);
  const [tags, setTags] = useState(project.tags);
  const [browsing, setBrowsing] = useState(false);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('input')?.focus();
    return () => {
      previousFocus?.focus();
    };
  }, []);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && !updateProject.isPending) onClose();
    if (event.key !== 'Tab') return;
    const items = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)',
    );
    if (!items?.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const browse = async () => {
    setBrowsing(true);
    try {
      const selected = await selectProjectDirectory();
      if (selected) setPath(selected);
    } catch {
      // The path remains editable directly when the native picker is unavailable.
    } finally {
      setBrowsing(false);
    }
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    updateProject.mutate(
      { id: project.id, data: { name: name.trim(), path: path.trim(), status, tags: tags.trim() } },
      { onSuccess: () => {
        if (path.trim() !== project.path) {
          const next = new URLSearchParams(searchParams);
          next.delete('path');
          next.delete('file');
          setSearchParams(next, { replace: true });
        }
        onClose();
      } },
    );
  };

  return (
    <div className="project-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !updateProject.isPending) onClose(); }}>
      <section ref={dialogRef} onKeyDown={handleKeyDown} className="project-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-project-heading">
        <header className="project-dialog-heading">
          <div>
            <span className="project-dialog-eyebrow">PROJECT SETTINGS</span>
            <h2 id="edit-project-heading">Edit project</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close edit project dialog" onClick={onClose} disabled={updateProject.isPending}><X size={17} /></button>
        </header>
        <form onSubmit={save}>
          <label className="project-field">
            <span>Project name</span>
            <input required value={name} onChange={event => setName(event.target.value)} autoFocus />
          </label>
          <label className="project-field">
            <span>Project location</span>
            <input required value={path} onChange={event => setPath(event.target.value)} spellCheck={false} className="project-path-input" />
          </label>
          {isTauri() && <button type="button" className="project-browse-button" onClick={browse} disabled={browsing || updateProject.isPending}><FolderOpen size={14} />{browsing ? 'Choosing folder…' : 'Choose folder'}</button>}
          <div className="project-edit-fields-row">
            <label className="project-field">
              <span>Status</span>
              <select value={status} onChange={event => setStatus(event.target.value)}>
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Archived">Archived</option>
              </select>
            </label>
            <label className="project-field">
              <span>Tags <small>comma separated</small></span>
              <input value={tags} onChange={event => setTags(event.target.value)} placeholder="web, research, rust" />
            </label>
          </div>
          {updateProject.isError && <p className="project-form-error" role="alert">Could not update project: {String(updateProject.error)}</p>}
          <footer className="project-dialog-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={updateProject.isPending}>Cancel</button>
            <button type="submit" className="primary-button" disabled={updateProject.isPending || !name.trim() || !path.trim()}><Save size={14} />{updateProject.isPending ? 'Saving…' : 'Save changes'}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
