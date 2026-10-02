import { useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Check, CheckSquare, ChevronRight, Code2, ExternalLink, Folder, GitBranch as Github, Layers, Plus, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';
import { compareVersions } from '../utils/versions';
import { hasProjectTag, projectTags } from '../utils/tags';
import { emptyState, normalizeRepository, parseBackup, saveTask, type CompanionState, type CompanionProject, type CompanionTask } from './model';
import { fetchRepositoryWork, type RepositoryWork, type GitHubWork, type GitHubIssue } from './github';

const STORE = 'devtrack-companion-v1';
const cacheKey = (repository: string) => `devtrack-github:${repository.toLowerCase()}`;
function initialData(): { state: CompanionState; error: string; raw:string|null } {
  let saved:string|null=null;
  try { saved=localStorage.getItem(STORE); return { state:saved ? parseBackup(saved) : emptyState(), error:'',raw:saved }; }
  catch { return {state:emptyState(),error:'Saved data could not be read. Export a recovery copy, then import a valid backup before adding new data.',raw:saved}; }
}
function cachedWork(repository: string): RepositoryWork | undefined {
  try {
    const cached=JSON.parse(localStorage.getItem(cacheKey(repository)) ?? 'null');
    return cached?.repository?.toLowerCase() === repository.toLowerCase() && Array.isArray(cached.commits) && Array.isArray(cached.issues) ? cached : undefined;
  } catch { return undefined; }
}
function Modal({title,onClose,children}: {title:string;onClose:()=>void;children:ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ ref.current?.showModal(); },[]);
  return <dialog ref={ref} className="companion-dialog" aria-label={title} onCancel={event=>{event.preventDefault();onClose();}}>
    <header><h2>{title}</h2><button aria-label="Close dialog" onClick={onClose}><X size={20}/></button></header>{children}
  </dialog>;
}
function ProjectForm({project,onSave,onClose}: {project?:CompanionProject;onSave:(value:CompanionProject)=>void;onClose:()=>void}) {
  const [name,setName]=useState(project?.name ?? '');
  const [repository,setRepository]=useState(project?.repository ?? '');
  const [tags,setTags]=useState(project?.tags ?? '');
  const [error,setError]=useState('');
  const submit=(event:FormEvent)=>{
    event.preventDefault();
    try {
      if(!name.trim()) throw new Error('Project name is required.');
      onSave({id:project?.id ?? crypto.randomUUID(),name:name.trim(),repository:repository.trim()?normalizeRepository(repository):'',tags,notes:project?.notes ?? ''});
    } catch(err) {setError((err as Error).message);}
  };
  return <Modal title={project?'Edit project':'Add project'} onClose={onClose}><form onSubmit={submit}>
    <label>Project name<input value={name} onChange={e=>setName(e.target.value)} autoFocus maxLength={500} required/></label>
    <label>GitHub repository<input value={repository} onChange={e=>setRepository(e.target.value)} placeholder="owner/repository · optional" maxLength={300} autoCapitalize="none" autoCorrect="off"/></label>
    <label>Tags<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Rust, TypeScript, mobile" maxLength={2000}/></label>
    <p className="quiet">No project folder needed. GitHub access currently supports public repositories.</p>
    {error&&<p role="alert" className="error">{error}</p>}
    <footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">Save project</button></footer>
  </form></Modal>;
}
function TaskForm({task,projectId,projects,onSave,onClose}: {task?:CompanionTask;projectId:string;projects:CompanionProject[];onSave:(value:CompanionTask)=>void;onClose:()=>void}) {
  const [draft,setDraft]=useState<CompanionTask>(task ?? {id:crypto.randomUUID(),project_id:projectId,title:'',description:'',status:'todo',priority:'normal',target_version:'',updated_at:new Date().toISOString()});
  const [error,setError]=useState('');
  const field=(key:keyof CompanionTask,value:string)=>setDraft({...draft,[key]:value});
  return <Modal title={task?'Edit task':'Add task'} onClose={onClose}><form onSubmit={event=>{event.preventDefault();try{onSave({...draft,updated_at:new Date().toISOString()});}catch(err){setError((err as Error).message);}}}>
    <label>Project<select value={draft.project_id} onChange={e=>field('project_id',e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label>Task title<input value={draft.title} onChange={e=>field('title',e.target.value)} required maxLength={1000} autoFocus/></label>
    <label>Description<textarea value={draft.description} onChange={e=>field('description',e.target.value)} rows={3} maxLength={100000}/></label>
    <div className="form-row"><label>Target version<input value={draft.target_version} onChange={e=>field('target_version',e.target.value)} placeholder="0.1.0-alpha.1" maxLength={128} autoCapitalize="none"/></label>
    <label>Priority<select value={draft.priority} onChange={e=>field('priority',e.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label></div>
    <p className="quiet">Use 0.1, 0.1.0 or 0.1.0-alpha.1. Leave blank for unscheduled work.</p>
    {error&&<p role="alert" className="error">{error}</p>}
    <footer><button className="secondary" type="button" onClick={onClose}>Cancel</button><button className="primary">Save task</button></footer>
  </form></Modal>;
}
type PlannedRow = {id:string;title:string;description:string;target_version:string;status:string;source:'local'|'github';task?:CompanionTask;issue?:GitHubIssue;projectName?:string};
function Planned({state,project,work,onEdit,onToggle}: {state:CompanionState;project?:CompanionProject;work?:RepositoryWork;onEdit:(task:CompanionTask)=>void;onToggle:(task:CompanionTask)=>void}) {
  const [source,setSource]=useState('both');
  const [status,setStatus]=useState('todo');
  const [version,setVersion]=useState('*');
  const [sort,setSort]=useState('version');
  const [search,setSearch]=useState('');
  const rows:PlannedRow[]=state.tasks.filter(t=>!project||t.project_id===project.id).map(task=>({ ...task,source:'local',task,projectName:state.projects.find(p=>p.id===task.project_id)?.name}));
  if(project&&work) rows.push(...work.issues.map(issue=>({id:`github:${issue.number}`,title:issue.title,description:issue.description,target_version:issue.target_version,status:'todo',source:'github' as const,issue})));
  const versions=[...new Set(rows.map(row=>row.target_version))].sort(compareVersions);
  const filtered=rows.filter(row=>(source==='both'||row.source===source)&&(status==='all'||row.status===status)&&(version==='*'||row.target_version===version)&&`${row.title} ${row.description}`.toLowerCase().includes(search.toLowerCase()));
  filtered.sort((a,b)=>sort==='title'?a.title.localeCompare(b.title):sort==='newest'?(b.task?.updated_at??b.issue?.created_at??'').localeCompare(a.task?.updated_at??a.issue?.created_at??''):compareVersions(a.target_version,b.target_version)||a.title.localeCompare(b.title));
  const groups=sort==='version'?[...new Set(filtered.map(row=>row.target_version))]:['all'];
  return <><div className="filters"><label className="search"><Search size={17}/><input aria-label="Search planned work" placeholder="Search planned work…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <select aria-label="Task source" value={source} onChange={e=>setSource(e.target.value)}><option value="both">Both sources</option><option value="local">Local tasks</option><option value="github">GitHub issues</option></select>
    <select aria-label="Task status" value={status} onChange={e=>setStatus(e.target.value)}><option value="todo">To do</option><option value="done">Done</option><option value="all">All statuses</option></select>
    <select aria-label="Task version" value={version} onChange={e=>setVersion(e.target.value)}><option value="*">All versions</option>{versions.map(v=><option value={v} key={v}>{v||'Unscheduled'}</option>)}</select>
    <select aria-label="Task sort" value={sort} onChange={e=>setSort(e.target.value)}><option value="version">Release order</option><option value="title">Title A–Z</option><option value="newest">Recently updated</option></select>
  </div>
  {!filtered.length&&<div className="empty"><CheckSquare/><h3>No tasks here yet</h3><p>Add a task or refresh GitHub to bring in open issues.</p></div>}
  {groups.map(group=><section className="version-group" key={group} data-version={group==='all'?undefined:group}>
    <header><strong>{group==='all'?'Tasks':group||'Unscheduled'}</strong><span>{filtered.filter(row=>group==='all'||row.target_version===group).length} tasks</span></header>
    {filtered.filter(row=>group==='all'||row.target_version===group).map(row=><article className="task-row" key={row.id}>
      {row.task?<button className={`task-check ${row.status==='done'?'checked':''}`} aria-label={`Mark ${row.title} ${row.status==='done'?'todo':'done'}`} onClick={()=>onToggle(row.task!)}>{row.status==='done'&&<Check size={15}/>}</button>:<Github className="github-issue" size={20}/>}
      <div className="task-copy">{row.task?<button className="task-title" aria-label={`Edit ${row.title}`} onClick={()=>onEdit(row.task!)}>{row.title}</button>:<a className="task-title" href={`https://github.com/${project!.repository}/issues/${row.issue!.number}`} target="_blank" rel="noreferrer">{row.title}<ExternalLink size={12}/></a>}
      <small>{row.source==='github'?`GitHub #${row.issue!.number}`:row.projectName}{sort!=='version'&&row.target_version?` · ${row.target_version}`:''}</small></div>
      <span className={`priority ${row.task?.priority??'normal'}`}>{row.task?.priority??'GitHub'}</span>
    </article>)}
  </section>)}</>;
}
function Completed({repository,commits}: {repository:string;commits:GitHubWork[]}) {
  const [type,setType]=useState('meaningful'),[file,setFile]=useState(''),[fn,setFn]=useState(''),[search,setSearch]=useState(''),[sort,setSort]=useState('newest');
  const rows=commits.filter(commit=>(type==='all'||type==='meaningful'&&['feature','fix','performance'].includes(commit.category)||commit.category===type)&&commit.title.toLowerCase().includes(search.toLowerCase())&&(!file||commit.files.some(f=>f.path.toLowerCase().includes(file.toLowerCase())))&&(!fn||commit.files.some(f=>f.functions.some(name=>name.toLowerCase().includes(fn.toLowerCase())))));
  rows.sort((a,b)=>sort==='title'?a.title.localeCompare(b.title):sort==='oldest'?a.date.localeCompare(b.date):b.date.localeCompare(a.date));
  return <><div className="filters"><label className="search"><Search size={17}/><input aria-label="Search completed work" placeholder="Search completed work…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <select aria-label="Change type" value={type} onChange={e=>setType(e.target.value)}><option value="meaningful">Features & fixes</option><option value="feature">Features</option><option value="fix">Bug fixes</option><option value="performance">Performance</option><option value="maintenance">Maintenance</option><option value="other">Other commits</option><option value="all">All changes</option></select>
    <select aria-label="Completed sort" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select>
    <input aria-label="File filter" placeholder="File or module…" value={file} onChange={e=>setFile(e.target.value)}/><input aria-label="Function filter" placeholder="Function name…" value={fn} onChange={e=>setFn(e.target.value)}/>
  </div>
  {!rows.length&&<div className="empty"><Code2/><h3>No matching completed work</h3><p>Refresh GitHub or adjust the filters.</p></div>}
  {rows.map(commit=><article className="work-card" key={commit.sha}><div><a href={`https://github.com/${repository}/commit/${encodeURIComponent(commit.sha)}`} target="_blank" rel="noreferrer">{commit.title}</a><span className="chip">{commit.category}</span></div><small>{commit.date.slice(0,10)} · {commit.author} · {commit.sha.slice(0,7)}</small>
    {commit.files.length>0&&<details><summary>{commit.files.length} changed files · added-function evidence</summary>{commit.files.map(f=><div className="file-evidence" key={f.path}><code>{f.path}</code>{f.functions.map(name=><button className="tag" key={name} onClick={()=>setFn(name)}>{name}()</button>)}</div>)}</details>}
  </article>)}<p className="quiet">Classification uses commit messages and added declarations. Function evidence requires a GitHub patch; it is not an exhaustive release changelog.</p></>;
}

export function Companion() {
  const [initial]=useState(initialData);
  const [state,setState]=useState(initial.state);
  const [error,setError]=useState(initial.error);
  const [needsRecovery,setNeedsRecovery]=useState(!!initial.error);
  const [notice,setNotice]=useState('');
  const [screen,setScreen]=useState<'projects'|'tasks'|'transfer'>(initial.error?'transfer':'projects');
  const [selected,setSelected]=useState('');
  const [tab,setTab]=useState('planned');
  const [tag,setTag]=useState(''),[search,setSearch]=useState('');
  const [projectForm,setProjectForm]=useState<CompanionProject|'new'|null>(null);
  const [taskForm,setTaskForm]=useState<CompanionTask|'new'|null>(null);
  const [incoming,setIncoming]=useState<CompanionState|null>(null);
  const [busy,setBusy]=useState('');
  const [caches,setCaches]=useState<Record<string,RepositoryWork>>(()=>Object.fromEntries(initial.state.projects.filter(p=>p.repository).flatMap(p=>{const work=cachedWork(p.repository);return work?[[p.repository,work]]:[];})));
  const project=state.projects.find(p=>p.id===selected);
  const work=project?.repository?caches[project.repository]:undefined;
  const commit=(next:CompanionState,replace=false)=>{
    if(needsRecovery&&!replace)throw new Error('Recover the saved data before adding or editing projects.');
    const validated=parseBackup(JSON.stringify(next));
    localStorage.setItem(STORE,JSON.stringify(validated));
    setState(validated);setError('');setNeedsRecovery(false);
  };
  const safely=(fn:()=>void)=>{try{fn();}catch(err){setError(`Could not save: ${(err as Error).message}. Export a backup if storage is full.`);}};
  const navigate=(next:typeof screen)=>{setScreen(next);setSelected('');setTab('planned');setNotice('');};
  useEffect(()=>{
    const back=()=>{if(projectForm)setProjectForm(null);else if(taskForm)setTaskForm(null);else if(incoming)setIncoming(null);else navigate('projects');};
    const native=window as unknown as {DevTrackCanGoBack?:()=>boolean};
    native.DevTrackCanGoBack=()=>!!(projectForm||taskForm||incoming||selected||screen!=='projects');
    window.addEventListener('devtrack-back',back);return()=>{window.removeEventListener('devtrack-back',back);delete native.DevTrackCanGoBack;};
  },[projectForm,taskForm,incoming,selected,screen]);
  async function refresh() {
    if(!project?.repository)return;
    const repo=project.repository;setBusy(repo);setError('');
    try{const next=await fetchRepositoryWork(repo);localStorage.setItem(cacheKey(repo),JSON.stringify(next));setCaches(previous=>({...previous,[repo]:next}));}
    catch(err){setError((err as Error).message);}finally{setBusy('');}
  }
  async function importFile(file?:File) {
    if(!file)return;
    try{if(file.size>16*1024*1024)throw new Error('Backup is larger than 16 MB.');setIncoming(parseBackup(await file.text()));setError('');}
    catch(err){setIncoming(null);setError(`Import rejected: ${(err as Error).message}`);}
  }
  function downloadText(json:string,filename:string) {
    const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function exportRecovery() {
    if(initial.raw===null)return;
    const bridge=(window as unknown as {DevTrackAndroid?:{shareRecovery:(text:string)=>void}}).DevTrackAndroid;
    if(bridge)bridge.shareRecovery(initial.raw);else downloadText(initial.raw,'DevTrack-recovery.json');
  }
  function exportBackup() {
    try {
      const json=JSON.stringify(parseBackup(JSON.stringify(state)),null,2);
      const bridge=(window as unknown as {DevTrackAndroid?:{shareBackup:(json:string)=>void}}).DevTrackAndroid;
      if(bridge){bridge.shareBackup(json);return;}
      downloadText(json,'DevTrack-companion.json');
    } catch(err){setError((err as Error).message);}
  }
  const tags=(p:CompanionProject)=><div className="tags">{projectTags(p.tags).map(value=><button key={value} className="tag" onClick={()=>{navigate('projects');setTag(value);setSearch('');}}>{value}</button>)}</div>;
  return <div className="companion-shell" data-companion-ready>
    <main>
      {error&&<div role="alert" className="error banner">{error}<button aria-label="Dismiss error" onClick={()=>setError('')}><X size={18}/></button></div>}
      {needsRecovery&&<div className="transfer-info"><div><strong>Saved data is protected from overwriting</strong><p>Importing a valid backup requires an explicit replacement confirmation.</p>{initial.raw!==null&&<button className="secondary" onClick={exportRecovery}>Export recovery copy</button>}</div></div>}
      {notice&&<div role="status" className="success banner">{notice}</div>}
      {project?<>
        <button className="back" onClick={()=>navigate('projects')}><ArrowLeft size={18}/>Projects</button>
        <div className="project-heading"><div className="project-icon"><Code2 size={27}/></div><div><h1>{project.name}</h1>{tags(project)}</div><button className="icon-button" aria-label="Edit project" onClick={()=>setProjectForm(project)}><Layers size={20}/></button></div>
        {project.repository&&<div className="repository-bar"><a href={`https://github.com/${project.repository}`} target="_blank" rel="noreferrer"><Github size={16}/>{project.repository}<ExternalLink size={13}/></a><button className="secondary" onClick={refresh} disabled={!!busy}><RefreshCw size={16} className={busy?'spinning':''}/>{busy?'Refreshing…':'Refresh GitHub'}</button></div>}
        <div className="detail-tabs">{['planned','completed','notes'].map(value=><button className={tab===value?'active':''} key={value} onClick={()=>setTab(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div>
        {tab==='planned'&&<><div className="section-heading"><h2>Planned work</h2><button className="primary" onClick={()=>setTaskForm('new')}><Plus size={17}/>Add task</button></div><Planned key={project.id} state={state} project={project} work={work} onEdit={setTaskForm} onToggle={task=>safely(()=>commit(saveTask(state,{...task,status:task.status==='done'?'todo':'done',updated_at:new Date().toISOString()})))}/></>}
        {tab==='completed'&&<Completed repository={project.repository} commits={work?.commits??[]}/>}
        {tab==='notes'&&<section className="notes-panel"><h2>Notes</h2><p className="quiet">Ideas, reminders and release notes. Saved on this device as you type.</p><label>Project note<textarea value={project.notes} onChange={e=>safely(()=>commit({...state,projects:state.projects.map(p=>p.id===project.id?{...p,notes:e.target.value}:p)}))} placeholder="What needs your attention?" rows={14} maxLength={2*1024*1024}/></label><div className="local-saved"><ShieldCheck size={16}/>Saved locally · included in companion backups</div></section>}
        {tab!=='notes'&&work&&<p className="quiet cache-notice">{work.notice}<br/>Cached {new Date(work.fetched_at).toLocaleString()}.</p>}
        {tab!=='notes'&&!project.repository&&<p className="quiet">Add a GitHub repository in Edit project to fetch completed work and open issues.</p>}
      </>:screen==='projects'?<>
        <div className="mobile-brand"><span className="brand-mark"><i/><i/><i/><i/></span><strong>DevTrack</strong><span>Companion</span></div>
        <div className="section-heading"><h1>Projects</h1><button className="primary" disabled={needsRecovery} onClick={()=>setProjectForm('new')}><Plus size={17}/>Add project</button></div>
        <label className="search"><Search size={18}/><input aria-label="Search projects" placeholder="Search projects…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
        {tag&&<div className="tag-filter"><span>Tagged <strong>{tag}</strong></span><button onClick={()=>setTag('')} aria-label="Clear tag filter"><X size={16}/></button></div>}
        {!state.projects.length&&<div className="empty"><Folder size={34}/><h2>Your projects, within reach.</h2><p>Add a GitHub project or import your desktop tasks. Your plans and notes stay available offline.</p><button className="secondary" onClick={()=>navigate('transfer')}>Import desktop tasks</button></div>}
        <div className="project-list">{state.projects.filter(p=>(!tag||hasProjectTag(p.tags,tag))&&p.name.toLowerCase().includes(search.toLowerCase())).map(p=><article className="project-card" key={p.id} data-project-card>
          <button className="project-open" aria-label={`Open ${p.name}`} onClick={()=>{setSelected(p.id);setTab('planned');setNotice('');}}><span className="project-icon"><Code2 size={24}/></span><strong>{p.name}</strong><span className="project-count">{state.tasks.filter(t=>t.project_id===p.id&&t.status==='todo').length}<small>local tasks</small></span><ChevronRight size={18}/></button>{tags(p)}
        </article>)}</div>
        {state.projects.length>0&&!state.projects.some(p=>(!tag||hasProjectTag(p.tags,tag))&&p.name.toLowerCase().includes(search.toLowerCase()))&&<p className="empty">No projects match these filters.</p>}
        <p className="local-saved"><ShieldCheck size={16}/>Projects, tasks and notes are stored on this device.</p>
      </>:screen==='tasks'?<>
        <div className="section-heading"><h1>Tasks</h1><button className="primary" disabled={!state.projects.length} onClick={()=>setTaskForm('new')}><Plus size={17}/>Add task</button></div>
        <p className="quiet">Local tasks across your projects. Open a project for its GitHub issues.</p>
        <Planned state={state} onEdit={setTaskForm} onToggle={task=>safely(()=>commit(saveTask(state,{...task,status:task.status==='done'?'todo':'done',updated_at:new Date().toISOString()})))}/>
      </>:<>
        <h1>Transfer</h1><p className="subtitle">Carry your plans between devices.</p>
        <div className="transfer-symbol"><Folder size={34}/><ArrowLeftRight size={28}/><CheckSquare size={34}/></div>
        <div className="transfer-info"><ShieldCheck size={22}/><div><strong>Manual file transfer</strong><p>Export a JSON backup and move it yourself. Automatic desktop-to-phone sync is not available yet.</p></div></div>
        <button className="transfer-card" disabled={needsRecovery} onClick={exportBackup}><span className="project-icon"><ArrowUpFromLine/></span><span><strong>Export backup</strong><small>Your companion projects, tasks and notes.</small></span><ChevronRight size={18}/></button>
        <label className="transfer-card"><span className="project-icon green"><ArrowDownToLine/></span><span><strong>Import JSON file</strong><small>Restore a companion backup or start from a desktop task export.</small></span><ChevronRight size={18}/><input aria-label="Import JSON file" type="file" accept="application/json,.json" onChange={e=>{void importFile(e.target.files?.[0]);e.target.value='';}}/></label>
        <div className="transfer-info"><ShieldCheck size={22}/><div><strong>Your current data stays until you confirm</strong><p>The whole file is validated before replacement. Export a backup first.</p></div></div>
        <p className="quiet">Desktop exports currently omit notes and repository URLs. Set the GitHub repository after importing. Companion backups cannot yet be imported into the desktop app; keep the desktop copy unchanged.</p>
        <p className="quiet">DevTrack companion 1.0 · Android release candidate</p>
      </>}
    </main>
    <nav className="mobile-nav" aria-label="Main navigation">{([{id:'projects',label:'Projects',Icon:Layers},{id:'tasks',label:'Tasks',Icon:CheckSquare},{id:'transfer',label:'Transfer',Icon:ArrowLeftRight}] as const).map(({id,label,Icon})=><button key={id} className={screen===id?'active':''} aria-current={screen===id?'page':undefined} onClick={()=>navigate(id)}><Icon size={21}/><span>{label}</span></button>)}</nav>
    {projectForm&&<ProjectForm project={projectForm==='new'?undefined:projectForm} onClose={()=>setProjectForm(null)} onSave={value=>{commit({...state,projects:[...state.projects.filter(p=>p.id!==value.id),value]});setProjectForm(null);}}/>}
    {taskForm&&<TaskForm task={taskForm==='new'?undefined:taskForm} projectId={project?.id??state.projects[0]?.id??''} projects={state.projects} onClose={()=>setTaskForm(null)} onSave={task=>{commit(saveTask(state,task));setTaskForm(null);}}/>}
    {incoming&&<Modal title="Replace local data?" onClose={()=>setIncoming(null)}><p>This file contains {incoming.projects.length} project{incoming.projects.length===1?'':'s'} and {incoming.tasks.length} tasks. Importing replaces the companion data on this device.</p><footer><button className="secondary" onClick={()=>setIncoming(null)}>Cancel</button><button className="primary" onClick={()=>safely(()=>{commit(incoming,true);setIncoming(null);setSelected('');setCaches({});setNotice('Backup imported.');})}>Replace local data</button></footer></Modal>}
  </div>;
}
