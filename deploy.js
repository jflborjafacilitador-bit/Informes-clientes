/**
 * deploy.js — Script de despliegue para producción
 *
 * Uso: node deploy.js  o  npm run deploy
 *
 * IMPORTANTE: Usa siempre este script para hacer deploy y NUNCA
 * corras `npm run build` directamente, porque ese comando sobreescribe
 * el index.html de desarrollo. Este script lo guarda y restaura.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const INDEX_PATH = './index.html';

// ── 1. Guardar el index.html de desarrollo ──────────────────
const devHtml = readFileSync(INDEX_PATH, 'utf-8');
console.log('📦 index.html dev guardado en memoria.');

try {
    // ── 2. Build de producción ──────────────────────────────────
    console.log('\n🔨 Ejecutando npm run build...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completado.\n');

    // ── 3. Git: commit + push ───────────────────────────────────
    const msg = process.argv[2] || 'deploy: update produccion';
    console.log(`📤 Subiendo a GitHub con mensaje: "${msg}"`);
    execSync('git add -A', { stdio: 'inherit' });
    execSync(`git commit -m "${msg}"`, { stdio: 'inherit' });
    execSync('git push origin main', { stdio: 'inherit' });
    console.log('✅ Push completado.\n');

} finally {
    // ── 4. Restaurar index.html de desarrollo (SIEMPRE, aunque falle) ──
    writeFileSync(INDEX_PATH, devHtml, 'utf-8');
    console.log('🔄 index.html restaurado a modo desarrollo.');
    console.log('\n🎉 Deploy finalizado. El servidor local sigue en modo dev correctamente.');
}

