'use client'

import { Plug } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isMockIntegration } from '@/lib/integration/config'
import { cn } from '@/lib/utils'

export interface IntegrationStatusCardProps {
  title: string
  description: string
  ok: boolean
  message: string
}

export function IntegrationStatusCard({
  title,
  description,
  ok,
  message,
}: IntegrationStatusCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="size-4" />
            {title}
          </CardTitle>
          <Badge variant={ok ? 'default' : 'destructive'}>{ok ? '已连接' : '异常'}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className={cn('text-sm', ok ? 'text-muted-foreground' : 'text-destructive')}>{message}</p>
        {isMockIntegration() && (
          <Badge variant="outline" className="mt-2">
            Mock 模式
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
