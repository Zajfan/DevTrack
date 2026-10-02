import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  File,
  FileText,
  Folder,
  GitBranch,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useProjectDirectory, useProjectFile } from "../hooks/useRepository";
import { MarkdownPreview } from "./MarkdownPreview";

const sizeLabel = (size: number) =>
  size < 1024
    ? `${size} B`
    : size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;
export function ProjectFiles({ id }: { id: number }) {
  const [params, setParams] = useSearchParams();
  const path = params.get("path") ?? "";
  const file = params.get("file");
  const [filter, setFilter] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [sort, setSort] = useState("name");
  const {
    data: listing,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useProjectDirectory(id, path);
  const preview = useProjectFile(id, file);
  const browse = (path: string, file?: string) => {
    const next = new URLSearchParams(params);
    next.delete("file");
    next.delete("path");
    if (path) next.set("path", path);
    if (file) next.set("file", file);
    setParams(next);
    setFilter("");
  };
  const followLink = async (href: string, source: string) => {
    setLinkError(null);
    if (/^(https?:|mailto:)/i.test(href)) {
      try {
        await invoke("project_documentation_link", { id, url: href });
      } catch (e) {
        setLinkError(String(e));
      }
    } else if (!href.startsWith("#")) {
      const resolved = new URL(
        href,
        `https://project.local/${source}`,
      ).pathname.slice(1);
      const target = decodeURIComponent(resolved);
      if (target.endsWith("/") || !target.split("/").pop()?.includes("."))
        browse(target.replace(/\/$/, ""));
      else browse(target.split("/").slice(0, -1).join("/"), target);
    }
  };
  const refresh = () => {
    refetch();
    if (file) preview.refetch();
  };
  const entries = [...(listing?.entries ?? [])]
    .filter((e) => e.name.toLowerCase().includes(filter.toLowerCase()))
    .sort(
      (a, b) =>
        Number(b.is_dir) - Number(a.is_dir) ||
        (sort === "size" ? b.size - a.size : a.name.localeCompare(b.name)),
    );
  const crumbs = path.split("/").filter(Boolean);
  return (
    <div className="project-files">
      {linkError && (
        <p className="repo-notice" role="alert">
          {linkError}
        </p>
      )}
      <div className="repo-toolbar">
        <div className="repo-branch">
          <GitBranch size={14} />
          {listing?.branch ?? "Local files"}
        </div>
        <span className="repo-origin">Working folder</span>
        <button className="text-action" onClick={refresh} disabled={isFetching}>
          {isFetching ? "Refreshing…" : "Refresh files"}
        </button>
      </div>
      <div className="file-navigation">
        <div className="file-breadcrumb">
          <button onClick={() => browse("")}>Root</button>
          {crumbs.map((part, index) => (
            <span key={index}>
              <ChevronRight size={12} />
              <button
                onClick={() => browse(crumbs.slice(0, index + 1).join("/"))}
              >
                {part}
              </button>
            </span>
          ))}
        </div>
        <div className="file-filter">
          <Search size={14} />
          <input
            aria-label="Filter files"
            placeholder="Find a file…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <select
          aria-label="Sort files"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="name">Name</option>
          <option value="size">Largest first</option>
        </select>
      </div>
      {error ? (
        <div className="detail-error" role="alert">
          <Folder size={22} />
          <h3>Folder unavailable</h3>
          <p>{String(error)}</p>
          <button className="secondary-button" onClick={() => browse("")}>
            Return to root
          </button>
        </div>
      ) : isLoading ? (
        <div className="repo-loading">
          <Loader2 size={18} className="animate-spin" />
          Reading project files…
        </div>
      ) : (
        <div className="repo-file-list">
          <div className="file-table-heading">
            <span>Name</span>
            <span>Size</span>
          </div>
          {path && (
            <button
              className="repo-file-row"
              onClick={() => browse(crumbs.slice(0, -1).join("/"))}
            >
              <ArrowLeft size={15} />
              <span>Parent folder</span>
            </button>
          )}
          {entries.map((entry) => (
            <button
              className={`repo-file-row ${file === entry.path ? "selected" : ""}`}
              key={entry.path}
              onClick={() =>
                entry.is_dir ? browse(entry.path) : browse(path, entry.path)
              }
            >
              {entry.is_dir ? (
                <Folder size={17} className="folder-icon" />
              ) : (
                <File size={16} />
              )}
              <span>{entry.name}</span>
              <small>{entry.is_dir ? "Folder" : sizeLabel(entry.size)}</small>
              {entry.is_dir && <ChevronRight size={13} />}
            </button>
          ))}
          {!entries.length && (
            <p className="repo-empty">
              {filter ? "No files match this filter." : "This folder is empty."}
            </p>
          )}
        </div>
      )}
      {file && (
        <section className="workspace-panel file-preview">
          <div className="panel-heading">
            <h2>
              <FileText size={15} />
              {file}
            </h2>
            <button
              className="icon-button"
              aria-label="Close file preview"
              onClick={() => browse(path)}
            >
              <X size={16} />
            </button>
          </div>
          {preview.isLoading ? (
            <div className="repo-loading">Loading file…</div>
          ) : preview.error ? (
            <p className="repo-notice" role="alert">
              {String(preview.error)}
            </p>
          ) : /\.(md|markdown)$/i.test(file) ? (
            <div className="readme-content">
              <MarkdownPreview
                content={preview.data ?? ""}
                onLink={(href) => followLink(href, file)}
              />
            </div>
          ) : (
            <pre className="source-preview">{preview.data}</pre>
          )}
        </section>
      )}
      <section className="workspace-panel repo-readme">
        <div className="panel-heading">
          <h2>
            <FileText size={15} />
            {listing?.readme_path?.split("/").pop() ?? "README"}
          </h2>
          <span className="readme-label">Documentation</span>
        </div>
        {listing?.readme ? (
          <div className="readme-content">
            <MarkdownPreview
              content={listing.readme}
              onLink={(href) =>
                followLink(href, listing.readme_path ?? "README.md")
              }
            />
          </div>
        ) : (
          <div className="repo-empty">
            <FileText size={22} />
            <h3>No README in this folder</h3>
            <p>A README.md placed here will appear beneath the file list.</p>
          </div>
        )}
      </section>
    </div>
  );
}
