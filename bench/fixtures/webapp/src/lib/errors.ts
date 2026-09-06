/**
 * Convention 2: every failure that crosses the network boundary is an ApiError.
 * The server speaks one envelope — { error: { code, message } } — and nothing
 * above src/lib has to know that.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const body = (await response.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null;
    return new ApiError(
      body?.error?.code ?? 'unknown',
      response.status,
      body?.error?.message ?? response.statusText,
    );
  }
}
