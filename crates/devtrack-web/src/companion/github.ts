import { validVersion, normalizeRepository } from './model.ts';
export type WorkCategory = 'feature' | 'fix' | 'performance' | 'maintenance' | 'other';
export type GitHubWork = { sha: string; title: string; date: string; author: string; category: WorkCategory; files: { path: string; functions: string[] }[] };
export type GitHubIssue = { number: number; title: string; description: string; target_version: string; created_at: string };
export type RepositoryWork = { repository: string; fetched_at: string; commits: GitHubWork[]; issues: GitHubIssue[]; notice: string };

export function classifyCommit(title: string, functions: string[]): WorkCategory {
  if (/^(chore|docs|ci|build|test|style|refactor|revert|merge)(\(.+?\))?[!: ]/i.test(title)) return 'maintenance';
  if (/^(fix|bugfix|hotfix)(\(.+?\))?[!:]|\b(fix|fixes|fixed|repair|resolve[ds]?)\b/i.test(title)) return 'fix';
  if (/^perf(\(.+?\))?[!:]|\b(optimi[sz]e|performance)\b/i.test(title)) return 'performance';
  if (/^feat(\(.+?\))?[!:]|\b(add|adds|added|implement|introduce|enable|support)\b/i.test(title) || functions.length) return 'feature';
  return 'other';
}

export function addedFunctions(path: string, patch: string): string[] {
  if (!/\.(ts|tsx|js|jsx|mjs|rs|py|go|kt|java|c|cpp|h|swift|ets)$/.test(path)) return [];
  const declarations = (line: string) => {
    const match = line.match(/^\s*(?:(?:export|pub(?:\([^)]*\))?|async|public|private|protected|static|override|suspend)\s+)*(?:function\s+|fn\s+|def\s+|fun\s+|func\s+)([A-Za-z_][\w]*)\s*(?:<[^>]*>)?\s*\(/)
      ?? line.match(/^\s*(?:export\s+)?(?:const|let)\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*(?::[^=]+)?=>/);
    return match?.[1];
  };
  const removed = new Set(patch.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---')).map(l => declarations(l.slice(1))).filter(Boolean));
  return [...new Set(patch.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => declarations(l.slice(1))).filter((name): name is string => !!name && !removed.has(name)))];
}

export function normalizeIssues(input: unknown[]): GitHubIssue[] {
  return input.filter((raw): raw is Record<string, unknown> => !!raw && typeof raw === 'object' && !('pull_request' in raw)).map(raw => {
    const milestone = raw.milestone as { title?: string } | null;
    const candidate = (milestone?.title ?? '').trim().replace(/^(?:release\s+)?v?/i, '');
    return { number: Number(raw.number), title: String(raw.title ?? ''), description: String(raw.body ?? ''), target_version: validVersion(candidate) ? candidate : '', created_at: String(raw.created_at ?? '') };
  }).filter(issue => Number.isSafeInteger(issue.number) && issue.number > 0 && issue.title);
}

async function github(repository: string, endpoint: string): Promise<unknown> {
  const response = await fetch(`https://api.github.com/repos/${normalizeRepository(repository)}/${endpoint}`, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? 'GitHub request limit reached. Keep using cached work and try again later.' : response.status === 404 ? 'Repository not found or private. This companion currently reads public repositories.' : `GitHub returned ${response.status}.`);
  return response.json();
}

export async function fetchRepositoryWork(repository: string): Promise<RepositoryWork> {
  const repo = normalizeRepository(repository);
  const [commitsRaw, issuesRaw] = await Promise.all([github(repo, 'commits?per_page=20'), github(repo, 'issues?state=open&per_page=100')]);
  if (!Array.isArray(commitsRaw) || !Array.isArray(issuesRaw)) throw new Error('Unexpected GitHub response.');
  let notice = 'Latest 20 commits and up to 100 open issues for the whole repository. GitHub issues are read-only.';
  const commits: GitHubWork[] = [];
  // Small batches avoid bursting GitHub's public API; keep partial evidence if its limit is reached.
  for (let offset = 0; offset < commitsRaw.length; offset += 3) {
    const batch = await Promise.all(commitsRaw.slice(offset, offset + 3).map(async (raw: Record<string, any>) => {
      let files: GitHubWork['files'] = [];
      try {
        const details = await github(repo, `commits/${encodeURIComponent(raw.sha)}`) as Record<string, any>;
        files = (details.files ?? []).map((file: Record<string, any>) => ({ path: String(file.filename), functions: addedFunctions(String(file.filename), String(file.patch ?? '')) }));
      } catch (error) { notice = `${String((error as Error).message)} File/function evidence is partial. ${notice}`; }
      const title = String(raw.commit?.message ?? '').split('\n')[0];
      return { sha: String(raw.sha), title, date: String(raw.commit?.author?.date ?? ''), author: String(raw.commit?.author?.name ?? ''), category: classifyCommit(title, files.flatMap(file => file.functions)), files };
    }));
    commits.push(...batch);
    if (notice.includes('partial')) {
      for (const raw of commitsRaw.slice(offset + 3)) {
        const title = String(raw.commit?.message ?? '').split('\n')[0];
        commits.push({ sha: String(raw.sha), title, date: String(raw.commit?.author?.date ?? ''), author: String(raw.commit?.author?.name ?? ''), category: classifyCommit(title, []), files: [] });
      }
      break;
    }
  }
  return { repository: repo, fetched_at: new Date().toISOString(), commits, issues: normalizeIssues(issuesRaw), notice };
}
