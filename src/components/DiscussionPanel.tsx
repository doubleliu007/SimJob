import { useEffect, useRef } from 'react'
import type { Agent, ChatMessage as ChatMessageType, DiscussionStatus } from '@/types'
import ChatMessageBubble from './ChatMessage'

interface Props {
  messages: ChatMessageType[]
  status: DiscussionStatus
  speakingAgent: Agent | null
}

const STATUS_LABELS: Record<string, string> = {
  idle: '等待开始',
  generating_agents: '正在生成参会人员...',
  first_round: '第一轮发言中',
  free_discussion: '自由讨论中',
  summarizing: '总经理正在总结...',
  suggesting: '资深HR正在撰写建议...',
  finished: '讨论结束',
  error: '出现错误',
}

export default function DiscussionPanel({
  messages,
  status,
  speakingAgent,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white/60 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {status !== 'idle' && status !== 'finished' && status !== 'error' && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
          )}
          <span className="text-sm font-medium text-slate-600">
            {STATUS_LABELS[status] ?? status}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {messages.length} 条发言
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && status === 'idle' && (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            讨论尚未开始
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}

        {speakingAgent && status !== 'finished' && (
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
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
