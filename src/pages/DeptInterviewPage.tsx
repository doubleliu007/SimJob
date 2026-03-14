import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { useInterviewStore } from '@/store/useInterviewStore'
import { generateInterviewAgents } from '@/services/agentGenerator'
import {
  InterviewOrchestrator,
  type InterviewCallbacks,
} from '@/services/interviewOrchestrator'
import type { Agent, InterviewMessage, InterviewResult, InterviewStatus } from '@/types'
import { chat } from '@/services/llm'
import AgentSidebar from '@/components/AgentSidebar'
import InterviewChatPanel from '@/components/InterviewChatPanel'

function MobileAgentToggle({ onClick, agentCount }: { onClick: () => void; agentCount: number }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed left-3 bottom-20 z-30 w-11 h-11 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
      aria-label="查看面试官"
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

export default function DeptInterviewPage() {
  const navigate = useNavigate()
  const { apiConfig, userProfile, discussionResult } = useStore()
  const {
    agents,
    messages,
    interviewStatus,
    interviewResult,
    currentSpeakerId,
    setAgents,
    addMessage,
    setInterviewStatus,
    setInterviewResult,
    setCurrentSpeakerId,
    setError,
    resetInterview,
  } = useInterviewStore()

  const [speakingAgent, setSpeakingAgent] = useState<Agent | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const orchestratorRef = useRef<InterviewOrchestrator | null>(null)
  const runningRef = useRef(false)

  const isConfigured =
    apiConfig.apiKey && apiConfig.baseUrl && userProfile.resume

  const hasGmResult = !!discussionResult

  const startInterview = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true
    setErrorDetail(null)

    resetInterview()
    setInterviewStatus('generating_agents')

    const newAgents = generateInterviewAgents()
    setAgents(newAgents)

    const orchestrator = new InterviewOrchestrator()
    orchestratorRef.current = orchestrator

    const gmSummary = discussionResult?.summary ?? '（无简历筛选记录）'

    const callbacks: InterviewCallbacks = {
      onMessage: (message: InterviewMessage) => {
        setSpeakingAgent(null)
        addMessage(message)
      },
      onStatusChange: (status: string) => {
        setInterviewStatus(status as InterviewStatus)
      },
      onCurrentSpeaker: (agentId: string | null) => {
        setCurrentSpeakerId(agentId)
        if (agentId) {
          const agent = newAgents.find((a) => a.id === agentId)
          setSpeakingAgent(agent ?? null)
        } else {
          setSpeakingAgent(null)
        }
      },
      onFinished: (result: InterviewResult) => {
        setInterviewResult(result)
        runningRef.current = false
      },
      onError: (err: string) => {
        setError(err)
        setErrorDetail(err)
        setInterviewStatus('error')
        setSpeakingAgent(null)
        runningRef.current = false
      },
    }

    await orchestrator.startInterview(
      newAgents,
      userProfile,
      apiConfig,
      gmSummary,
      callbacks
    )
  }, [
    apiConfig,
    userProfile,
    discussionResult,
    resetInterview,
    setAgents,
    setInterviewStatus,
    addMessage,
    setCurrentSpeakerId,
    setInterviewResult,
    setError,
  ])

  const handleSendAnswer = useCallback(
    async (answer: string) => {
      if (!orchestratorRef.current) return
      await orchestratorRef.current.submitUserAnswer(answer)
    },
    []
  )

  const handleEndInterview = useCallback(async () => {
    if (!orchestratorRef.current) return
    await orchestratorRef.current.endInterview()
  }, [])

  const handleGenerateAnswer = useCallback(async (): Promise<string> => {
    const interviewMessages = useInterviewStore.getState().messages
    const conversationText = interviewMessages
      .map((m) => {
        if (m.type === 'user_answer') return `[候选人]: ${m.content}`
        if (m.type === 'interviewer_question') return `[${m.agentName}(${m.agentRole})]: ${m.content}`
        return `[系统]: ${m.content}`
      })
      .join('\n')

    const lastQuestion = [...interviewMessages]
      .reverse()
      .find((m) => m.type === 'interviewer_question')

    const systemPrompt = `你是一位求职者的面试回答助手。你需要根据候选人的简历、自我介绍以及面试对话记录，为候选人生成一个针对最新问题的高质量回答。

要求：
- 以第一人称回答，语气自然专业，像真实面试中的口语表达
- 紧密结合简历中的真实经历和技能来回答
- 回答要有条理，重点突出，不要太长（150-300字为宜）
- 不要编造简历中没有的经历
- 直接输出回答内容，不要加任何前缀或说明`

    const userMessage = `## 我的简历
${userProfile.resume}

## 我的自我介绍
${userProfile.selfIntroduction}

## 应聘岗位
${userProfile.targetPosition || '未指定'}

## 面试对话记录
${conversationText}

## 当前需要回答的问题
${lastQuestion?.content ?? '（未找到问题）'}

请为我生成一个合适的回答。`

    return await chat(apiConfig, {
      systemPrompt,
      userMessage,
      maxTokens: 800,
    })
  }, [apiConfig, userProfile])

  useEffect(() => {
    if (!isConfigured || !hasGmResult) return
    if (interviewStatus === 'idle' && !runningRef.current) {
      startInterview()
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

  if (!hasGmResult) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6">📄</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          请先完成简历筛选
        </h2>
        <p className="text-slate-500 mb-6">
          部门面试需要基于第一轮简历筛选的结果进行
        </p>
        <button
          onClick={() => navigate('/screening')}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          前往简历筛选
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-56px)] md:h-[calc(100vh-64px)]">
      {errorDetail && interviewStatus === 'error' && (
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
                onClick={() => navigator.clipboard.writeText(errorDetail)}
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
        moderatorId={null}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <MobileAgentToggle onClick={() => setSidebarOpen(true)} agentCount={agents.length} />

      <div className="flex-1 flex flex-col min-w-0">
        <InterviewChatPanel
          messages={messages}
          status={interviewStatus}
          speakingAgent={speakingAgent}
          onSendAnswer={handleSendAnswer}
          onEndInterview={handleEndInterview}
          onGenerateAnswer={handleGenerateAnswer}
        />

        {interviewStatus === 'finished' && interviewResult && (
          <div className="px-3 py-3 md:px-6 md:py-4 bg-white border-t border-slate-200">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <span
                className={`text-sm font-semibold ${
                  interviewResult.passed ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {interviewResult.passed
                  ? '🎉 恭喜！面试通过'
                  : '😔 很遗憾，未能通过面试'}
              </span>
              <div className="flex flex-wrap gap-2 md:gap-3">
                <button
                  onClick={startInterview}
                  className="px-4 py-2 md:px-5 md:py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  重新面试
                </button>
                <button
                  onClick={() => navigate('/setup')}
                  className="px-4 py-2 md:px-5 md:py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  返回设置
                </button>
              </div>
            </div>
          </div>
        )}

        {interviewStatus === 'error' && (
          <div className="px-3 py-3 md:px-6 md:py-4 bg-white border-t border-slate-200">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <span className="text-sm text-red-600">
                发生错误
                {errorDetail && (
                  <button
                    onClick={() => setErrorDetail(errorDetail)}
                    className="ml-2 underline text-red-500 hover:text-red-700"
                  >
                    查看详情
                  </button>
                )}
              </span>
              <button
                onClick={startInterview}
                className="px-4 py-2 md:px-5 md:py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                重新开始
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
