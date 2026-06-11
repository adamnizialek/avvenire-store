/**
 * Normalizes an Axios/server error into a single display string. NestJS's
 * ValidationPipe returns `message` as a string[] for validation failures, which
 * would otherwise render as concatenated text with no separator.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: unknown } } })
      .response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}
