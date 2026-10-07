import type { RequestHandler } from 'express';
import { config } from '../config.js';
import { httpMessages, securityHeaders } from './http-messages.js';

const allowedOrigins = config.allowedHosts?.flatMap(host => [`http://${host}`, `https://${host}`]) ?? null;

export const hostGuard: RequestHandler = (request, response, next) => {
  const host = request.headers.host?.toLowerCase();
  if (config.allowedHosts && (!host || !config.allowedHosts.includes(host))) return void response.status(403).json({ error: httpMessages.hostNotAllowed });
  response.set(securityHeaders);
  next();
};

export const jsonOriginGuard: RequestHandler = (request, response, next) => {
  if (allowedOrigins && request.headers.origin && !allowedOrigins.includes(request.headers.origin.toLowerCase())) return void response.status(403).json({ error: httpMessages.foreignOrigin });
  if (!request.is('application/json')) return void response.status(415).json({ error: httpMessages.jsonRequired });
  next();
};
