import { open } from '@tauri-apps/plugin-dialog';

export async function selectProjectDirectory(): Promise<string | null> {
  const path = await open({ 
    directory: true, 
    multiple: false, 
    title: 'Select Project Directory' 
  });
  return path || null;
}

export async function selectFile(options?: { 
  title?: string; 
  filters?: { name: string; extensions: string[] }[];
  multiple?: boolean;
}): Promise<string | string[] | null> {
  const result = await open({
    directory: false,
    multiple: options?.multiple ?? false,
    title: options?.title ?? 'Select File',
    filters: options?.filters,
  });
  return result || null;
}

export async function saveFile(options?: {
  title?: string;
  filters?: { name: string; extensions: string[] }[];
  defaultPath?: string;
}): Promise<string | null> {
  const result = await open({
    directory: false,
    multiple: false,
    title: options?.title ?? 'Save File',
    filters: options?.filters,
    defaultPath: options?.defaultPath,
  });
  return result || null;
}