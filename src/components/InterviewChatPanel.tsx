import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Agent, InterviewMessage, InterviewStatus } from '@/types'
import { PERSONALITY_MAP } from '@/config/personalities'
import VoiceInput from './VoiceInput'

interface Props {
  messages: InterviewMessage[]
  status: InterviewStatus
  speakingAgent: Agent | null
  onSendAnswer: (answer: string) => void
  onEndInterview: () => void
}

const STATUS_LABELS: Record<string, string> = {
  idle: '等待开始',
  generating_agents: '正在生成面试官...',
  opening: '面试开始中...',
  questioning: '面试官提问中...',
  waiting_for_user: '请回答问题',
  moderator_deciding: '正在准备下一个问题...',
  evaluating: '面试官评价中...',
  finished: '面试结束',
  error: '出现错误',
}

function InterviewMessageBubble({ message }: { message: InterviewMessage }) {
  const isUser = message.type === 'user_answer'
  const isEval = message.phase === 'evaluating'
  const pConfig = message.personalityType
    ? PERSONALITY_MAP.get(message.personalityType)
    : null

  if (isUser) {
    return (
      <div className="flex gap-3 my-3 justify-end">
        <div className="max-w-[75%]">
          <div className="flex items-center gap-2 mb-1 justify-end">
            <span className="text-xs text-slate-400">我的回答</span>
          </div>
          <div className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed bg-blue-500 text-white">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
        <div className="shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl">
          🙋
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 my-3">
      <div className="shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl">
        {message.agentAvatar ?? '💬'}
      </div>
      <div className="flex-1 min-w-0 max-w-[75%]">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-semibold text-slate-800">
            {message.agentName}
          </span>
          <span className="text-xs text-slate-400">{message.agentRole}</span>
          {pConfig && (
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: pConfig.color + '18',
                color: pConfig.color,
              }}
            >
              {message.agentPersonality}
            </span>
          )}
        </div>
        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed ${
            isEval
              ? 'bg-amber-50 border border-amber-200 text-slate-800'
              : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </div>
  )
}

export default function InterviewChatPanel({
  messages,
  status,
  speakingAgent,
  onSendAnswer,
  onEndInterview,
}: Props) {
  const [inputText, setInputText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const isWaiting = status === 'waiting_for_user'
  const isRunning =
    status !== 'idle' && status !== 'finished' && status !== 'error'
  const canEnd =
    isRunning && status !== 'generating_agents' && status !== 'opening'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, speakingAgent])

  useEffect(() => {
    if (isWaiting) {
      inputRef.current?.focus()
    }
  }, [isWaiting])

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (!inputText.trim() || !isWaiting) return
    onSendAnswer(inputText.trim())
    setInputText('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleVoiceTranscribed(text: string) {
    setInputText((prev) => (prev ? prev + ' ' + text : text))
    inputRef.current?.focus()
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 md:px-6 py-2.5 md:py-3 bg-white/60 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {isRunning && status !== 'waiting_for_user' && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
          )}
          {isWaiting && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
          )}
          <span className="text-sm font-medium text-slate-600">
            {STATUS_LABELS[status] ?? status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {messages.filter((m) => m.type === 'interviewer_question').length} 个问题
          </span>
          {canEnd && (
            <button
              onClick={onEndInterview}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              结束面试
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 md:px-6 py-3 md:py-4 bg-slate-50/50">
        {messages.length === 0 && status === 'idle' && (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            面试尚未开始
          </div>
        )}

        {messages.map((msg) => (
          <InterviewMessageBubble key={msg.id} message={msg} />
        ))}

        {speakingAgent && status !== 'finished' && status !== 'waiting_for_user' && (
          <div className="flex gap-3 my-3 animate-pulse">
            <div className="shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl">
              {speakingAgent.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-800">
                  {speakingAgent.name}
                </span>
                <span className="text-xs text-slate-400">
                  {speakingAgent.roleLabel}
                </span>
              </div>
              <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
                <span
                  className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      {status !== 'finished' && (
        <div className="px-4 py-3 bg-white border-t border-slate-200">
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2"
          >
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isWaiting
                  ? '输入你的回答...（Enter 发送，Shift+Enter 换行）'
                  : '等待面试官提问...'
              }
              disabled={!isWaiting}
              rows={1}
              className={`
                flex-1 resize-none rounded-xl border px-4 py-2.5 text-sm
                transition-colors min-h-[42px] max-h-32
                ${
                  isWaiting
                    ? 'border-slate-300 bg-white text-slate-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                    : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                }
                outline-none
              `}
              style={{
                height: 'auto',
                minHeight: '42px',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 128) + 'px'
              }}
            />

            <VoiceInput
              onTranscribed={handleVoiceTranscribed}
              onError={(err) => console.error('Voice error:', err)}
              disabled={!isWaiting}
            />

            <button
              type="submit"
              disabled={!isWaiting || !inputText.trim()}
              className={`
                shrink-0 w-11 h-11 rounded-full flex items-center justify-center
                transition-all duration-200
                ${
                  isWaiting && inputText.trim()
                    ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }
              `}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
