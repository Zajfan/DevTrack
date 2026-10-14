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
  const [description, setDescription] = useState(project.description ?? '');
  const [conceptWhat, setConceptWhat] = useState(project.concept_what ?? '');
  const [conceptWhy, setConceptWhy] = useState(project.concept_why ?? '');
  const [conceptHow, setConceptHow] = useState(project.concept_how ?? '');
  const [conceptWhen, setConceptWhen] = useState(project.concept_when ?? '');
  const [conceptWhere, setConceptWhere] = useState(project.concept_where ?? '');
  const [conceptWithWhat, setConceptWithWhat] = useState(project.concept_with_what ?? '');
  const [browsing, setBrowsing] = useState(false);
  const [section, setSection] = useState<'basics' | 'concept'>('basics');

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('input')?.focus();
    return () => { previousFocus?.focus(); };
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
      // path remains editable when native picker is unavailable
    } finally {
      setBrowsing(false);
    }
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    updateProject.mutate(
      {
        id: project.id,
        data: {
          name: name.trim(),
          path: path.trim(),
          status,
          tags: tags.trim(),
          description: description.trim(),
          concept_what: conceptWhat.trim(),
          concept_why: conceptWhy.trim(),
          concept_how: conceptHow.trim(),
          concept_when: conceptWhen.trim(),
          concept_where: conceptWhere.trim(),
          concept_with_what: conceptWithWhat.trim(),
        },
      },
      {
        onSuccess: () => {
          if (path.trim() !== project.path) {
            const next = new URLSearchParams(searchParams);
            next.delete('path');
            next.delete('file');
            setSearchParams(next, { replace: true });
          }
          onClose();
        },
      },
    );
  };

  return (
    <div
      className="project-modal-backdrop"
      role="presentation"
      onMouseDown={event => { if (event.target === event.currentTarget && !updateProject.isPending) onClose(); }}
    >
      <section
        ref={dialogRef}
        onKeyDown={handleKeyDown}
        className="project-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-project-heading"
      >
        <header className="project-dialog-heading">
          <div>
            <span className="project-dialog-eyebrow">PROJECT SETTINGS</span>
            <h2 id="edit-project-heading">Edit project</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close edit project dialog" onClick={onClose} disabled={updateProject.isPending}>
            <X size={17} />
          </button>
        </header>

        <div className="project-edit-tabs">
          <button
            type="button"
            className={section === 'basics' ? 'active' : ''}
            onClick={() => setSection('basics')}
          >
            Details
          </button>
          <button
            type="button"
            className={section === 'concept' ? 'active' : ''}
            onClick={() => setSection('concept')}
          >
            Concept
          </button>
        </div>

        <form onSubmit={save}>
          {section === 'basics' && (
            <>
              <label className="project-field">
                <span>Project name</span>
                <input required value={name} onChange={e => setName(e.target.value)} autoFocus />
              </label>
              <label className="project-field">
                <span>Project location</span>
                <input required value={path} onChange={e => setPath(e.target.value)} spellCheck={false} className="project-path-input" />
              </label>
              {isTauri() && (
                <button type="button" className="project-browse-button" onClick={browse} disabled={browsing || updateProject.isPending}>
                  <FolderOpen size={14} />{browsing ? 'Choosing folder…' : 'Choose folder'}
                </button>
              )}
              <div className="project-edit-fields-row">
                <label className="project-field">
                  <span>Status</span>
                  <select value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Archived">Archived</option>
                  </select>
                </label>
                <label className="project-field">
                  <span>Tags <small>comma separated</small></span>
                  <input value={tags} onChange={e => setTags(e.target.value)} placeholder="web, research, rust" />
                </label>
              </div>
              <label className="project-field">
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What is this project about?"
                  maxLength={2000}
                />
              </label>
            </>
          )}

          {section === 'concept' && (
            <div className="concept-fields">
              <p className="concept-intro">Answer these prompts to build a quick mental map you can return to after months away.</p>
              <label className="project-field">
                <span>What — what is being built?</span>
                <textarea value={conceptWhat} onChange={e => setConceptWhat(e.target.value)} rows={2} placeholder="The core deliverable or feature." maxLength={1000} />
              </label>
              <label className="project-field">
                <span>Why — what problem does it solve?</span>
                <textarea value={conceptWhy} onChange={e => setConceptWhy(e.target.value)} rows={2} placeholder="The motivation or user need." maxLength={1000} />
              </label>
              <label className="project-field">
                <span>How — the approach or key decisions</span>
                <textarea value={conceptHow} onChange={e => setConceptHow(e.target.value)} rows={2} placeholder="Stack, architecture, key design choices." maxLength={1000} />
              </label>
              <label className="project-field">
                <span>When — timeline or milestones</span>
                <textarea value={conceptWhen} onChange={e => setConceptWhen(e.target.value)} rows={2} placeholder="Target dates, phases or release goals." maxLength={1000} />
              </label>
              <label className="project-field">
                <span>Where — environment or deployment target</span>
                <textarea value={conceptWhere} onChange={e => setConceptWhere(e.target.value)} rows={2} placeholder="Platforms, hosting, repo location." maxLength={1000} />
              </label>
              <label className="project-field">
                <span>With what — tools, dependencies, team</span>
                <textarea value={conceptWithWhat} onChange={e => setConceptWithWhat(e.target.value)} rows={2} placeholder="Languages, libraries, collaborators." maxLength={1000} />
              </label>
            </div>
          )}

          {updateProject.isError && (
            <p className="project-form-error" role="alert">
              Could not update project: {String(updateProject.error)}
            </p>
          )}
          <footer className="project-dialog-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={updateProject.isPending}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={updateProject.isPending || !name.trim() || !path.trim()}>
              <Save size={14} />{updateProject.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
