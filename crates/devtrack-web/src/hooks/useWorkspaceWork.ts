import { useQueries, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';
import { useProjects, useGlobalTasks } from './useApi';
import { buildWorkspaceWork, summarizeWork } from '../utils/workspaceWork';
import type { PlannedIssues, WorkHistory } from '../types/repository';

export function useWorkspaceWork() {
  const projects=useProjects(true);
  const local=useGlobalTasks();
  const client=useQueryClient();
  const [refreshing,setRefreshing]=useState(false);
  const [refreshError,setRefreshError]=useState('');
  const list=projects.data ?? [];
  const issues=useQueries({queries:list.map(project=>({queryKey:['project-issues',project.id],
    queryFn:()=>invoke<PlannedIssues>('project_issues',{id:project.id,refresh:false})}))});
  const histories=useQueries({queries:list.map(project=>({queryKey:['project-history',project.id],
    queryFn:()=>invoke<WorkHistory>('project_history',{id:project.id,refresh:false})}))});
  const items=buildWorkspaceWork(local.data ?? [],list.map((project,i)=>({project,issues:issues[i]?.data,history:histories[i]?.data})));
  const errors=[projects.error,local.error,...issues.map(q=>q.error),...histories.map(q=>q.error)].filter(Boolean);
  const notices=list.flatMap((project,i)=>[
    issues[i]?.data?.notice, histories[i]?.data?.notice,
    issues[i]?.data?.has_more || histories[i]?.data?.has_more ? 'More repository work is available. Open this project to load additional pages.' : null,
  ].filter(Boolean).map(notice=>`${project.name}: ${notice}`));
  const refresh=async()=>{
    setRefreshing(true);setRefreshError('');
    const failures:string[]=[];
    // Sequential projects bound GitHub/API concurrency; cached and local work remain visible.
    try {
      for(const project of list) {
        const result=await Promise.allSettled([
          invoke<PlannedIssues>('project_issues',{id:project.id,refresh:true}),
          invoke<WorkHistory>('project_history',{id:project.id,refresh:true}),
        ]);
        result.forEach((r,index)=>{
          if(r.status==='fulfilled') client.setQueryData([index===0?'project-issues':'project-history',project.id],r.value);
          else failures.push(`${project.name}: ${String(r.reason)}`);
        });
      }
      await client.invalidateQueries({queryKey:['tasks']});
      setRefreshError(failures.join(' · '));
    } finally {setRefreshing(false);}
  };
  return {items,summary:summarizeWork(items),projects:list,
    isLoading:projects.isLoading||local.isLoading,
    isFetching:issues.some(q=>q.isFetching)||histories.some(q=>q.isFetching),
    error:errors.length?errors.map(String).join(' · '):null,notices,refresh,refreshing,refreshError};
}
