export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class HTTPError extends Error {
  constructor(
    private statusCode: number,
    private statusMessage: string,
  ) {
    super(`Response code ${statusCode} (${statusMessage})`);
    this.name = 'HTTPError';
  }
}

export async function handleApiResponse<T>(response: Response) {
  const body: {error: string} | {result: T} | null = await response.json().catch((err) => null);

  if (body !== null && 'error' in body) {
    throw new ApiError(body.error);
  }

  if (!response.ok) {
    throw new HTTPError(response.status, response.statusText);
  }

  if (!body) {
    throw new Error('Empty body');
  }
  return body.result;
}
