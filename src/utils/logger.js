const LEVELS = {
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
  debug: "DEBUG",
};

const LEVEL_ORDER = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };

const configuredLevel = LEVEL_ORDER[process.env.LOG_LEVEL?.toUpperCase()] || LEVEL_ORDER.INFO;

const shouldLog = (level) => LEVEL_ORDER[level] >= configuredLevel;

const formatMessage = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;

  if (meta instanceof Error) {
    return `${prefix} ${message} :: ${meta.stack || meta.message}`;
  }

  if (meta !== undefined && meta !== null) {
    let metaString;
    try {
      metaString = JSON.stringify(meta);
    } catch {
      metaString = String(meta);
    }
    return `${prefix} ${message} ${metaString}`;
  }

  return `${prefix} ${message}`;
};

const write = (level, target) => (message, meta) => {
  if (!shouldLog(level)) return;
  const text = formatMessage(level, message, meta);
  if (text.includes("\n")) {
    // Preserve multi-line (e.g. stack traces) as-is.
    target(text);
  } else {
    target(text);
  }
};

export const logger = {
  debug: write("DEBUG", console.debug),
  info: write("INFO", console.info),
  warn: write("WARN", console.warn),
  error: write("ERROR", console.error),
};

export default logger;

