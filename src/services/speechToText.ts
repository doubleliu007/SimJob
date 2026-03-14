interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | SpeechRecognitionConstructor
    | null
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognition() !== null
}

export class VoiceRecognizer {
  private recognition: SpeechRecognitionInstance | null = null
  private _isListening = false

  get isListening(): boolean {
    return this._isListening
  }

  static isSupported(): boolean {
    return isSpeechRecognitionSupported()
  }

  start(callbacks: {
    onResult: (text: string, isFinal: boolean) => void
    onError: (error: string) => void
    onEnd: () => void
  }): void {
    const Ctor = getSpeechRecognition()
    if (!Ctor) {
      callbacks.onError('当前浏览器不支持语音识别，推荐使用 Chrome 或 Edge')
      return
    }

    this.stop()

    const recognition = new Ctor()
    this.recognition = recognition
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => {
      this._isListening = true
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        if (result.isFinal) {
          finalText += transcript
        } else {
          interimText += transcript
        }
      }

      if (finalText) {
        callbacks.onResult(finalText, true)
      } else if (interimText) {
        callbacks.onResult(interimText, false)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this._isListening = false
      const errorMap: Record<string, string> = {
        'not-allowed': '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问',
        'no-speech': '未检测到语音，请重试',
        'audio-capture': '无法访问麦克风，请检查设备连接',
        network: '网络错误，语音识别需要网络连接',
        aborted: '',
      }
      const msg = errorMap[event.error]
      if (msg !== undefined && msg !== '') {
        callbacks.onError(msg)
      }
    }

    recognition.onend = () => {
      this._isListening = false
      callbacks.onEnd()
    }

    try {
      recognition.start()
    } catch {
      callbacks.onError('语音识别启动失败，请刷新页面重试')
    }
  }

  stop(): void {
    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch {
        // already stopped
      }
      this.recognition = null
      this._isListening = false
    }
  }

  abort(): void {
    if (this.recognition) {
      try {
        this.recognition.abort()
      } catch {
        // already stopped
      }
      this.recognition = null
      this._isListening = false
    }
  }
}
