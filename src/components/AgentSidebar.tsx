import type { Agent } from '@/types'
import { PERSONALITY_MAP } from '@/config/personalities'

interface Props {
  agents: Agent[]
  currentSpeakerId: string | null
  moderatorId: string | null
}

export default function AgentSidebar({
  agents,
  currentSpeakerId,
  moderatorId,
}: Props) {
  return (
    <div className="w-64 shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
        参会人员
      </h3>
      <div className="space-y-2">
        {agents.map((agent) => {
          const pConfig = PERSONALITY_MAP.get(agent.personality)
          const isSpeaking = agent.id === currentSpeakerId
          const isMod = agent.id === moderatorId

          return (
            <div
              key={agent.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                isSpeaking
                  ? 'bg-blue-50 border border-blue-200 shadow-sm'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="relative">
                <span className="text-2xl">{agent.avatar}</span>
                {isSpeaking && (
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-slate-800 truncate">
                    {agent.name}
                  </span>
                  {isMod && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                      主持
                    </span>
                  )}
                  {agent.isSeniorHR && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                      资深
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-slate-400">
                    {agent.roleLabel}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: pConfig
                        ? pConfig.color + '18'
                        : '#f1f5f9',
                      color: pConfig?.color ?? '#64748b',
                    }}
                  >
                    {agent.personalityLabel}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
