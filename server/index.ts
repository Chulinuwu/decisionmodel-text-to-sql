import { config } from './config.js';
import { pool } from './db-client.js';
import { createApp } from './http/app.js';
import { cachedDatasetInfo } from './query/dataset-cache.js';
import { answerQuestion } from './query/answer-question.js';
import { executeInterpretation } from './query/execute-interpretation.js';

import { answerMeterQuestion } from './meter/answer-question.js';
import { getMeterDataset } from './meter/data.js';
const app = createApp({ answerQuestion, executeInterpretation, datasetInfo: cachedDatasetInfo, answerMeterQuestion, meterDataset: getMeterDataset });
const server = app.listen(config.port, config.host, () => console.log(`Decision SQL running at http://localhost:${config.port}`));
async function shutdown() { server.close(); await pool.end(); process.exit(0); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
