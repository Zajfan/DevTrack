//! Read-only project browsing and commit evidence shared by desktop clients.
use git2::{Repository, Sort};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeSet,
    fs,
    io::Read,
    path::{Component, Path, PathBuf},
    sync::OnceLock,
};

const MAX_TEXT: u64 = 512 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryListing {
    pub path: String,
    pub entries: Vec<FileEntry>,
    pub readme: Option<String>,
    pub readme_path: Option<String>,
    pub repository: Option<String>,
    pub branch: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangedFile {
    pub path: String,
    pub additions: usize,
    pub deletions: usize,
    pub functions_added: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkCommit {
    pub sha: String,
    pub title: String,
    pub message: String,
    pub author: String,
    pub date: String,
    pub category: String,
    pub scope: Option<String>,
    pub files: Vec<ChangedFile>,
    pub evidence: String,
    pub url: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkHistory {
    pub commits: Vec<WorkCommit>,
    pub source: String,
    pub repository: Option<String>,
    pub fetched_at: String,
    pub notice: Option<String>,
    pub has_more: bool,
    pub next_page: usize,
}

pub fn github_repository(remote: &str) -> Option<String> {
    let path = remote
        .trim()
        .strip_prefix("git@github.com:")
        .or_else(|| remote.trim().strip_prefix("https://github.com/"))
        .or_else(|| remote.trim().strip_prefix("ssh://git@github.com/"))?;
    let path = path
        .trim_end_matches('/')
        .strip_suffix(".git")
        .unwrap_or(path.trim_end_matches('/'));
    let parts: Vec<_> = path.split('/').collect();
    if parts.len() != 2
        || parts.iter().any(|p| {
            p.is_empty()
                || *p == "."
                || *p == ".."
                || !p
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c))
        })
    {
        return None;
    }
    Some(path.to_string())
}

fn confined(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let path = Path::new(relative);
    if path.is_absolute()
        || path
            .components()
            .any(|c| !matches!(c, Component::Normal(_) | Component::CurDir))
    {
        return Err("Path must stay inside this project".into());
    }
    let root = root
        .canonicalize()
        .map_err(|_| "The project folder is unavailable. Check its saved path.".to_string())?;
    let target = root.join(path).canonicalize().map_err(|e| e.to_string())?;
    if !target.starts_with(&root) {
        return Err("Links outside the project cannot be opened".into());
    }
    Ok(target)
}

pub fn read_text(root: &Path, relative: &str) -> Result<String, String> {
    let path = confined(root, relative)?;
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    if !metadata.is_file() {
        return Err("Select a regular text file".into());
    }
    if metadata.len() > MAX_TEXT {
        return Err(
            "Preview is limited to text files under 512 KB. Open this file in your editor.".into(),
        );
    }
    let mut bytes = Vec::new();
    fs::File::open(path)
        .map_err(|e| e.to_string())?
        .take(MAX_TEXT + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() as u64 > MAX_TEXT || bytes.contains(&0) {
        return Err("Binary or oversized file. Open it in your editor.".into());
    }
    String::from_utf8(bytes)
        .map_err(|_| "This file is not UTF-8 text. Open it in your editor.".into())
}

pub fn repository_info(root: &Path) -> (Option<String>, Option<String>, String) {
    let Ok(repo) = Repository::discover(root) else {
        return (None, None, String::new());
    };
    let remote = repo
        .find_remote("origin")
        .ok()
        .and_then(|r| r.url().ok().and_then(github_repository));
    let branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().ok().map(str::to_string));
    let prefix = repo
        .workdir()
        .and_then(|w| {
            root.canonicalize()
                .ok()?
                .strip_prefix(w.canonicalize().ok()?)
                .ok()
                .map(|p| p.to_string_lossy().replace('\\', "/"))
        })
        .unwrap_or_default();
    (remote, branch, prefix)
}

pub fn list_directory(root: &Path, relative: &str) -> Result<DirectoryListing, String> {
    let directory = confined(root, relative)?;
    if !directory.is_dir() {
        return Err("This is not a directory".into());
    }
    let mut entries = Vec::new();
    for entry in fs::read_dir(directory).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name == ".git" {
            continue;
        }
        let path = if relative.is_empty() {
            name.clone()
        } else {
            format!("{relative}/{name}")
        };
        // Do not expose links outside the project, sockets, devices or FIFOs.
        let Ok(target) = confined(root, &path) else {
            continue;
        };
        let Ok(meta) = fs::metadata(target) else {
            continue;
        };
        if !meta.is_file() && !meta.is_dir() {
            continue;
        }
        entries.push(FileEntry {
            name,
            path,
            is_dir: meta.is_dir(),
            size: meta.len(),
        });
        if entries.len() > 10_000 {
            return Err("This folder has too many entries. Open it in your file explorer.".into());
        }
    }
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    let readme_path = entries
        .iter()
        .find(|e| !e.is_dir && e.name.eq_ignore_ascii_case("README.md"))
        .or_else(|| {
            entries.iter().find(|e| {
                !e.is_dir
                    && ["readme", "readme.txt", "readme.markdown"]
                        .contains(&e.name.to_lowercase().as_str())
            })
        })
        .map(|e| e.path.clone());
    let readme = readme_path.as_ref().and_then(|p| read_text(root, p).ok());
    let (repository, branch, _) = repository_info(root);
    Ok(DirectoryListing {
        path: relative.into(),
        entries,
        readme,
        readme_path,
        repository,
        branch,
    })
}

fn declaration(line: &str) -> Option<String> {
    static REGEX: OnceLock<Regex> = OnceLock::new();
    let pattern = REGEX.get_or_init(|| Regex::new(r"^\s*(?:(?:pub(?:\([^)]*\))?|async|export|default|static|unsafe)\s+)*(?:(?:fn|function|def|func)\s+(?:\([^)]*\)\s*)?([A-Za-z_$][\w$]*)\s*[<(]|\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|(?:\([^)]*\)|[\w$]+)\s*(?::[^=]+)?=>))").unwrap());
    pattern
        .captures(line)
        .and_then(|c| c.get(1).or_else(|| c.get(2)))
        .map(|n| n.as_str().to_string())
}

pub fn added_functions(patch: &str) -> Vec<String> {
    let mut added = BTreeSet::new();
    let mut removed = BTreeSet::new();
    for line in patch.lines() {
        if line.starts_with("+++") || line.starts_with("---") {
            continue;
        }
        if let Some(text) = line.strip_prefix('+') {
            if let Some(name) = declaration(text) {
                added.insert(name);
            }
        }
        if let Some(text) = line.strip_prefix('-') {
            if let Some(name) = declaration(text) {
                removed.insert(name);
            }
        }
    }
    added.difference(&removed).cloned().collect()
}

pub fn file_functions(path: &str, patch: &str) -> Vec<String> {
    let extension=Path::new(path).extension().and_then(|e|e.to_str()).unwrap_or("");
    if ["rs","js","jsx","ts","tsx","mjs","cjs","py","go"].contains(&extension) {added_functions(patch)} else {Vec::new()}
}

fn conventional(title: &str) -> Option<(&str, Option<String>)> {
    let (prefix, _) = title.split_once(':')?;
    let prefix = prefix.trim_end_matches('!');
    let (kind, scope) = prefix
        .split_once('(')
        .map(|(k, s)| (k, Some(s.trim_end_matches(')').into())))
        .unwrap_or((prefix, None));
    Some((kind, scope))
}
pub fn classify(title: &str, files: &[String], functions: &[String]) -> String {
    let lower = title.to_lowercase();
    let kind = conventional(&lower).map(|(k, _)| k).unwrap_or("");
    let category = match kind {
        "feat" | "feature" => "Feature",
        "fix" | "bugfix" => "Bug fix",
        "docs" => "Documentation",
        "refactor" => "Refactor",
        "test" | "tests" => "Tests",
        "chore" | "build" | "ci" | "style" => "Maintenance",
        "perf" => "Performance",
        "revert" => "Revert",
        _ => {
            if lower.starts_with("merge ") {
                "Merge"
            } else if lower.starts_with("fix ")
                || lower.starts_with("fixes ")
                || lower.starts_with("fixed ")
            {
                "Bug fix"
            } else if lower.starts_with("add ") || lower.starts_with("implement ") {
                "Feature"
            } else if !files.is_empty()
                && files
                    .iter()
                    .all(|p| p.ends_with(".md") || p.starts_with("docs/"))
            {
                "Documentation"
            } else if !functions.is_empty() {
                "Function added"
            } else {
                "Other"
            }
        }
    };
    category.into()
}

pub fn normalize_commit(
    sha: String,
    message: String,
    author: String,
    date: String,
    files: Vec<ChangedFile>,
    repository: Option<&str>,
) -> WorkCommit {
    let title = message
        .lines()
        .next()
        .unwrap_or("Untitled commit")
        .to_string();
    let functions: Vec<_> = files
        .iter()
        .flat_map(|f| f.functions_added.iter().cloned())
        .collect();
    let paths: Vec<_> = files.iter().map(|f| f.path.clone()).collect();
    let category = classify(&title, &paths, &functions);
    let scope = conventional(&title).and_then(|(_, s)| s);
    let evidence = if conventional(&title.to_lowercase()).is_some() && category != "Other" {
        "Commit type"
    } else if category == "Function added" {
        "Added declarations detected in diff"
    } else if category == "Documentation" {
        "Changed file paths"
    } else {
        "Commit title (inferred)"
    }
    .into();
    let url = repository.map(|r| format!("https://github.com/{r}/commit/{sha}"));
    WorkCommit {
        sha,
        title,
        message,
        author,
        date,
        category,
        scope,
        files,
        evidence,
        url,
    }
}

pub fn local_commit(root: &Path, sha: &str) -> Result<WorkCommit, String> {
    let repo = Repository::discover(root).map_err(|e| e.to_string())?;
    let commit = repo
        .find_commit(git2::Oid::from_str(sha).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    let tree = commit.tree().map_err(|e| e.to_string())?;
    let parent = commit.parent(0).ok().and_then(|c| c.tree().ok());
    let diff = repo
        .diff_tree_to_tree(parent.as_ref(), Some(&tree), None)
        .map_err(|e| e.to_string())?;
    let (_, _, prefix) = repository_info(root);
    let mut files = Vec::new();
    for (index, delta) in diff.deltas().enumerate() {
        let path = delta
            .new_file()
            .path()
            .or(delta.old_file().path())
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_default();
        if !prefix.is_empty() && !path.starts_with(&format!("{prefix}/")) {
            continue;
        }
        let mut patch = String::new();
        let mut additions = 0;
        let mut deletions = 0;
        if let Ok(Some(mut p)) = git2::Patch::from_diff(&diff, index) {
            if let Ok((_, a, d)) = p.line_stats() {
                additions = a;
                deletions = d;
            }
            p.print(&mut |_, _, line| {
                if patch.len() < 512_000 {
                    patch.push(line.origin());
                    patch.push_str(&String::from_utf8_lossy(line.content()));
                }
                true
            })
            .ok();
        }
        let functions_added=file_functions(&path,&patch);
        files.push(ChangedFile {
            path,
            additions,
            deletions,
            functions_added,
        });
    }
    let date = chrono::DateTime::from_timestamp(commit.time().seconds(), 0)
        .map(|d| d.to_rfc3339())
        .unwrap_or_default();
    let (remote, _, _) = repository_info(root);
    let author = commit.author().name().unwrap_or("Unknown").to_string();
    Ok(normalize_commit(
        commit.id().to_string(),
        commit.message().unwrap_or("").into(),
        author,
        date,
        files,
        remote.as_deref(),
    ))
}

pub fn local_history(root: &Path) -> WorkHistory {
    let (repository, _, _) = repository_info(root);
    let mut commits = Vec::new();
    if let Ok(repo) = Repository::discover(root) {
        if let Ok(mut walk) = repo.revwalk() {
            walk.set_sorting(Sort::TIME).ok();
            walk.push_head().ok();
            for oid in walk.take(200).flatten() {
                if let Ok(commit) = local_commit(root, &oid.to_string()) {
                    if !commit.files.is_empty() {
                        commits.push(commit);
                    }
                }
            }
        }
    }
    WorkHistory {
        commits,
        source: "Local Git".into(),
        repository,
        fetched_at: chrono::Utc::now().to_rfc3339(),
        notice: None,
        has_more: false,
        next_page: 1,
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };
    fn fixture() -> std::path::PathBuf {
        let p = std::env::temp_dir().join(format!(
            "devtrack-repository-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&p).unwrap();
        p
    }
    #[test]
    fn directory_and_commit_evidence_respect_project_subfolder() {
        let root = fixture();
        fs::create_dir(root.join("apps")).unwrap();
        fs::create_dir(root.join("docs")).unwrap();
        fs::write(root.join("apps/README.md"), "# App").unwrap();
        fs::write(root.join("apps/timer.rs"), "pub fn pause_timer() {}\n").unwrap();
        fs::write(root.join("docs/guide.md"), "# Elsewhere").unwrap();
        let repo = Repository::init(&root).unwrap();
        repo.remote("origin", "git@github.com:Team/Repo.git").unwrap();
        let mut index = repo.index().unwrap();
        index.add_all(["*"],git2::IndexAddOption::DEFAULT,None).unwrap();
        let tree_id=index.write_tree().unwrap();
        let tree=repo.find_tree(tree_id).unwrap();
        let signature=git2::Signature::now("Developer","dev@example.test").unwrap();
        let id=repo.commit(Some("HEAD"),&signature,&signature,"feat(timer): add pause",&tree,&[]).unwrap();
        let listing=list_directory(&root,"apps").unwrap();
        assert_eq!(listing.readme.as_deref(),Some("# App"));
        assert_eq!(listing.repository.as_deref(),Some("Team/Repo"));
        let evidence=local_commit(&root.join("apps"),&id.to_string()).unwrap();
        assert!(evidence.files.iter().all(|f|f.path.starts_with("apps/")));
        assert!(evidence.files.iter().any(|f|f.functions_added.contains(&"pause_timer".into())));
        assert_eq!(evidence.category,"Feature");
        assert_eq!(local_history(&root.join("apps")).commits.len(),1);
        drop(tree);drop(index);drop(repo);fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn github_remotes_accept_ssh_and_https_and_reject_other_hosts() {
        assert_eq!(
            github_repository("git@github.com:Team/Repo.git"),
            Some("Team/Repo".into())
        );
        assert_eq!(
            github_repository("https://github.com/Team/Repo.git"),
            Some("Team/Repo".into())
        );
        assert_eq!(
            github_repository("ssh://git@github.com/Team/Repo.git"),
            Some("Team/Repo".into())
        );
        assert_eq!(
            github_repository("https://github.com.evil.test/Team/Repo"),
            None
        );
        assert_eq!(github_repository("git@github.com:../Repo"), None);
    }
    #[test]
    fn reads_project_text_but_rejects_parent_traversal_binary_and_large_files() {
        let root = fixture();
        fs::write(root.join("README.md"), "# A project").unwrap();
        assert_eq!(read_text(&root, "README.md").unwrap(), "# A project");
        assert!(read_text(&root, "../secret").is_err());
        assert!(read_text(&root, root.join("README.md").to_str().unwrap()).is_err());
        fs::write(root.join("binary"), [0, 1, 2]).unwrap();
        assert!(read_text(&root, "binary").is_err());
        fs::write(root.join("large"), vec![b'a'; 600_000]).unwrap();
        assert!(read_text(&root, "large").is_err());
        fs::remove_dir_all(root).unwrap();
    }
    #[cfg(unix)]
    #[test]
    fn rejects_symlinks_outside_registered_project() {
        let root = fixture();
        let outside = fixture();
        fs::write(outside.join("secret"), "private").unwrap();
        std::os::unix::fs::symlink(outside.join("secret"), root.join("link")).unwrap();
        assert!(read_text(&root, "link").is_err());
        fs::remove_dir_all(root).unwrap();
        fs::remove_dir_all(outside).unwrap();
    }
    #[test]
    fn distinguishes_features_fixes_functions_and_routine_work() {
        assert_eq!(classify("feat(timer): pause sessions", &[], &[]), "Feature");
        assert_eq!(classify("Fix broken project picker", &[], &[]), "Bug fix");
        assert_eq!(
            classify("chore: update dependencies", &[], &[]),
            "Maintenance"
        );
        assert_eq!(
            classify("update", &["README.md".into()], &[]),
            "Documentation"
        );
        assert_eq!(
            classify("update", &["src/timer.rs".into()], &["pause_timer".into()]),
            "Function added"
        );
        assert_eq!(
            classify("random commit", &["src/timer.rs".into()], &[]),
            "Other"
        );
    }
    #[test]
    fn function_evidence_only_counts_added_declarations_not_calls_or_changed_signatures() {
        let patch="@@ -1,3 +1,5 @@\n-pub fn existing(old: i32) {\n+pub fn existing(new: i64) {\n+pub async fn pause_timer(id: i64) {\n+  save_timer(id);\n+export const useProjects = () => [];\n+def read_project(path):\n";
        let names = added_functions(patch);
        assert!(names.contains(&"pause_timer".into()));
        assert!(names.contains(&"useProjects".into()));
        assert!(names.contains(&"read_project".into()));
        assert!(!names.contains(&"existing".into()));
        assert!(!names.contains(&"save_timer".into()));
        assert!(added_functions("+// fn example() {}\n+const doc = 'function pretend() {}';\n").is_empty());
    }
}
