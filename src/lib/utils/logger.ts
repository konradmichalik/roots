type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  enabled: boolean;
  minLevel: LogLevel;
  showTimestamp: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const LOG_STYLES = {
  connection: 'color: #5e81ac;',
  api: 'color: #b48ead;',
  store: 'color: #ebcb8b;',
  error: 'color: #bf616a;',
  success: 'color: #a3be8c;',
  timing: 'color: #4c566a; font-style: italic;'
};

const ICONS = {
  connection: '\u{1F517}',
  api: '\u{1F4E1}',
  store: '\u{1F4BE}',
  success: '\u2713',
  error: '\u274C',
  request: '\u2192',
  response: '\u2190'
};

class Logger {
  private config: LogConfig = {
    enabled: true,
    minLevel: 'debug',
    showTimestamp: true
  };

  private prefix = '[roots]';

  configure(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private getTimestamp(): string {
    if (!this.config.showTimestamp) return '';
    const now = new Date();
    return `[${now.toLocaleTimeString('en-US')}.${now.getMilliseconds().toString().padStart(3, '0')}]`;
  }

  private formatMessage(icon: string, message: string): string {
    const timestamp = this.getTimestamp();
    return `${this.prefix} ${timestamp} ${icon} ${message}`;
  }

  connection(message: string, data?: unknown): void {
    if (!this.shouldLog('info')) return;
    console.log(
      `%c${this.formatMessage(ICONS.connection, message)}`,
      LOG_STYLES.connection,
      data ?? ''
    );
  }

  connectionSuccess(message: string): void {
    if (!this.shouldLog('info')) return;
    console.log(`%c${this.formatMessage(ICONS.success, message)}`, LOG_STYLES.success);
  }

  apiRequest(method: string, endpoint: string, details?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;
    console.groupCollapsed(
      `%c${this.formatMessage(ICONS.api, `${ICONS.request} ${method} ${endpoint}`)}`,
      LOG_STYLES.api
    );
    if (details) {
      Object.entries(details).forEach(([key, value]) => {
        console.log(`%c\u251C\u2500 ${key}:`, 'color: #4c566a;', value);
      });
    }
    console.groupEnd();
  }

  apiResponse(
    method: string,
    endpoint: string,
    status: number,
    duration: number,
    details?: Record<string, unknown>
  ): void {
    if (!this.shouldLog('debug')) return;
    const statusColor = status >= 200 && status < 300 ? LOG_STYLES.success : LOG_STYLES.error;
    console.groupCollapsed(
      `%c${this.formatMessage(ICONS.api, `${ICONS.response} ${method} ${endpoint}`)} %c${status} %c(${duration}ms)`,
      LOG_STYLES.api,
      statusColor,
      LOG_STYLES.timing
    );
    if (details) {
      Object.entries(details).forEach(([key, value]) => {
        console.log(`%c\u251C\u2500 ${key}:`, 'color: #4c566a;', value);
      });
    }
    console.groupEnd();
  }

  apiError(method: string, endpoint: string, error: unknown): void {
    if (!this.shouldLog('error')) return;
    console.error(
      `%c${this.formatMessage(ICONS.error, `${method} ${endpoint} failed`)}`,
      LOG_STYLES.error,
      error
    );
  }

  store(storeName: string, action: string, data?: unknown): void {
    if (!this.shouldLog('debug')) return;
    console.log(
      `%c${this.formatMessage(ICONS.store, `[${storeName}] ${action}`)}`,
      LOG_STYLES.store,
      data ?? ''
    );
  }

  error(message: string, error?: unknown): void {
    if (!this.shouldLog('error')) return;
    console.error(`%c${this.formatMessage(ICONS.error, message)}`, LOG_STYLES.error, error ?? '');
  }

  warn(message: string, data?: unknown): void {
    if (!this.shouldLog('warn')) return;
    console.warn(`%c${this.formatMessage('\u26A0\uFE0F', message)}`, 'color: #ebcb8b;', data ?? '');
  }

  info(message: string, data?: unknown): void {
    if (!this.shouldLog('info')) return;
    console.log(`%c${this.formatMessage('\u2139\uFE0F', message)}`, 'color: #5e81ac;', data ?? '');
  }

  debug(message: string, data?: unknown): void {
    if (!this.shouldLog('debug')) return;
    console.log(`%c${this.formatMessage('\u{1F41B}', message)}`, 'color: #4c566a;', data ?? '');
  }

  time(): () => number {
    const start = performance.now();
    return () => {
      const duration = Math.round(performance.now() - start);
      return duration;
    };
  }
}

export const logger = new Logger();

if (import.meta.env.PROD) {
  logger.configure({ minLevel: 'warn' });
}
