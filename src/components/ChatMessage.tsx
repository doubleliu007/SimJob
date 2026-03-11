import type { ChatMessage as ChatMessageType } from '@/types'
import { PERSONALITY_MAP } from '@/config/personalities'

interface Props {
  message: ChatMessageType
}

const PHASE_LABELS: Record<string, string> = {
  first_round: '第一轮发言',
  free_discussion: '自由讨论',
  summary: '总结',
  suggestion: '优化建议',
}

export default function ChatMessageBubble({ message }: Props) {
  const pConfig = PERSONALITY_MAP.get(message.personalityType)
  const isSpecial = message.phase === 'summary' || message.phase === 'suggestion'

  return (
    <div className={`flex gap-3 ${isSpecial ? 'my-4' : 'my-3'}`}>
      <div className="shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl">
        {message.agentAvatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-semibold text-slate-800">
            {message.agentName}
          </span>
          <span className="text-xs text-slate-400">{message.agentRole}</span>
          <span
            className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: pConfig ? pConfig.color + '18' : '#f1f5f9',
              color: pConfig?.color ?? '#64748b',
            }}
          >
            {message.agentPersonality}
          </span>
          <span className="text-[11px] text-slate-300">
            {PHASE_LABELS[message.phase]}
          </span>
        </div>
        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed ${
            isSpecial
              ? message.phase === 'summary'
                ? 'bg-amber-50 border border-amber-200 text-slate-800'
                : 'bg-purple-50 border border-purple-200 text-slate-800'
              : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </div>
  )
}
