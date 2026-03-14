import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { generateAgents } from '@/services/agentGenerator'
import { runDiscussion } from '@/services/orchestrator'
import type { Agent, ChatMessage, DiscussionPhase } from '@/types'
import AgentSidebar from '@/components/AgentSidebar'
import DiscussionPanel from '@/components/DiscussionPanel'
import { downloadText, formatDiscussionText } from '@/utils/exportDiscussion'
import { saveToStorage } from '@/utils/storage'

function MobileAgentToggle({ onClick, agentCount }: { onClick: () => void; agentCount: number }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed left-3 bottom-20 z-30 w-11 h-11 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
      aria-label="查看参会人员"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {agentCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {agentCount}
        </span>
      )}
    </button>
  )
}

export default function ResumeScreeningPage() {
  const navigate = useNavigate()
  const {
    apiConfig,
    userProfile,
    agents,
    messages,
    discussionStatus,
    moderatorId,
    currentSpeakerId,
    setAgents,
    addMessage,
    setDiscussionStatus,
    setDiscussionResult,
    setModeratorId,
    setCurrentSpeakerId,
    setError,
    resetDiscussion,
  } = useStore()

  const [speakingAgent, setSpeakingAgent] = useState<Agent | null>(null)
  const [result, setResult] = useState<{
    passed: boolean
    summary: string
    suggestions: string
  } | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const stopRef = useRef(false)
  const runningRef = useRef(false)

  const isConfigured =
    apiConfig.apiKey && apiConfig.baseUrl && userProfile.resume

  const startDiscussion = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true
    stopRef.current = false
    setResult(null)
    setErrorDetail(null)

    resetDiscussion()
    setDiscussionStatus('generating_agents')

    const newAgents = generateAgents()
    setAgents(newAgents)

    setDiscussionStatus('first_round')

    try {
      await runDiscussion(newAgents, userProfile, apiConfig, {
        onAgentSpeaking: (agent: Agent) => {
          setSpeakingAgent(agent)
          setCurrentSpeakerId(agent.id)
        },
        onMessage: (message: ChatMessage) => {
          setSpeakingAgent(null)
          addMessage(message)
        },
        onPhaseChange: (phase: DiscussionPhase) => {
          const statusMap: Record<string, typeof discussionStatus> = {
            first_round: 'first_round',
            free_discussion: 'free_discussion',
            summary: 'summarizing',
            suggestion: 'suggesting',
          }
          setDiscussionStatus(statusMap[phase] ?? 'free_discussion')
        },
        onCompanyContext: (companyContext: string) => {
          saveToStorage('companyContext', companyContext)
        },
        onModeratorSelected: (agent: Agent) => {
          setModeratorId(agent.id)
        },
        onFinished: (passed: boolean, summary: string, suggestions: string) => {
          setDiscussionStatus('finished')
          setCurrentSpeakerId(null)
          setSpeakingAgent(null)
          setResult({ passed, summary, suggestions })

          setDiscussionResult({
            passed,
            summary,
            suggestions,
            messages: useStore.getState().messages,
            agents: useStore.getState().agents,
            userProfile,
          })
        },
        onError: (error: string) => {
          setError(error)
          setErrorDetail(error)
          setDiscussionStatus('error')
          setSpeakingAgent(null)
        },
        shouldStop: () => stopRef.current,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setErrorDetail(msg)
      setDiscussionStatus('error')
    } finally {
      runningRef.current = false
    }
  }, [
    apiConfig,
    userProfile,
    resetDiscussion,
    setAgents,
    setDiscussionStatus,
    setCurrentSpeakerId,
    addMessage,
    setModeratorId,
    setDiscussionResult,
    setError,
  ])

  function handleStop() {
    stopRef.current = true
  }

  function handleExport() {
    const storeState = useStore.getState()
    const text = formatDiscussionText(
      storeState.messages,
      storeState.agents,
      userProfile.companyType,
      userProfile.companyName
    )
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadText(text, `SimJob_会议记录_${timestamp}.txt`)
  }

  useEffect(() => {
    if (!isConfigured) return
    if (discussionStatus === 'idle' && !runningRef.current) {
      startDiscussion()
    }
  }, [])

  if (!isConfigured) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6">📋</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          请先完成面试准备
        </h2>
        <p className="text-slate-500 mb-6">
          需要填写简历、自我介绍并配置 API 后才能开始
        </p>
        <button
          onClick={() => navigate('/setup')}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          前往设置
        </button>
      </div>
    )
  }

  const isRunning =
    discussionStatus !== 'idle' &&
    discussionStatus !== 'finished' &&
    discussionStatus !== 'error'

  return (
    <div className="flex h-full overflow-hidden">
      {errorDetail && discussionStatus === 'error' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
              <h3 className="text-red-700 font-semibold">错误详情</h3>
              <button
                onClick={() => setErrorDetail(null)}
                className="text-red-400 hover:text-red-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="px-6 py-4 max-h-80 overflow-y-auto">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap break-words font-mono bg-slate-50 rounded-lg p-4">
                {errorDetail}
              </pre>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(errorDetail)
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                复制错误信息
              </button>
              <button
                onClick={() => setErrorDetail(null)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <AgentSidebar
        agents={agents}
        currentSpeakerId={currentSpeakerId}
        moderatorId={moderatorId}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <MobileAgentToggle onClick={() => setSidebarOpen(true)} agentCount={agents.length} />

      <div className="flex-1 flex flex-col min-w-0">
        <DiscussionPanel
          messages={messages}
          status={discussionStatus}
          speakingAgent={speakingAgent}
        />

        {/* Bottom Actions */}
        <div className="shrink-0 px-3 py-3 md:px-6 md:py-4 bg-white border-t border-slate-200 pb-safe">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-500">
              {discussionStatus === 'finished' && result && (
                <span
                  className={`font-semibold ${
                    result.passed ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {result.passed
                    ? '🎉 恭喜！总经理决定通过你的简历'
                    : '😔 很遗憾，总经理决定不通过'}
                </span>
              )}
              {discussionStatus === 'error' && (
                <span className="text-red-600">
                  发生错误
                  {errorDetail && (
                    <button
                      onClick={() => setErrorDetail(prev => prev ? prev : null)}
                      className="ml-2 underline text-red-500 hover:text-red-700"
                    >
                      查看详情
                    </button>
                  )}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {isRunning && (
                <button
                  onClick={handleStop}
                  className="px-4 py-2 md:px-5 md:py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  结束讨论
                </button>
              )}
              {(discussionStatus === 'finished' ||
                discussionStatus === 'error') && (
                <button
                  onClick={startDiscussion}
                  className="px-4 py-2 md:px-5 md:py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  重新开始
                </button>
              )}
              {discussionStatus === 'finished' && (
                <>
                  {result?.passed && (
                    <button
                      onClick={() => navigate('/dept-interview')}
                      className="px-4 py-2 md:px-5 md:py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      进入部门面试
                    </button>
                  )}
                  <button
                    onClick={handleExport}
                    className="px-4 py-2 md:px-5 md:py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    导出记录
                  </button>
                  <button
                    onClick={() => navigate('/setup')}
                    className="px-4 py-2 md:px-5 md:py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    修改简历
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
