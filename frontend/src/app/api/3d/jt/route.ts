import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const nodeId = request.nextUrl.searchParams.get('nodeId')
  if (!nodeId) {
    return NextResponse.json({ error: 'nodeId is required' }, { status: 400 })
  }
  const rev = request.nextUrl.searchParams.get('rev') ?? 'A'
  return NextResponse.json({
    nodeId,
    revision: rev,
    fileName: 'mock.jt',
    downloadUrl: null,
    message: 'Mock 响应 - JT 下载服务待后端接入',
  })
}
