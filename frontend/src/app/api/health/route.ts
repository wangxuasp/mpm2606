import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: '11.0.0-p8',
    timestamp: new Date().toISOString(),
  })
}
