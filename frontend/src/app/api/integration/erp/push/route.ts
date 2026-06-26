import { NextRequest, NextResponse } from 'next/server'
import { pushToErp } from '@/lib/integration/integration-service'

/** ERP 投产推送 API — Mock 占位，后端接入后转发至真实 ERP。 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    collaborationId?: string
    productCode?: string
  }

  if (!body.collaborationId) {
    return NextResponse.json({ error: 'collaborationId is required' }, { status: 400 })
  }

  const logs: unknown[] = []
  const result = await pushToErp(body.collaborationId, body.productCode ?? 'UNKNOWN', (entry) => {
    logs.push(entry)
  })

  return NextResponse.json({
    ...result,
    mode: 'mock',
    logs,
  })
}
