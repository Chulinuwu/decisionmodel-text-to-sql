import type { RequestHandler } from 'express';
import { config } from '../config.js';
import { httpMessages, securityHeaders } from './http-messages.js';

const allowedHosts = [`localhost:${config.port}`, `${config.host}:${config.port}`];
const allowedOrigins = allowedHosts.map(host => `http://${host}`);

export const hostGuard: RequestHandler = (request, response, next) => {
  if (!request.headers.host || !allowedHosts.includes(request.headers.host)) return void response.status(403).json({ error: httpMessages.localhostOnly });
  response.set(securityHeaders);
  next();
};

export const jsonOriginGuard: RequestHandler = (request, response, next) => {
  if (request.headers.origin && !allowedOrigins.includes(request.headers.origin)) return void response.status(403).json({ error: httpMessages.foreignOrigin });
  if (!request.is('application/json')) return void response.status(415).json({ error: httpMessages.jsonRequired });
  next();
};
