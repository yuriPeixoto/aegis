import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { useTranslation } from 'react-i18next'
import { Eraser } from 'lucide-react'

export interface SignatureCanvasHandle {
  isEmpty: () => boolean
  toDataUrl: () => string | null
  clear: () => void
}

interface SignatureCanvasProps {
  className?: string
}

function getPoint(
  canvas: HTMLCanvasElement,
  e: React.MouseEvent | React.TouchEvent,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const point = 'touches' in e ? e.touches[0] : e
  return {
    x: (point.clientX - rect.left) * scaleX,
    y: (point.clientY - rect.top) * scaleY,
  }
}

export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(
  function SignatureCanvas({ className }, ref) {
    const { t } = useTranslation()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const drawingRef = useRef(false)
    const hasDrawnRef = useRef(false)
    const [isEmpty, setIsEmpty] = useState(true)

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#111827'
    }, [])

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      drawingRef.current = true
      const { x, y } = getPoint(canvas, e)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!drawingRef.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const { x, y } = getPoint(canvas, e)
      ctx.lineTo(x, y)
      ctx.stroke()
      hasDrawnRef.current = true
      setIsEmpty(false)
    }

    const stopDraw = () => {
      drawingRef.current = false
    }

    const clear = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      hasDrawnRef.current = false
      setIsEmpty(true)
    }

    useImperativeHandle(ref, () => ({
      isEmpty: () => !hasDrawnRef.current,
      toDataUrl: () => (hasDrawnRef.current ? canvasRef.current?.toDataURL('image/png') ?? null : null),
      clear,
    }))

    return (
      <div className={className}>
        <div className="relative bg-white rounded-lg border-2 border-dashed border-slate-300 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="w-full h-[160px] touch-none cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          {isEmpty && (
            <span className="absolute inset-0 flex items-center justify-center text-sm text-slate-400 pointer-events-none">
              {t('training.signature.placeholder')}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={clear}
          className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Eraser className="w-3.5 h-3.5" />
          {t('training.signature.clear')}
        </button>
      </div>
    )
  },
)
