/**
 * Breadcrumbs Ring Buffer
 * Stores last 30 analytics events and log messages for error contextualization.
 */

import { CONFIG } from '../config';

export interface Breadcrumb {
  type: 'log' | 'event';
  message: string;
  timestamp: string;
  category?: string;
  data?: Record<string, any>;
}

class BreadcrumbBuffer {
  private buffer: Breadcrumb[] = [];

  add(breadcrumb: Omit<Breadcrumb, 'timestamp'>) {
    const entry: Breadcrumb = {
      ...breadcrumb,
      timestamp: new Date().toISOString(),
    };

    this.buffer.push(entry);
    if (this.buffer.length > CONFIG.MAX_BREADCRUMBS) {
      this.buffer.shift();
    }
  }

  getBreadcrumbs(): Breadcrumb[] {
    return [...this.buffer];
  }

  clear() {
    this.buffer = [];
  }
}

export const breadcrumbs = new BreadcrumbBuffer();
