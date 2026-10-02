import { useState } from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  FileCode2,
  GitCommitHorizontal,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  useProjectHistory,
  useSyncProjectHistory,
  openProjectGitHub,
} from "../hooks/useRepository";

export function ProjectWork({ id }: { id: number }) {
  const { data: history, isLoading, error } = useProjectHistory(id, true);
  const sync = useSyncProjectHistory(id);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("meaningful");
  const [module, setModule] = useState("");
  const [file, setFile] = useState("");
  const [functionName, setFunctionName] = useState("");
  const [author, setAuthor] = useState("");
  const [sort, setSort] = useState("newest");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const commits = history?.commits ?? [];
  const modules = [
    ...new Set(
      commits
        .flatMap((c) => [
          c.scope ?? "",
          ...c.files.map(
            (f) => f.path.split("/").slice(0, -1).join("/") || "(root)",
          ),
        ])
        .filter(Boolean),
    ),
  ].sort();
  const authors = [...new Set(commits.map((c) => c.author))].sort();
  const categories = [
    "Feature",
    "Bug fix",
    "Function added",
    "Performance",
    "Refactor",
    "Documentation",
    "Tests",
    "Maintenance",
    "Merge",
    "Revert",
    "Other",
  ];
  const visible = commits
    .filter((c) => {
      const matchCategory =
        category === "all" ||
        (category === "meaningful"
          ? ["Feature", "Bug fix", "Function added", "Performance"].includes(
              c.category,
            )
          : c.category === category);
      const matchingFiles = c.files.filter(
        (f) =>
          f.path.toLowerCase().includes(file.toLowerCase()) &&
          (!functionName ||
            f.functions_added.some((n) =>
              n.toLowerCase().includes(functionName.toLowerCase()),
            )),
      );
      return (
        matchCategory &&
        (!module ||
          c.scope === module ||
          c.files.some(
            (f) =>
              (f.path.split("/").slice(0, -1).join("/") || "(root)") === module,
          )) &&
        (!author || c.author === author) &&
        matchingFiles.length > 0 &&
        `${c.title} ${c.message} ${c.scope ?? ""} ${c.files.map((f) => `${f.path} ${f.functions_added.join(" ")}`).join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (sort === "newest") return b.date.localeCompare(a.date);
      if (sort === "oldest") return a.date.localeCompare(b.date);
      const key = (c: typeof a) => {
        if (sort === "author") return c.author;
        if (sort === "module")
          return (
            c.scope ??
            c.files
              .map((f) => f.path.split("/").slice(0, -1).join("/"))
              .sort()[0] ??
            ""
          );
        if (sort === "file") return c.files.map((f) => f.path).sort()[0] ?? "";
        if (sort === "function")
          return c.files.flatMap((f) => f.functions_added).sort()[0] ?? "";
        if (sort === "type") return c.category;
        return c.title;
      };
      return key(a).localeCompare(key(b)) || b.date.localeCompare(a.date);
    });
  const reset = () => {
    setSearch("");
    setCategory("meaningful");
    setModule("");
    setFile("");
    setFunctionName("");
    setAuthor("");
  };
  const open = async (sha: string) => {
    setActionError(null);
    try {
      await openProjectGitHub(id, sha);
    } catch (e) {
      setActionError(String(e));
    }
  };
  return (
    <div className="project-work">
      <div className="work-intro">
        <div>
          <h2>Completed work</h2>
          <p>
            Changes backed by commits, with the details that explain what was
            added.
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={() => sync.mutate(1)}
          disabled={sync.isPending || isLoading}
        >
          {sync.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Sync GitHub
        </button>
      </div>
      {(history?.notice || error || sync.error || actionError) && (
        <p
          className="repo-notice"
          role={error || sync.error || actionError ? "alert" : "status"}
        >
          {String(error ?? sync.error ?? actionError ?? history?.notice)}
        </p>
      )}
      <div className="work-filters">
        <div className="work-search">
          <Search size={15} />
          <input
            aria-label="Search completed work"
            placeholder="Search features, functions, or commit text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter change type"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="meaningful">Features & fixes</option>
          <option value="all">All changes</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Sort completed work"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
          <option value="type">Change type</option>
          <option value="author">Author A–Z</option>
          <option value="module">Module A–Z</option>
          <option value="file">File path A–Z</option>
          <option value="function">Function A–Z</option>
        </select>
        <select
          aria-label="Filter module"
          value={module}
          onChange={(e) => setModule(e.target.value)}
        >
          <option value="">All modules</option>
          {modules.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <input
          aria-label="Filter changed file"
          placeholder="File path contains…"
          value={file}
          onChange={(e) => setFile(e.target.value)}
        />
        <input
          aria-label="Filter added function"
          placeholder="Added function name…"
          value={functionName}
          onChange={(e) => setFunctionName(e.target.value)}
        />
        <select
          aria-label="Filter author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        >
          <option value="">All authors</option>
          {authors.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>
      <div className="work-summary">
        <span>
          <strong>{visible.length}</strong> of {commits.length} imported changes
        </span>
        <button className="text-action" onClick={reset}>
          Reset filters
        </button>
        <span className="work-source">
          {history?.source ?? "Connecting…"}
          {history?.fetched_at &&
            ` · ${new Date(history.fetched_at).toLocaleString()}`}
        </span>
      </div>
      {isLoading ? (
        <div className="repo-loading">
          <Loader2 size={18} className="animate-spin" />
          Reading repository history…
        </div>
      ) : (
        <div className="work-list">
          {visible.map((commit) => {
            const functions = commit.files.flatMap((f) =>
              f.functions_added.map((name) => ({ name, path: f.path })),
            );
            return (
              <article key={commit.sha} className="work-entry">
                <div className="work-entry-main">
                  <button
                    className="work-expand"
                    aria-label={`${expanded === commit.sha ? "Collapse" : "Expand"} ${commit.title}`}
                    aria-expanded={expanded === commit.sha}
                    onClick={() =>
                      setExpanded(expanded === commit.sha ? null : commit.sha)
                    }
                  >
                    {expanded === commit.sha ? (
                      <ChevronDown size={15} />
                    ) : (
                      <ChevronRight size={15} />
                    )}
                  </button>
                  <div className="work-entry-info">
                    <button
                      className="work-title"
                      onClick={() =>
                        setExpanded(expanded === commit.sha ? null : commit.sha)
                      }
                    >
                      {commit.title}
                    </button>
                    <div className="work-meta">
                      <span>{commit.author}</span>
                      <span>{new Date(commit.date).toLocaleDateString()}</span>
                      <code>{commit.sha.slice(0, 7)}</code>
                      {commit.scope && <span>{commit.scope}</span>}
                    </div>
                    {functions.length > 0 && (
                      <div className="function-chips">
                        {functions.slice(0, 4).map((f) => (
                          <button
                            key={`${f.path}:${f.name}`}
                            title={f.path}
                            onClick={() => setFunctionName(f.name)}
                          >
                            <FileCode2 size={11} />
                            {f.name}
                          </button>
                        ))}
                        {functions.length > 4 && (
                          <span>+{functions.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span
                    className={`work-category ${commit.category === "Feature" || commit.category === "Function added" ? "feature" : commit.category === "Bug fix" ? "fix" : ""}`}
                  >
                    {commit.category}
                  </span>
                  {commit.url && (
                    <button
                      className="icon-button"
                      aria-label={`Open commit ${commit.sha.slice(0, 7)} on GitHub`}
                      onClick={() => open(commit.sha)}
                    >
                      <ArrowUpRight size={15} />
                    </button>
                  )}
                </div>
                {expanded === commit.sha && (
                  <div className="work-evidence">
                    <p className="evidence-label">
                      <GitCommitHorizontal size={13} />
                      Classified from: {commit.evidence}
                    </p>
                    {commit.message !== commit.title && (
                      <pre className="commit-message">{commit.message}</pre>
                    )}
                    <div className="work-file-evidence">
                      {commit.files.map((f) => (
                        <div key={f.path}>
                          <span className="evidence-path">{f.path}</span>
                          <span className="diff-stats">
                            <b>+{f.additions}</b>
                            <em>−{f.deletions}</em>
                          </span>
                          {f.functions_added.length > 0 && (
                            <p>
                              Added declarations: {f.functions_added.join(", ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          {!visible.length && (
            <div className="repo-empty">
              <GitCommitHorizontal size={25} />
              <h3>
                {commits.length
                  ? "No matching changes"
                  : "No history available yet"}
              </h3>
              <p>
                {commits.length
                  ? "Try another type, module, or search. Routine commits are hidden by default."
                  : "Sync GitHub, or check that this project has a Git repository."}
              </p>
              {commits.length > 0 && (
                <button
                  className="secondary-button"
                  onClick={() => {
                    reset();
                    setCategory("all");
                  }}
                >
                  Show all changes
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {history?.has_more && (
        <button
          className="secondary-button load-history"
          disabled={sync.isPending}
          onClick={() => sync.mutate(history.next_page)}
        >
          {sync.isPending ? "Loading…" : "Load older commits"}
        </button>
      )}
      <p className="work-footnote">
        <ArrowDownUp size={12} />
        Imported history is separate from your task list. Types and added
        function declarations are inferred from commit messages and available
        diffs; they can miss changes or include renamed functions.
      </p>
    </div>
  );
}
