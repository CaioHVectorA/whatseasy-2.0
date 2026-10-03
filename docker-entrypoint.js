#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';

const env = { ...process.env };

;(async () => {
  // Garante que o diretório montado /data e a pasta /data/auths existam
  try {
    const dataDir = '/data';
    const authsDir = process.env.AUTHS_DIR || '/data/auths';
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(authsDir)) fs.mkdirSync(authsDir, { recursive: true });
    console.log(`[docker-entrypoint] Pastas persistentes confirmadas: ${dataDir} e ${authsDir}`);
  } catch (err) {
    console.warn('[docker-entrypoint] Aviso ao criar pastas de dados:', err);
  }

  // Executa migração do banco no SQLite persistente em /data/dev.db
  try {
    console.log('[docker-entrypoint] Sincronizando schema Prisma no banco de dados com migrate deploy...');
    await exec('npx prisma migrate deploy');
  } catch (err) {
    console.warn('[docker-entrypoint] prisma migrate deploy reportou aviso:', err?.message || err);
  }

  // Executa db push para garantir que qualquer coluna ou tabela faltante seja criada imediatamente
  try {
    console.log('[docker-entrypoint] Garantindo consistência total do schema com prisma db push...');
    await exec('npx prisma db push --skip-generate');
  } catch (pushErr) {
    console.warn('[docker-entrypoint] Aviso no prisma db push:', pushErr?.message || pushErr);
  }

  // Executa comando principal da aplicação
  const command = process.argv.slice(2).join(' ') || 'npm start';
  console.log(`[docker-entrypoint] Executando comando: ${command}`);
  await exec(command);
})();

function exec(command) {
  const child = spawn(command, { shell: true, stdio: 'inherit', env });
  return new Promise((resolve, reject) => {
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} falhou com código ${code}`));
      }
    });
  });
}
