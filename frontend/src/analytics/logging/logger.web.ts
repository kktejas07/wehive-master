/**
 * Logger Web Transport (*.web.ts)
 */

import { redactLogAttributes } from './redact';
import { breadcrumbs } from './breadcrumbs';
import { getStandardEnvelope } from '../core/context';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

class WebLogger {
  private level: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

  info(msg: string, attrs: Record<string, any> = {}) {
    this.log('info', msg, attrs);
  }

  debug(msg: string, attrs: Record<string, any> = {}) {
    this.log('debug', msg, attrs);
  }

  warn(msg: string, attrs: Record<string, any> = {}) {
    this.log('warn', msg, attrs);
  }

  error(msg: string, attrs: Record<string, any> = {}, error?: any) {
    this.log('error', msg, { ...attrs, error_details: error?.message || String(error) });
  }

  private log(level: LogLevel, msg: string, attrs: Record<string, any>) {
    const envelope = getStandardEnvelope();
    const sanitizedAttrs = redactLogAttributes({ ...envelope, ...attrs });

    // Record breadcrumb
    breadcrumbs.add({
      type: 'log',
      message: `${level.toUpperCase()}: ${msg}`,
      category: attrs.scope || 'app',
      data: sanitizedAttrs,
    });

    // Console formatting in DEV
    if (process.env.NODE_ENV !== 'production' || window.location.search.includes('debug=true')) {
      const colors: Record<LogLevel, string> = {
        trace: '#94a3b8',
        debug: '#38bdf8',
        info: '#10b981',
        warn: '#f59e0b',
        error: '#ef4444',
        fatal: '#dc2626',
      };
      console.log(
        `%c[Log ${level.toUpperCase()}] %c${msg}`,
        `color: ${colors[level]}; font-weight: bold;`,
        'color: inherit;',
        sanitizedAttrs
      );
    }
  }
}

export const logger = new WebLogger();
