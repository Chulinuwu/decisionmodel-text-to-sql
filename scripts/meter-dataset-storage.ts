import { createHash } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

export async function atomicMeterWrite(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  const file = await open(temporary, 'w');
  try { await file.writeFile(content); await file.sync(); } finally { await file.close(); }
  await rename(temporary, path);
}

export async function meterSourceFingerprint(root: string): Promise<string> {
  const paths: string[] = [];
  for (const directory of ['server/meter', 'scripts']) {
    for (const name of await readdir(join(root, directory))) {
      if (directory === 'server/meter' || /^meter-dataset.*\.ts$/.test(name)) paths.push(join(directory, name));
    }
  }
  paths.push('shared/meter-schema.ts', 'server/decision-payload.ts', 'server/planning/read-only-policy.ts');
  const digest = createHash('sha256');
  for (const path of paths.sort()) digest.update(relative(root, join(root, path))).update(await readFile(join(root, path)));
  return digest.digest('hex');
}

export async function readMeterCheckpoint(path: string): Promise<string | null> {
  try { return await readFile(path, 'utf8'); }
  catch (error) { if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null; throw error; }
}
