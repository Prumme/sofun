import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
if (existsSync('.env')) loadEnvFile('.env');
const port = process.env.WEB_PORT ?? '5173';
const addresses = process.env.LAN_HOST ? [process.env.LAN_HOST] : [...new Set(Object.values(networkInterfaces()).flat().filter(info => info && info.family === 'IPv4' && !info.internal).map(info => info.address))];
console.log(`\nParty Games · http://localhost:${port}`);
for (const address of addresses) console.log(`Téléphones → http://${address}:${port}`);
if (!addresses.length) console.log('Aucune interface LAN détectée. Vérifiez votre connexion Wi-Fi.');
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue;
    try {
      if (process.platform === 'win32') child.kill('SIGTERM');
      else process.kill(-child.pid, 'SIGTERM');
    } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
  process.exitCode = code;
}
function run(args, env = {}) {
  const child = spawn('pnpm', args, { stdio: 'inherit', detached: process.platform !== 'win32', env: { ...process.env, ...env } });
  children.push(child);
  child.on('error', () => stop(1));
  child.on('exit', code => { if (!stopping) stop(code ?? 1); });
}
// Compile server once before starting Node's watcher.
const build = spawn('pnpm', ['--filter', '@party/server', 'build'], { stdio: 'inherit', detached: process.platform !== 'win32' });
children.push(build);
build.on('exit', code => {
  if (stopping) return;
  if (code !== 0) return stop(code ?? 1);
  run(['--filter', '@party/contracts', 'dev']);
  run(['--filter', '@party/game-sdk', 'dev']);
  run(['--filter', '@party/server', 'exec', 'tsc', '--watch', '--preserveWatchOutput']);
  run(['--filter', '@party/server', 'dev'], { HOST: '127.0.0.1', PORT: process.env.PORT ?? '3000' });
  run(['--filter', '@party/web', 'dev']);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
