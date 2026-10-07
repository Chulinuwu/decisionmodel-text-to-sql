import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { defaultSuite } from './live-eval-config.js';
import { liveCases } from './live-cases.js';
import type { LiveCase } from './live-eval.types.js';

const caseFileSchema = z.array(z.object({ question: z.string().min(3), gold: z.string().min(1).nullable(), ordered: z.boolean().optional() }).strict()).min(1);

export async function loadCases(file: string | undefined): Promise<{ suite: string; cases: LiveCase[] }> {
  if (!file) return { suite: defaultSuite, cases: liveCases };
  const cases = caseFileSchema.parse(JSON.parse(await readFile(file, 'utf8')));
  const suite = path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || defaultSuite;
  return { suite, cases };
}
