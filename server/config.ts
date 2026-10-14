import { allowedHosts, env } from './env.js';

// DECISIONS_URL swaps the Copilot gateway for a self-hosted Decisions endpoint such as local-model/; it takes up to 255 options per question.
const decisions = env.DECISIONS_URL
  ? { selfHosted: true, model: env.DECISIONS_MODEL ?? 'local/d1-omni-600m', provider: 'Local', decisionsUrl: env.DECISIONS_URL, maxChoices: 255, decisionsKey: env.DECISIONS_KEY }
  : { selfHosted: false, model: 'LiquidAI/d1-3B', provider: 'Copilot', decisionsUrl: 'https://copilot.tomastc.com/api/llm/v1/systemone', maxChoices: 37, decisionsKey: undefined };

export const config = {
  ...decisions,
  finalistsPerPart: 4,
  maxQuestionsPerCall: 64,
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
