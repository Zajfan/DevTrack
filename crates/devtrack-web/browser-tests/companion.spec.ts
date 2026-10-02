import { test, expect, type Page } from '@playwright/test';

async function addProject(page: Page, name:string, tags:string, repository='') {
  await page.getByRole('button',{name:'Add project',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Project name').fill(name);
  await dialog.getByLabel('GitHub repository').fill(repository);
  await dialog.getByLabel('Tags').fill(tags);
  await dialog.getByRole('button',{name:'Save project'}).click();
}
async function addTask(page: Page, title:string, version:string) {
  await page.getByRole('button',{name:'Add task',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Task title').fill(title);
  await dialog.getByLabel('Target version').fill(version);
  await dialog.getByRole('button',{name:'Save task'}).click();
}

test('phone workflow persists projects, alpha tasks and notes; tags match exactly',async({page})=>{
  await page.emulateMedia({colorScheme:'light'});
  await page.goto('/companion.html');
  await expect(page.locator('html')).toHaveCSS('color-scheme','dark');
  await expect(page.locator('.companion-shell')).toHaveCSS('background-color','rgb(17, 24, 39)');
  await page.getByRole('button',{name:'Add project',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCSS('background-color','rgb(23, 31, 50)');
  await expect(page.getByRole('dialog').getByLabel('Project name')).toHaveCSS('background-color','rgb(17, 24, 39)');
  await page.getByRole('dialog').getByRole('button',{name:'Cancel'}).click();
  await expect(page.getByText('Your projects, within reach.')).toBeVisible();
  await addProject(page,'DevTrack','Rust, TypeScript');
  await addProject(page,'Other','rust');
  await addProject(page,'Partial','Rusty');
  await page.locator('[data-project-card]').filter({hasText:'DevTrack'}).getByRole('button',{name:'Rust',exact:true}).click();
  await expect(page.locator('[data-project-card]')).toHaveCount(2);
  await expect(page.getByRole('button',{name:'Open Partial'})).toHaveCount(0);
  await page.getByRole('button',{name:'Clear tag filter'}).click();
  await page.getByRole('button',{name:'Open DevTrack'}).click();
  await addTask(page,'Later release','0.10');
  await addTask(page,'Earlier release','0.2');
  await addTask(page,'Alpha work','0.1.0-alpha.2');
  expect(await page.locator('[data-version]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-version')))).toEqual(['0.1.0-alpha.2','0.2','0.10']);
  await page.getByRole('button',{name:'Add task',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Task title').fill('Invalid task');
  await dialog.getByLabel('Target version').fill('bad version');
  await dialog.getByRole('button',{name:'Save task'}).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await dialog.getByRole('button',{name:'Cancel'}).click();
  await page.getByRole('button',{name:'Mark Earlier release done'}).click();
  await expect(page.getByRole('button',{name:'Edit Earlier release'})).toHaveCount(0);
  await page.getByRole('button',{name:'Notes',exact:true}).click();
  await page.getByLabel('Project note').fill('Release notes survive reload.');
  await page.reload();
  await page.getByRole('button',{name:'Open DevTrack'}).click();
  await page.getByRole('button',{name:'Notes',exact:true}).click();
  await expect(page.getByLabel('Project note')).toHaveValue('Release notes survive reload.');
  await page.getByRole('button',{name:'Planned',exact:true}).click();
  await expect(page.getByRole('button',{name:'Edit Alpha work'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Edit Invalid task'})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'/tmp/devtrack-companion-planned.png',fullPage:true});
  await page.setViewportSize({width:768,height:1024});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('public GitHub work filters meaningful commits, files and functions and preserves cache on errors',async({page})=>{
  const shas=['a','b','c'].map(letter=>letter.repeat(40));
  const messages=['feat: add companion export','fix: repair task versions','chore: update tooling'];
  await page.route('https://api.github.com/repos/fixture/repo/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/issues')) return route.fulfill({json:[{number:7,title:'GitHub planned feature',body:'Open issue',created_at:'2026-10-01T00:00:00Z',milestone:{title:'v0.3.0-alpha.1'}},{number:8,title:'PR excluded',pull_request:{}}]});
    if(url.pathname.endsWith('/commits')) return route.fulfill({json:shas.map((sha,i)=>({sha,commit:{message:messages[i],author:{name:'Fixture',date:`2026-10-0${i+1}T00:00:00Z`}}}))});
    return route.fulfill({json:{files:[{filename:'src/export.ts',patch:'+export function exportCompanion() {}\n+exportCompanion();'}]}});
  });
  await page.goto('/companion.html');
  await addProject(page,'Repository','mobile','fixture/repo');
  await page.getByRole('button',{name:'Open Repository'}).click();
  await page.getByRole('button',{name:'Refresh GitHub'}).click();
  await expect(page.getByRole('link',{name:/GitHub planned feature/})).toBeVisible();
  await expect(page.getByText('PR excluded')).toHaveCount(0);
  await page.getByRole('button',{name:'Completed',exact:true}).click();
  await expect(page.getByRole('link',{name:'feat: add companion export'})).toBeVisible();
  await expect(page.getByRole('link',{name:'chore: update tooling'})).toHaveCount(0);
  await page.getByLabel('Function filter').fill('exportCompanion');
  await expect(page.getByRole('link',{name:'feat: add companion export'})).toBeVisible();
  await page.getByLabel('File filter').fill('not-a-file');
  await expect(page.getByRole('link',{name:'feat: add companion export'})).toHaveCount(0);
  await page.getByLabel('File filter').fill('export.ts');
  await page.getByLabel('Change type').selectOption('maintenance');
  await expect(page.getByRole('link',{name:'chore: update tooling'})).toBeVisible();
  await page.getByLabel('Change type').selectOption('meaningful');
  await page.unrouteAll();
  await page.route('https://api.github.com/**',route=>route.fulfill({status:403,json:{message:'limit'}}));
  await page.getByRole('button',{name:'Refresh GitHub'}).click();
  await expect(page.getByRole('alert')).toContainText('limit');
  await expect(page.getByRole('link',{name:'feat: add companion export'})).toBeVisible();
  await page.screenshot({path:'/tmp/devtrack-companion-completed.png',fullPage:true});
});

test('JSON transfer validates before replacement and exports mobile backup data',async({page},testInfo)=>{
  await page.goto('/companion.html');
  await addProject(page,'Existing','Rust');
  await page.getByRole('button',{name:'Transfer',exact:true}).click();
  const desktop={projects:[{id:4,name:'Imported',path:'/dev/imported',tags:'Kotlin'}],tasks:[{id:8,project_id:4,title:'Alpha release',description:'Imported description',status:'todo',priority:'normal',target_version:'0.1.0-alpha.1',created_at:'2026-10-01T00:00:00Z'}]};
  await page.getByLabel('Import JSON file').setInputFiles({name:'desktop.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(desktop))});
  await expect(page.getByRole('dialog')).toContainText('1 project');
  await page.getByRole('button',{name:'Replace local data'}).click();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export backup'}).click();
  const download=await downloadPromise;
  const output=testInfo.outputPath('backup.json');await download.saveAs(output);
  const {readFile}=await import('node:fs/promises');
  const backup=JSON.parse(await readFile(output,'utf8'));
  expect(backup.format).toBe('devtrack-companion');
  expect(backup.tasks[0].target_version).toBe('0.1.0-alpha.1');
  await page.getByLabel('Import JSON file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"projects":[],"tasks":[{"title":"bad"}]}')});
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button',{name:'Projects',exact:true}).click();
  await expect(page.getByRole('button',{name:'Open Imported'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Open Existing'})).toHaveCount(0);
});

test('unreadable saved data is retained and exportable until an explicit valid replacement',async({page},testInfo)=>{
  const original='{"format":"devtrack-companion","version":1,"projects":["broken"],"tasks":[]}';
  await page.goto('/companion.html');
  await page.evaluate(value=>localStorage.setItem('devtrack-companion-v1',value),original);
  await page.reload();
  await expect(page.getByText('Saved data is protected from overwriting')).toBeVisible();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export recovery copy'}).click();
  const output=testInfo.outputPath('recovery.json');await (await downloadPromise).saveAs(output);
  const {readFile}=await import('node:fs/promises');
  expect(await readFile(output,'utf8')).toBe(original);
  await page.getByRole('button',{name:'Projects',exact:true}).click();
  await expect(page.getByRole('button',{name:'Add project',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>localStorage.getItem('devtrack-companion-v1'))).toBe(original);
  await page.getByRole('button',{name:'Transfer',exact:true}).click();
  await page.getByLabel('Import JSON file').setInputFiles({name:'clean.json',mimeType:'application/json',buffer:Buffer.from('{"format":"devtrack-companion","version":1,"projects":[],"tasks":[]}')});
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  expect(await page.evaluate(()=>localStorage.getItem('devtrack-companion-v1'))).toBe(original);
  await page.getByLabel('Import JSON file').setInputFiles({name:'clean.json',mimeType:'application/json',buffer:Buffer.from('{"format":"devtrack-companion","version":1,"projects":[],"tasks":[]}')});
  await page.getByRole('button',{name:'Replace local data'}).click();
  await page.getByRole('button',{name:'Projects',exact:true}).click();
  await expect(page.getByRole('button',{name:'Add project',exact:true})).toBeEnabled();
});
