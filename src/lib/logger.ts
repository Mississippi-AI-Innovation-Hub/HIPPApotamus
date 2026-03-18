type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const isDev = process.env.NODE_ENV === "development";

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();

  if (isDev) {
    const color = LEVEL_COLORS[level];
    const prefix = `${color}[${timestamp}] [${level.toUpperCase()}]${RESET}`;
    if (context !== undefined) {
      console[level === "debug" ? "log" : level](`${prefix} ${message}`, context);
    } else {
      console[level === "debug" ? "log" : level](`${prefix} ${message}`);
    }
    return;
  }

  // Production: structured JSON for CloudWatch Logs Insights
  const entry: LogEntry = { level, message, timestamp, ...(context && { context }) };
  console[level === "debug" ? "log" : level](JSON.stringify(entry));
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    emit("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    emit("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    emit("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    emit("error", message, context),
} as const;
