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

  const recognizerRef = useRef<VoiceRecognizer | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const accumulatedRef = useRef('')
  const wantRecordingRef = useRef(false)
  const callbacksRef = useRef({ onTranscribed, onInterim, onError })

  useEffect(() => {
    callbacksRef.current = { onTranscribed, onInterim, onError }
  }, [onTranscribed, onInterim, onError])

  useEffect(() => {
    setSupported(VoiceRecognizer.isSupported())
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const resetState = useCallback(() => {
    wantRecordingRef.current = false
    clearTimer()
    recognizerRef.current?.stop()
    recognizerRef.current = null
    setState('idle')
    setDuration(0)
  }, [clearTimer])

  const createRecognizer = useCallback(() => {
    const recognizer = new VoiceRecognizer()
    recognizerRef.current = recognizer

    recognizer.start({
      onResult: (text, isFinal) => {
        if (isFinal) {
          accumulatedRef.current += text
          callbacksRef.current.onTranscribed(accumulatedRef.current)
          accumulatedRef.current = ''
        } else {
          callbacksRef.current.onInterim?.(accumulatedRef.current + text)
        }
      },
      onError: (err) => {
        resetState()
        callbacksRef.current.onError(err)
      },
      onEnd: () => {
        if (wantRecordingRef.current) {
          createRecognizer()
          return
        }
        clearTimer()
        recognizerRef.current = null
        setState('idle')
        setDuration(0)
      },
    })
  }, [resetState, clearTimer])

  const startListening = useCallback(() => {
    if (disabled) return

    accumulatedRef.current = ''
    wantRecordingRef.current = true

    createRecognizer()

    setState('recording')
    setDuration(0)
    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1)
    }, 1000)
  }, [disabled, createRecognizer])

  const handleClick = useCallback(() => {
    if (disabled) return
    if (state === 'recording') {
      resetState()
    } else {
      startListening()
    }
  }, [disabled, state, resetState, startListening])

  useEffect(() => {
    return () => {
      wantRecordingRef.current = false
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
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            录音中 · {formatDuration(duration)}
          </span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`
          relative w-11 h-11 rounded-full flex items-center justify-center
          transition-all duration-200 select-none
          ${
            state === 'recording'
              ? 'bg-red-500 text-white scale-110'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={state === 'recording' ? '点击结束录音' : '点击开始录音'}
      >
        {state === 'recording' ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}

        {state === 'recording' && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20" />
            <span className="absolute inset-[-4px] rounded-full border-2 border-red-300 animate-pulse" />
          </>
        )}
      </button>
    </div>
  )
}
