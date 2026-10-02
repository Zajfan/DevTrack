import { Link } from 'react-router-dom';
import { projectTagHref } from '../utils/tags';

export function ProjectTag({ tag }: { tag: string }) {
  return <Link to={projectTagHref(tag)} className="project-tag" aria-label={`Show projects tagged ${tag}`} onClick={event => event.stopPropagation()}>{tag}</Link>;
}
