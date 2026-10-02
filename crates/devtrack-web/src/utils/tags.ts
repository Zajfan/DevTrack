export function projectTags(value: string): string[] {
  const seen = new Set<string>();
  return value.split(',').map(tag => tag.trim()).filter(tag => {
    const key = tag.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export const hasProjectTag = (value: string, selected: string) =>
  projectTags(value).some(tag => tag.toLowerCase() === selected.trim().toLowerCase());
export const projectTagHref = (tag: string) =>
  `/projects?${new URLSearchParams({ tag: tag.trim() })}`;
