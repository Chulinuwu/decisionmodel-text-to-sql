import { allowedHosts, env } from './env.js';

export const config = {
  model: 'cloudflare/clef-flash',
  provider: 'Cloudflare',
  decisionsUrl: 'https://openrouter.ai/api/alpha/decisions',
  host: env.HOST,
  port: env.PORT,
  allowedHosts: allowedHosts(env.ALLOWED_HOSTS, env.HOST, env.PORT),
  dbHost: env.DB_HOST,
  dbPort: env.DB_PORT,
  importer: { user: 'importer', password: env.DB_IMPORTER_PASSWORD },
  analyst: { user: 'analyst', password: env.DB_ANALYST_PASSWORD },
  database: 'olist',
  statementTimeoutMs: 5000,
  decisionTimeoutMs: 45000,
  maxQuestionBytes: 1200,
  maxConcurrentRequests: 2,
  offerLimit: 200,
  offerTtlMs: 30 * 60 * 1000,
  datasetCacheMs: 5 * 60 * 1000,
  datasetUrl: 'https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce',
};
