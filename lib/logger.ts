type Level = "info" | "warn" | "error";

function emit(level: Level, message: string, meta?: unknown) {
  const line = `[homeease] ${new Date().toISOString()} ${level.toUpperCase()} ${message}`;
  if (level === "error") console.error(line, meta ?? "");
  else if (level === "warn") console.warn(line, meta ?? "");
  else if (process.env.NODE_ENV !== "production") console.log(line, meta ?? "");
}

export const logger = {
  info: (m: string, meta?: unknown) => emit("info", m, meta),
  warn: (m: string, meta?: unknown) => emit("warn", m, meta),
  error: (m: string, meta?: unknown) => emit("error", m, meta),
};
