import winston from "winston";

const level = (Bun.env.ORCA_LOG_LEVEL || "info").toLowerCase();

export const logger = winston.createLogger({
  level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
      const base = `${timestamp} [${level}] ${message}`;
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
      return stack ? `${base}\n${stack}${metaStr}` : `${base}${metaStr}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
