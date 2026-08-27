import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join, relative, sep } from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const sourceRoots = ['app', 'features', 'lib', 'styles'];
const checkedExtensions = new Set(['.ts', '.tsx', '.css']);
const forbiddenDumpingGrounds = new Set(['common.ts', 'helpers.ts', 'utils.ts']);
const errors = [];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  }));
  return files.flat();
}

function normalized(path) {
  return relative(projectRoot, path).split(sep).join('/');
}

function checkFeatureBoundary(path, source) {
  const match = path.match(/^features\/([^/]+)\//);
  if (!match || match[1] === 'app') return;
  const currentFeature = match[1];
  const imports = [...source.matchAll(/from\s+['"]@\/features\/([^/'"]+)([^'"]*)['"]/g)];
  for (const importMatch of imports) {
    const importedFeature = importMatch[1];
    const deepPath = importMatch[2];
    if (importedFeature !== currentFeature && importedFeature !== 'shared') {
      errors.push(`${path}: feature '${currentFeature}' imports private code from '${importedFeature}'.`);
    }
    if (importedFeature !== currentFeature && deepPath) {
      errors.push(`${path}: cross-feature imports must use the feature public index.`);
    }
  }
}

function checkLayerBoundary(path, source) {
  if (path.startsWith('lib/domain/')) {
    if (/@\/(app|features|lib\/(application|infrastructure))\//.test(source)) {
      errors.push(`${path}: domain code may depend only on domain code and platform-neutral types.`);
    }
  }
  if (path.startsWith('lib/application/')) {
    if (/@\/(app|features|lib\/infrastructure)\//.test(source)) {
      errors.push(`${path}: application code may not depend on UI or infrastructure.`);
    }
  }
}

function checkFile(path, source) {
  const lineCount = source.split(/\r?\n/).length;
  if (lineCount > 250) errors.push(`${path}: ${lineCount} lines exceeds the 250-line hard limit.`);
  if (forbiddenDumpingGrounds.has(basename(path))) errors.push(`${path}: generic dumping-ground filename is forbidden.`);
  if (['.ts', '.tsx'].includes(extname(path))) {
    const classCount = (source.match(/\bclass\s+[A-Za-z_$][\w$]*/g) ?? []).length;
    if (classCount > 1) errors.push(`${path}: only one class per file is allowed.`);
    checkFeatureBoundary(path, source);
    checkLayerBoundary(path, source);
  }
}

for (const root of sourceRoots) {
  const files = await collectFiles(join(projectRoot, root));
  for (const file of files.filter((item) => checkedExtensions.has(extname(item)))) {
    const source = await readFile(file, 'utf8');
    checkFile(normalized(file), source);
  }
}

if (errors.length > 0) {
  console.error(`Architecture check failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  process.exit(1);
}

console.log('Architecture boundaries and file-size limits passed.');
