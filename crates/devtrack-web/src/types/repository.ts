export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}
export interface DirectoryListing {
  path: string;
  entries: FileEntry[];
  readme: string | null;
  readme_path: string | null;
  repository: string | null;
  branch: string | null;
}
export interface ChangedFile {
  path: string;
  additions: number;
  deletions: number;
  functions_added: string[];
}
export interface WorkCommit {
  sha: string;
  title: string;
  message: string;
  author: string;
  date: string;
  category: string;
  scope: string | null;
  files: ChangedFile[];
  evidence: string;
  url: string | null;
}
export interface WorkHistory {
  commits: WorkCommit[];
  source: string;
  repository: string | null;
  fetched_at: string;
  notice: string | null;
  has_more: boolean;
  next_page: number;
}
