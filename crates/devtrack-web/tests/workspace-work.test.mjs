import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkspaceWork, summarizeWork, projectPlannedWork } from '../src/utils/workspaceWork.ts';

const project = { id:2,name:'DevTrack',path:'/dev/DevTrack',status:'Active',tags:'',created_at:'',last_accessed:null };
const task = { id:3,project_id:2,title:'Completed widget is empty',status:'Todo',priority:'High',target_version:'1.0',created_at:'2026-10-02 13:19:50' };
const issue = { number:9,title:'Overview tasks missing',description:'Report',url:'https://github.com/Zajfan/DevTrack/issues/9',target_version:'1.0',milestone:'1.0',labels:[],created_at:'2026-10-02T00:00:00Z' };
const commit = (sha,category) => ({ sha,title:'Implemented change',category,date:'2026-10-02T00:00:00Z',message:'',author:'Owner',scope:null,files:[],evidence:'Commit message',url:'https://github.com/Zajfan/DevTrack/commit/'+sha });
const snapshot = { project,issues:{repository:'Zajfan/DevTrack',issues:[issue]},history:{repository:'Zajfan/DevTrack',commits:[commit('a','Feature'),commit('b','Bug fix'),commit('c','Maintenance'),commit('d','Other')]} };

test('local tasks, remote issues and meaningful changes contribute to the same workspace counts',()=>{
  const items=buildWorkspaceWork([task,{...task,id:4,status:'Completed'}],[snapshot]);
  assert.deepEqual(summarizeWork(items),{total:5,open:2,completed:3,localOpen:1,githubOpen:1,localCompleted:1,githubCompleted:0,commitCompleted:2});
  assert.equal(items.find(i=>i.id===4).status,'Done');
  assert.equal(items.find(i=>i.source==='github').target_version,'1.0');
  assert.equal(items.filter(i=>i.source==='commit').length,2);
});
test('duplicate project registrations do not double count repository issues or commit evidence',()=>{
  const duplicate={...snapshot,project:{...project,id:8,name:'Same repo'},issues:{...snapshot.issues,repository:'zajfan/devtrack'},history:{...snapshot.history,repository:'zajfan/devtrack',commits:[{...commit('a','Feature'),files:[{path:'src/other.rs',additions:2,deletions:0,functions_added:['other']}]}]}};
  const items=buildWorkspaceWork([task],[snapshot,duplicate]);
  assert.equal(items.length,4);
  assert.deepEqual(items.find(i=>i.source==='github').project_ids,[2,8]);
  assert.deepEqual(items.find(i=>i.source==='commit').project_ids,[2,8]);
  assert.deepEqual(items.find(i=>i.source==='commit').commit.files.map(f=>f.path),['src/other.rs']);
  assert.equal(new Set(items.map(i=>i.work_key)).size,items.length);
});
test('project task pages contain the same local and remote tasks without creating editable commit records',()=>{
  const items=projectPlannedWork(project,[task],snapshot.issues);
  assert.equal(items.length,2);
  assert.deepEqual(items.map(i=>i.source),['local','github']);
  assert.equal(items[1].github_number,9);
  assert.equal(items[1].project_name,'DevTrack');
});
test('missing remote cache leaves local tasks available and orphaned tasks do not enter the workspace',()=>{
  const items=buildWorkspaceWork([task,{...task,id:5,project_id:999}],[{project}]);
  assert.equal(items.length,1);
  assert.equal(items[0].title,task.title);
});
test('identical issue numbers in different repositories remain distinct',()=>{
  const other={project:{...project,id:8,name:'Other'},issues:{repository:'owner/other',issues:[issue]}};
  const items=buildWorkspaceWork([],[snapshot,other]);
  assert.equal(items.filter(i=>i.source==='github').length,2);
});
