import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { apiClient } from '@/lib/api-client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const shop = searchParams.get('shop') ?? undefined
  const error = searchParams.get('error')

  const base = request.nextUrl.origin

  // User denied authorization
  if (error || !code || !state) {
    return NextResponse.redirect(new URL('/integrations?error=oauth_cancelled', base))
  }

  const { getToken } = await auth()
  const token = await getToken()
  if (!token) {
    return NextResponse.redirect(new URL('/sign-in', base))
  }

  try {
    await apiClient<{ integrationId: string; platform: string; status: string }>(
      '/api/v1/integrations/connect/complete',
      token,
      {
        method: 'POST',
        body: JSON.stringify({ platform, code, state, ...(shop ? { shop } : {}) }),
      }
    )
    return NextResponse.redirect(new URL(`/integrations?connected=${platform}`, base))
  } catch {
    return NextResponse.redirect(new URL('/integrations?error=oauth_failed', base))
  }
}
