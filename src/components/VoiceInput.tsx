import { useCallback, useEffect, useRef, useState } from 'react'
import { VoiceRecognizer } from '@/services/speechToText'

interface Props {
  onTranscribed: (text: string) => void
  onInterim?: (text: string) => void
  onError: (error: string) => void
  disabled?: boolean
}

type RecordingState = 'idle' | 'recording'

export default function VoiceInput({
  onTranscribed,
  onInterim,
  onError,
  disabled = false,
}: Props) {
  const [state, setState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0)
  const [supported, setSupported] = useState(true)
  const [dragCancel, setDragCancel] = useState(false)

  const recognizerRef = useRef<VoiceRecognizer | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startYRef = useRef(0)
  const accumulatedRef = useRef('')

  useEffect(() => {
    setSupported(VoiceRecognizer.isSupported())
  }, [])

  const stopListening = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    recognizerRef.current?.stop()
    recognizerRef.current = null
    setState('idle')
    setDuration(0)
  }, [])

  const startListening = useCallback(
    (startY: number) => {
      if (disabled || state !== 'idle') return

      startYRef.current = startY
      setDragCancel(false)
      accumulatedRef.current = ''

      const recognizer = new VoiceRecognizer()
      recognizerRef.current = recognizer

      recognizer.start({
        onResult: (text, isFinal) => {
          if (isFinal) {
            accumulatedRef.current += text
            onTranscribed(accumulatedRef.current)
            accumulatedRef.current = ''
          } else {
            onInterim?.(accumulatedRef.current + text)
          }
        },
        onError: (err) => {
          stopListening()
          onError(err)
        },
        onEnd: () => {
          stopListening()
        },
      })

      setState('recording')
      setDuration(0)
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    },
    [disabled, state, onTranscribed, onInterim, onError, stopListening]
  )

  const handleStop = useCallback(() => {
    if (state !== 'recording') return

    if (dragCancel) {
      recognizerRef.current?.abort()
      recognizerRef.current = null
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setState('idle')
      setDuration(0)
      accumulatedRef.current = ''
      return
    }

    stopListening()
  }, [state, dragCancel, stopListening])

  const handleMove = useCallback(
    (clientY: number) => {
      if (state !== 'recording') return
      const diff = startYRef.current - clientY
      setDragCancel(diff > 50)
    },
    [state]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startListening(e.clientY)
    },
    [startListening]
  )

  const handleMouseUp = useCallback(() => {
    if (state === 'recording') handleStop()
  }, [state, handleStop])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => handleMove(e.clientY),
    [handleMove]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      startListening(e.touches[0].clientY)
    },
    [startListening]
  )

  const handleTouchEnd = useCallback(() => {
    if (state === 'recording') handleStop()
  }, [state, handleStop])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => handleMove(e.touches[0].clientY),
    [handleMove]
  )

  useEffect(() => {
    if (state !== 'recording') return

    const handleGlobalUp = () => handleStop()
    window.addEventListener('mouseup', handleGlobalUp)
    window.addEventListener('touchend', handleGlobalUp)

    return () => {
      window.removeEventListener('mouseup', handleGlobalUp)
      window.removeEventListener('touchend', handleGlobalUp)
    }
  }, [state, handleStop])

  useEffect(() => {
    return () => {
      recognizerRef.current?.abort()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (!supported) return null

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="relative">
      {state === 'recording' && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
          {dragCancel ? (
            <span className="text-red-400">松开取消</span>
          ) : (
            <span>上滑取消 · {formatDuration(duration)}</span>
          )}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
        </div>
      )}

      <button
        type="button"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        disabled={disabled}
        className={`
          relative w-11 h-11 rounded-full flex items-center justify-center
          transition-all duration-200 select-none touch-none
          ${
            state === 'recording'
              ? dragCancel
                ? 'bg-red-500 text-white scale-125'
                : 'bg-blue-500 text-white scale-125'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 active:bg-blue-500 active:text-white'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>

        {state === 'recording' && !dragCancel && (
          <>
            <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30" />
            <span className="absolute inset-[-4px] rounded-full border-2 border-blue-300 animate-pulse" />
          </>
        )}
      </button>
    </div>
  )
}
