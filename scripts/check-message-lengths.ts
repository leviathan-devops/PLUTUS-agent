/**
 * Build-time check: enforcement messages must NOT exceed 80 characters.
 * 
 * Models read only the first ~80 characters of the first line of any
 * enforcement message. Everything on line 2+ or beyond char 80 is
 * ignored with high probability.
 * 
 * This script enforces the 80-char rule at build time.
 * If any message exceeds 80 chars, the build fails.
 */

import { execSync } from 'child_process';

try {
  // Search for message: backtick strings that are >= 80 chars
  const result = execSync(
    `grep -rn 'message:\\s*['\`"']' src/ --include="*.ts" | grep -oE "'[^']{80,}'|\\"[^\\"]{80,}\\"|\`[^\`]{80,}\`" || true`,
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
  );

  const lines = result.trim().split('\n').filter(Boolean);
  const over80 = lines.filter(l => {
    const content = l.replace(/^['`"]|['`"]$/g, '');
    return content.length >= 80;
  });

  if (over80.length > 0) {
    console.error(`\n❌ FAIL: ${over80.length} enforcement message(s) exceed 80 characters:`);
    for (const msg of over80) {
      console.error(`   ${msg.length}c: ${msg.substring(0, 80)}...`);
    }
    process.exit(1);
  }

  console.log('✅ All enforcement messages under 80 characters');
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  // grep returns exit code 1 when no matches — that's SUCCESS for us
  if (message.includes('Command failed') && message.includes('exit code 1')) {
    console.log('✅ All enforcement messages under 80 characters');
    process.exit(0);
  }
  console.error(`❌ Check failed: ${message}`);
  process.exit(1);
}
