import "server-only";

/*
 * Structured JSON logger. Workers Observability indexes these lines.
 * Never pass secrets, passwords, tokens, cookies or raw request bodies.
 * See docs/security/logging.md.
 */

type Level = "info" | "warn" | "error";
type Fields = Record<string, string | number | boolean | null | undefined>;

function write(level: Level, event: string, fields: Fields = {}) {
  const line = JSON.stringify({ level, event, ts: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, fields?: Fields) => write("error", event, fields),
};

type DatabaseErrorLike = Error & { code?: unknown; query?: unknown; params?: unknown };

/** PostgreSQL SQLSTATE: five digits or uppercase letters (e.g. 23505). */
const SQLSTATE = /^[0-9A-Z]{5}$/;

function sqlState(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && SQLSTATE.test(code) ? code : undefined;
}

/**
 * Database errors carry user data: drizzle's DrizzleQueryError message is
 * "Failed query: <sql>\nparams: <values>", and PostgreSQL messages can quote the
 * offending value. Their messages are never logged, only the error names, the
 * SQLSTATE and the parameterised SQL text (placeholders, no values).
 */
function isDatabaseError(error: Error): error is DatabaseErrorLike {
  const e = error as DatabaseErrorLike;
  return "params" in e || typeof e.query === "string" || sqlState(e) !== undefined;
}

/** Only the "at …" frames: the stack header repeats the (possibly multi-line) message. */
function framesOnly(stack: string | undefined): string | undefined {
  return stack?.split("\n").filter((line) => /^\s+at\s/.test(line)).join("\n") || undefined;
}

/** Extracts a loggable description of an unknown error, without request data. */
export function describeError(error: unknown): Fields {
  if (!(error instanceof Error)) return { errorMessage: String(error) };
  if (!isDatabaseError(error)) return { errorName: error.name, errorMessage: error.message, stack: error.stack };

  const cause = error.cause instanceof Error ? error.cause : undefined;
  return {
    errorName: error.name,
    dbErrorCode: sqlState(error) ?? sqlState(cause),
    dbCauseName: cause?.name,
    query: typeof error.query === "string" ? error.query.slice(0, 500) : undefined,
    stack: framesOnly(error.stack),
  };
}
