export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function friendlyMessage(status: number, fallback: string): string {
  if (status === 401) return 'Your session expired — please sign in again'
  if (status === 403) return 'Access Denied — contact your administrator'
  if (status === 404) return 'Resource not found'
  if (status >= 500) return 'Server error — try again in a few moments'
  return fallback
}

export async function apiClient<T = unknown>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  if (!baseUrl) throw new Error('NEXT_PUBLIC_BACKEND_URL is not set')

  let res: Response
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers as Record<string, string>),
      },
    })
  } catch {
    throw new ApiError(0, 'Connection failed — check your internet connection')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    const raw = (body as { message?: string }).message ?? res.statusText
    throw new ApiError(res.status, friendlyMessage(res.status, raw))
  }

  return res.json() as Promise<T>
}
