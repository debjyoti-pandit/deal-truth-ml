import readme from '../docs/README.md';
import api from '../docs/API.md';
import models from '../docs/MODELS.md';
import prompts from '../docs/PROMPTS.md';
import hosting from '../docs/HOSTING.md';
import deployment from '../docs/DEPLOYMENT.md';
import projectContext from '../docs/PROJECT_CONTEXT.md';
import licenseAudit from '../docs/LICENSE_AUDIT.md';

export interface ReferenceDoc {
  name: string;
  title: string;
  body: string;
}

const DOCS: Record<string, Omit<ReferenceDoc, 'name'>> = {
  'README.md': { title: 'Design doc index', body: readme },
  'API.md': { title: 'HTTP API', body: api },
  'MODELS.md': { title: 'Model routing', body: models },
  'PROMPTS.md': { title: 'Prompt library', body: prompts },
  'HOSTING.md': { title: 'Local and production hosting', body: hosting },
  'DEPLOYMENT.md': { title: 'Deployment', body: deployment },
  'PROJECT_CONTEXT.md': { title: 'Project context', body: projectContext },
  'LICENSE_AUDIT.md': { title: 'License audit', body: licenseAudit },
};

export function listReferenceDocs(
  pathPrefix: string,
): { name: string; title: string; path: string }[] {
  return Object.entries(DOCS).map(([name, doc]) => ({
    name,
    title: doc.title,
    path: `${pathPrefix}/${name}`,
  }));
}

export function getReferenceDoc(name: string): ReferenceDoc | null {
  if (name.includes('/') || name.includes('\\') || name.includes('..')) {
    return null;
  }
  const doc = DOCS[name];
  if (!doc) {
    return null;
  }
  return { name, title: doc.title, body: doc.body };
}
