import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ModulePlaceholderProps {
  title: string
  description: string
  plannedPhase: string
}

export function ModulePlaceholder({
  title,
  description,
  plannedPhase,
}: ModulePlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="max-w-md text-center text-muted-foreground">{description}</p>
      <Badge variant="secondary">计划于 {plannedPhase} 实现</Badge>
      <Link href="/">
        <Button variant="outline">返回工作台</Button>
      </Link>
    </div>
  )
}
