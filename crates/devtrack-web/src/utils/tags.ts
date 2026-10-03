export function projectTags(value: string): string[] {
  const seen = new Set<string>();
  return value.split(',').map(tag => tag.trim()).filter(tag => {
    const key = tag.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const broadProjectTags = new Set(['dev', 'needs-triage', 'company', 'the-no-hands-company']);
export function prioritizeProjectTags(value: string, limit = 3): string[] {
  const tags = projectTags(value);
  const specific = tags.filter(tag => !broadProjectTags.has(tag.toLowerCase()));
  const broad = tags.filter(tag => broadProjectTags.has(tag.toLowerCase()));
  return [...specific, ...broad].slice(0, limit);
}

export const hasProjectTag = (value: string, selected: string) =>
  projectTags(value).some(tag => tag.toLowerCase() === selected.trim().toLowerCase());
export const projectTagHref = (tag: string) =>
  `/projects?${new URLSearchParams({ tag: tag.trim() })}`;
