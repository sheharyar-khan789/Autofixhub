import "server-only";

/**
 * Structured server-side logging. Never pass user-supplied PII (name, email,
 * phone, VRM, message text) in `context`; only identifiers and error metadata.
 */
export function logServerError(
  scope: string,
  err: unknown,
  context: Record<string, string | number | boolean | undefined> = {},
): void {
  const e = err instanceof Error ? err : new Error(String(err));
  const code = (err as { code?: string | number } | null)?.code;
  console.error(
    JSON.stringify({
      level: "error",
      scope,
      name: e.name,
      message: e.message.slice(0, 500),
      code: code === undefined ? undefined : String(code),
      stack: e.stack?.split("\n").slice(0, 6).join("\n"),
      ...context,
      at: new Date().toISOString(),
    }),
  );
}

export function logServerWarn(
  scope: string,
  message: string,
  context: Record<string, string | number | boolean | undefined> = {},
): void {
  console.warn(
    JSON.stringify({ level: "warn", scope, message, ...context, at: new Date().toISOString() }),
  );
}
