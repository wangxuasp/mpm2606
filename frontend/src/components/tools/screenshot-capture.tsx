'use client'

import { useCallback, useRef, useState } from 'react'
import { Camera, Download, Type } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type DrawMode = 'none' | 'arrow' | 'text'

export function ScreenshotCapture() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [captured, setCaptured] = useState(false)
  const [drawMode, setDrawMode] = useState<DrawMode>('none')
  const [textInput, setTextInput] = useState('')
  const arrowStartRef = useRef<{ x: number; y: number } | null>(null)

  const captureScreen = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error('当前浏览器不支持屏幕截图')
      return
    }

    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()

      await new Promise((resolve) => {
        if (video.readyState >= 2) resolve(undefined)
        else video.onloadeddata = () => resolve(undefined)
      })

      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(video, 0, 0)
      setCaptured(true)
      setDrawMode('none')
      toast.success('截图已捕获')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        toast.error('用户取消了屏幕共享')
      } else {
        toast.error('截图失败')
      }
    } finally {
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !captured) return

    const point = getCanvasPoint(e)

    if (drawMode === 'arrow') {
      arrowStartRef.current = point
    } else if (drawMode === 'text' && textInput.trim()) {
      ctx.font = '20px sans-serif'
      ctx.fillStyle = '#ef4444'
      ctx.fillText(textInput.trim(), point.x, point.y)
    }
  }

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const start = arrowStartRef.current
    if (!canvas || !ctx || !captured || drawMode !== 'arrow' || !start) return

    const end = getCanvasPoint(e)
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()

    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    const headLen = 12
    ctx.beginPath()
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(
      end.x - headLen * Math.cos(angle - Math.PI / 6),
      end.y - headLen * Math.sin(angle - Math.PI / 6),
    )
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(
      end.x - headLen * Math.cos(angle + Math.PI / 6),
      end.y - headLen * Math.sin(angle + Math.PI / 6),
    )
    ctx.stroke()

    arrowStartRef.current = null
  }

  const downloadPng = () => {
    const canvas = canvasRef.current
    if (!canvas || !captured) {
      toast.error('请先截图')
      return
    }
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `screenshot-${Date.now()}.png`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('PNG 已下载')
    }, 'image/png')
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={captureScreen}>
          <Camera className="size-4" />
          截图
        </Button>
        <Button
          type="button"
          variant={drawMode === 'arrow' ? 'default' : 'outline'}
          size="sm"
          disabled={!captured}
          onClick={() => setDrawMode((m) => (m === 'arrow' ? 'none' : 'arrow'))}
        >
          箭头标注
        </Button>
        <Button
          type="button"
          variant={drawMode === 'text' ? 'default' : 'outline'}
          size="sm"
          disabled={!captured}
          onClick={() => setDrawMode((m) => (m === 'text' ? 'none' : 'text'))}
        >
          <Type className="size-4" />
          文字标注
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!captured} onClick={downloadPng}>
          <Download className="size-4" />
          下载 PNG
        </Button>
      </div>

      {drawMode === 'text' && (
        <div className="flex max-w-sm items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="screenshot-text">标注文字</Label>
            <Input
              id="screenshot-text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="输入后点击画布放置"
            />
          </div>
        </div>
      )}

      <div className="overflow-auto rounded-md border bg-muted/30">
        <canvas
          ref={canvasRef}
          className="max-h-[360px] w-full cursor-crosshair"
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
        />
        {!captured && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            点击「截图」捕获屏幕内容，可进行简单标注后下载 PNG
          </p>
        )}
      </div>
    </div>
  )
}
