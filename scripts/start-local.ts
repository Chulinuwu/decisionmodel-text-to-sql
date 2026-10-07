import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';

const log = openSync('server.log', 'a');
const process = spawn('npm', ['start'], { detached: true, stdio: ['ignore', log, log] });
process.unref();
console.log(`Server PID: ${process.pid}`);
