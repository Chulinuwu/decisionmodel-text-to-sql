import { z } from 'zod';

const port = z.coerce.number().int().min(1).max(65535);
const nonEmpty = z.string().trim().min(1);
const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
// Plain HTTP only to a loopback host, so DECISIONS_KEY never crosses a network unencrypted.
const decisionsUrl = z.string().refine(value => {
  const url = URL.parse(value);
  return url !== null && (url.protocol === 'https:' || (url.protocol === 'http:' && loopback.has(url.hostname)));
});

const envSchema = z.object({
  HOST: nonEmpty.default('127.0.0.1'),
  PORT: port.default(4317),
  DB_HOST: nonEmpty.default('127.0.0.1'),
  DB_PORT: port.default(5547),
  DB_IMPORTER_PASSWORD: nonEmpty.default('local-import-only'),
  DB_ANALYST_PASSWORD: nonEmpty.default('local-read-only'),
  ALLOWED_HOSTS: z.string().trim().optional(),
  DECISIONS_URL: decisionsUrl.optional(),
  DECISIONS_MODEL: nonEmpty.optional(),
  DECISIONS_KEY: nonEmpty.optional(),
}).refine(value => (!value.DECISIONS_KEY && !value.DECISIONS_MODEL) || value.DECISIONS_URL, { path: ['DECISIONS_URL'] });

export const parseEnv = (source: NodeJS.ProcessEnv) => envSchema.safeParse(source);
const parsed = parseEnv(process.env);
// Fail at startup with the variable names only; values may be secrets.
if (!parsed.success) throw new Error(`Invalid environment: ${parsed.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
export const env = parsed.data;

// '*' disables the Host/Origin allowlist for public hosting; anyone who can reach the server may use it.
export function allowedHosts(value: string | undefined, host: string, appPort: number): string[] | null {
  if (value === '*') return null;
  const listed = value?.split(',').map(entry => entry.trim().toLowerCase()).filter(Boolean) ?? [];
  return listed.length ? listed : [`localhost:${appPort}`, `${host}:${appPort}`];
}
