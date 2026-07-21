export class GovernedError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly retryable = false,
  ) {
    super(message)
    this.name = "GovernedError"
  }
}

export function publicError(error: unknown) {
  if (error instanceof GovernedError) {
    return { status: error.status, body: { error: error.code, message: error.message } }
  }
  console.error("Governed AI request failed", error instanceof Error ? error.name : "UnknownError")
  return { status: 500, body: { error: "INTERNAL_ERROR", message: "The governed operation failed." } }
}
