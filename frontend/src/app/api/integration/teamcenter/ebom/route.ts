import { NextRequest, NextResponse } from 'next/server'
import { syncEbomFromTeamcenter } from '@/lib/integration/integration-service'

/** Teamcenter EBOM 同步 API — Mock 占位。 */
export async function GET(request: NextRequest) {
  const collaborationId = request.nextUrl.searchParams.get('collaborationId')
  if (!collaborationId) {
    return NextResponse.json({ error: 'collaborationId is required' }, { status: 400 })
  }

  const logs: unknown[] = []
  const result = await syncEbomFromTeamcenter(collaborationId, (entry) => {
    logs.push(entry)
  })

  return NextResponse.json({
    ...result,
    mode: 'mock',
    logs,
  })
}
