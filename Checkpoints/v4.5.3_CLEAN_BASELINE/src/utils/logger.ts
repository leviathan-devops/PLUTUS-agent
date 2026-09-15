/**
 * Logger — structured logging for Plutus TS.
 *
 * File-based + stderr output. Matches Shark's logging pattern.
 * Writes to ~/.plutus/plutus.log by default.
 */

import { mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARNING: 30,
  ERROR: 40,
  CRITICAL: 50,
};

export class Logger {
  constructor(
    private readonly component: string,
    private readonly minLevel: LogLevel = 'INFO',
    private readonly logFile: string | null = null,
  ) {
    if (logFile) {
      const dir = dirname(logFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  debug(msg: string, ...args: unknown[]): void {
    this.log('DEBUG', msg, args);
  }

  info(msg: string, ...args: unknown[]): void {
    this.log('INFO', msg, args);
  }

  warn(msg: string, ...args: unknown[]): void {
    this.log('WARNING', msg, args);
  }

  error(msg: string, ...args: unknown[]): void {
    this.log('ERROR', msg, args);
  }

  critical(msg: string, ...args: unknown[]): void {
    this.log('CRITICAL', msg, args);
  }

  private log(level: LogLevel, msg: string, args: unknown[]): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) return;

    const timestamp = new Date().toISOString();
    const argStr = args.length > 0 ? ' ' + args.map((a: unknown) => JSON.stringify(a)).join(' ') : '';
    const line = `${timestamp} [${level.padEnd(8)}] [${this.component}] ${msg}${argStr}\n`;

    // Always write to stderr
    process.stderr.write(line);

    // Also write to log file if configured
    if (this.logFile) {
      try {
        appendFileSync(this.logFile, line);
      } catch (e) {
        // Logging should never crash the pipeline, but record the failure
        console.error('[Logger] Failed to append to log file:', e instanceof Error ? e.message : String(e));
      }
    }
  }

  child(subcomponent: string): Logger {
    return new Logger(
      `${this.component}.${subcomponent}`,
      this.minLevel,
      this.logFile,
    );
  }
}
