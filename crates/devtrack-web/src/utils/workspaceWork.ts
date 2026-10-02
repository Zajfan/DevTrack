import type { Project, Task } from '../types/index';
import type { PlannedIssues, WorkCommit, WorkHistory } from '../types/repository';

export interface WorkItem extends Task {
  work_key: string;
  project_ids: number[];
  source: 'local' | 'github' | 'commit';
  commit?: WorkCommit;
}
export interface ProjectWorkSnapshot {
  project: Project;
  issues?: Pick<PlannedIssues, 'repository' | 'issues'>;
  history?: Pick<WorkHistory, 'repository' | 'commits'>;
}
export const taskStatus = (status: string) => ['done','completed','closed'].includes(status.toLowerCase()) ? 'Done' : 'Todo';
export const meaningfulCommit = (commit: WorkCommit) => ['Feature','Bug fix','Performance','Function added'].includes(commit.category);

export function projectPlannedWork(project: Project, tasks: Task[], issues?: ProjectWorkSnapshot['issues']): WorkItem[] {
  const local: WorkItem[] = tasks.filter(t=>t.project_id===project.id).map(t=>({
    ...t, project_ids:[project.id], status:taskStatus(t.status), project_name:project.name, source:'local', work_key:`local:${t.id}`,
  }));
  const repository=issues?.repository?.toLowerCase() ?? `project:${project.id}`;
  const remote: WorkItem[]=(issues?.issues ?? []).map(issue=>({
    id:-issue.number, project_ids:[project.id], project_id:project.id, project_name:project.name, title:issue.title,
    description:issue.description, status:'Todo', priority:'Medium', target_version:issue.target_version,
    created_at:issue.created_at, github_url:issue.url, github_number:issue.number, github_milestone:issue.milestone,
    source:'github',work_key:`github:${repository}:${issue.number}`,
  }));
  return [...local,...remote];
}

export function buildWorkspaceWork(tasks: Task[], snapshots: ProjectWorkSnapshot[]): WorkItem[] {
  const items: WorkItem[]=[];
  for(const snapshot of snapshots) {
    const {project,issues,history}=snapshot;
    items.push(...projectPlannedWork(project,tasks,issues));
    const repository=history?.repository?.toLowerCase() ?? project.path;
    for(const commit of history?.commits ?? []) {
      if(!meaningfulCommit(commit)) continue;
      items.push({id:0,project_ids:[project.id],project_id:project.id,project_name:project.name,title:commit.title,description:commit.evidence,
        status:'Done',priority:'Medium',created_at:commit.date,target_version:'',
        source:'commit',commit,work_key:`commit:${repository}:${commit.sha}`});
    }
  }
  const unique = new Map<string, WorkItem>();
  for (const item of items) {
    const previous = unique.get(item.work_key);
    if (previous) {
      previous.project_ids = [...new Set([...previous.project_ids, ...item.project_ids])];
      if (previous.commit && item.commit) {
        const files = new Map([...previous.commit.files, ...item.commit.files].map(file => [file.path, file]));
        previous.commit = { ...previous.commit, files: [...files.values()] };
        previous.description = [...new Set([previous.description, item.description].filter(Boolean))].join(' · ');
      }
    } else unique.set(item.work_key, item);
  }
  return [...unique.values()];
}

export function summarizeWork(items: WorkItem[]) {
  const count=(source:WorkItem['source'],status:string)=>items.filter(i=>i.source===source&&i.status===status).length;
  const localOpen=count('local','Todo'),githubOpen=count('github','Todo');
  const localCompleted=count('local','Done'),githubCompleted=count('github','Done'),commitCompleted=count('commit','Done');
  return {total:items.length,open:localOpen+githubOpen,completed:localCompleted+githubCompleted+commitCompleted,
    localOpen,githubOpen,localCompleted,githubCompleted,commitCompleted};
}
