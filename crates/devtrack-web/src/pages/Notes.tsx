import { useProjects, useNotes, useUpdateNotes } from '@hooks/useApi';
import { useAppStore } from '@store/appStore';
import { useEffect, useState } from 'react';
import { cn } from '@utils/helpers';
import { FileText, Save, Loader2, StickyNote, Eye, Pencil } from 'lucide-react';
import { MarkdownPreview } from '@components/MarkdownPreview';

export function Notes() {
  const { selectedProjectId, setSelectedProject } = useAppStore();
  const { data: projects } = useProjects(false);
  const { data: notes, isLoading } = useNotes(selectedProjectId);
  const updateNotes = useUpdateNotes();

  const [draft, setDraft] = useState('');
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  // Load notes into draft when project or notes change (only when not editing)
  useEffect(() => {
    if (!dirty) {
      setDraft(notes ?? '');
    }
  }, [notes, dirty]);

  const handleSave = () => {
    if (!selectedProjectId) return;
    setError(null);
    updateNotes.mutate(
      { projectId: selectedProjectId, content: draft },
      {
        onSuccess: () => {
          setDirty(false);
          setSavedAt(new Date().toLocaleTimeString());
        },
        onError: (err) => setError(`Could not save notes: ${String(err)}`),
      }
    );
  };

  // Ctrl+S saves
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty) handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Markdown notes, stored locally per project
            {savedAt && <span className="ml-2 text-green-600 dark:text-green-400 text-sm">saved {savedAt}</span>}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || updateNotes.isPending || !selectedProjectId}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 flex items-center gap-2"
        >
          {updateNotes.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save{dirty ? '' : 'd'}
        </button>
      </div>

      {!selectedProjectId || !selectedProject ? (
        <div className="text-center py-12">
          <StickyNote className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Select a Project</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Choose which project's notes you want to edit</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {(projects || []).map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProject(p.id)}
                className="native-pane p-4 hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
              >
                <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.path}</p>
              </button>
            ))}
            {!projects?.length && (
              <p className="col-span-full text-sm text-gray-500 dark:text-gray-400">No projects yet.</p>
            )}
          </div>
        </div>
      ) : isLoading ? (
        <div className="native-pane p-6 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
      ) : (
        <div className="native-pane overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{selectedProject.name}.md</span>
            {dirty && <span className="text-xs text-yellow-600 dark:text-yellow-400">unsaved changes</span>}
          </div>
          <textarea
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setDirty(true); }}
            spellCheck={false}
            className="w-full h-[60vh] p-4 bg-transparent border-0 resize-none font-mono text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
            placeholder="# Project notes

- Write anything here, markdown supported"
          />
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}