/**
 * Structured Logging System
 * Centralized logging dengan levels, context, dan structured output
 */

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL",
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  action?: string;
  module?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private logLevel = this.getLogLevel(process.env.LOG_LEVEL || "INFO");

  private getLogLevel(level: string): LogLevel {
    return LogLevel[level as keyof typeof LogLevel] || LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      return JSON.stringify(entry, null, 2);
    }
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, context: LogContext = {}, error?: Error, duration?: number) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      duration,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const formatted = this.formatLog(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.FATAL:
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error | string, context?: LogContext) {
    const err = typeof error === "string" ? new Error(error) : error;
    this.log(LogLevel.ERROR, message, context, err);
  }

  fatal(message: string, error?: Error | string, context?: LogContext) {
    const err = typeof error === "string" ? new Error(error) : error;
    this.log(LogLevel.FATAL, message, context, err);
  }

  /**
   * Log action dengan durasi
   */
  async logAction<T>(
    action: string,
    fn: () => Promise<T>,
    context: LogContext = {}
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.info(`${action} completed`, {
        ...context,
        action,
        metadata: { ...context.metadata, duration: `${duration.toFixed(2)}ms` },
      });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.error(`${action} failed`, error as Error, {
        ...context,
        action,
        metadata: { ...context.metadata, duration: `${duration.toFixed(2)}ms` },
      });
      throw error;
    }
  }

  /**
   * Create child logger dengan context pre-filled
   */
  createChild(baseContext: LogContext) {
    return {
      debug: (msg: string, ctx?: LogContext) => this.debug(msg, { ...baseContext, ...ctx }),
      info: (msg: string, ctx?: LogContext) => this.info(msg, { ...baseContext, ...ctx }),
      warn: (msg: string, ctx?: LogContext) => this.warn(msg, { ...baseContext, ...ctx }),
      error: (msg: string, err?: Error | string, ctx?: LogContext) =>
        this.error(msg, err, { ...baseContext, ...ctx }),
      logAction: <T,>(action: string, fn: () => Promise<T>, ctx?: LogContext) =>
        this.logAction(action, fn, { ...baseContext, ...ctx }),
    };
  }
}

export const logger = new Logger();

/**
 * Middleware untuk logging di API routes
 */
export function createLoggingMiddleware(requestId: string) {
  return {
    info: (message: string, metadata?: Record<string, any>) =>
      logger.info(message, { requestId, metadata }),
    warn: (message: string, metadata?: Record<string, any>) =>
      logger.warn(message, { requestId, metadata }),
    error: (message: string, error?: Error, metadata?: Record<string, any>) =>
      logger.error(message, error, { requestId, metadata }),
    debug: (message: string, metadata?: Record<string, any>) =>
      logger.debug(message, { requestId, metadata }),
  };
}
