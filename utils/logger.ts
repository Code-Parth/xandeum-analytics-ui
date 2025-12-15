type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  [key: string]: unknown;
}

export class Logger {
  private static formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): string {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: "📡",
      warn: "⚠️",
      error: "❌",
      debug: "🔍",
    }[level];

    const base = `[${timestamp}] ${emoji} ${message}`;
    return context ? `${base} ${JSON.stringify(context)}` : base;
  }

  static info(message: string, context?: LogContext): void {
    console.log(this.formatMessage("info", message, context));
  }

  static warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage("warn", message, context));
  }

  static error(message: string, context?: LogContext): void {
    console.error(this.formatMessage("error", message, context));
  }

  static debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(this.formatMessage("debug", message, context));
    }
  }
}
