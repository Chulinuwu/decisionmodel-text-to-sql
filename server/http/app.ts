import express from 'express';
import path from 'node:path';
import { config } from '../config.js';
import { executeSchema, questionSchema } from '../../shared/schema.js';
import { createConcurrencyGate } from './concurrency-gate.js';
import { bodyErrorHandler } from './error-mapping.js';
import { httpMessages, requestBodyLimit } from './http-messages.js';
import { jsonEndpoint } from './json-endpoint.js';
import { hostGuard, jsonOriginGuard } from './local-guard.js';
import type { AppDependencies } from './http.types.js';
import { meterRequestSchema } from '../../shared/meter-schema.js';

export function createApp(dependencies: AppDependencies, staticDirectory = path.resolve('dist')) {
  const app = express();
  const gate = createConcurrencyGate(config.maxConcurrentRequests);
  app.disable('x-powered-by');
  app.use(hostGuard);
  app.use(express.json({ limit: requestBodyLimit }));
  app.get('/api/dataset', async (_request, response) => {
    try { response.json(await dependencies.datasetInfo()); }
    catch { response.status(503).json({ error: httpMessages.databaseNotReady }); }
  });
  app.post('/api/query', jsonOriginGuard, jsonEndpoint(gate, questionSchema, httpMessages.invalidQuestion, (input, signal) => dependencies.answerQuestion(input.question, signal)));
  app.post('/api/execute', jsonOriginGuard, jsonEndpoint(gate, executeSchema, httpMessages.invalidExecute, (input, signal) => dependencies.executeInterpretation(input.offerId, input.interpretationId, signal)));
  app.use(express.static(staticDirectory));
  if (dependencies.answerMeterQuestion) {
    app.post('/api/meter/query', jsonOriginGuard, jsonEndpoint(gate, meterRequestSchema, httpMessages.invalidQuestion, dependencies.answerMeterQuestion));
  }
  if (dependencies.meterDataset) {
    const dataset = dependencies.meterDataset;
    app.get('/api/meter/dataset', async (_request, response) => {
      try { response.json(await dataset()); }
      catch { response.status(503).json({ error: 'Synthetic meter fixture is not ready.' }); }
    });
  }
  app.get('/', (_request, response) => response.sendFile(path.join(staticDirectory, 'index.html')));
  app.use(bodyErrorHandler);
  return app;
}
