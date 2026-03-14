import type {
  Agent,
  ApiConfig,
  InterviewEvaluation,
  InterviewMessage,
  InterviewPhase,
  UserProfile,
} from '@/types'
import { chat } from './llm'
import { buildCompanyContextPrompt } from '@/config/prompts'
import { loadFromStorage } from '@/utils/storage'
import {
  buildEvaluationPrompt,
  buildFinalSummaryPrompt,
  buildInterviewQuestionPrompt,
  buildInterviewSystemPrompt,
  buildModeratorDecisionPrompt,
  buildOpeningMessage,
} from '@/config/interviewPrompts'

let messageCounter = 0

function createInterviewMessage(
  type: InterviewMessage['type'],
  content: string,
  phase: InterviewPhase,
  agent?: Agent
): InterviewMessage {
  return {
    id: `iv_${Date.now()}_${messageCounter++}`,
    type,
    agentId: agent?.id,
    agentName: agent?.name,
    agentRole: agent?.roleLabel,
    agentPersonality: agent?.personalityLabel,
    personalityType: agent?.personality,
    agentAvatar: agent?.avatar,
    content,
    phase,
    timestamp: Date.now(),
  }
}

function parseModeratorDecision(
  content: string,
  agents: Agent[]
): {
  type: 'continue' | 'next' | 'end'
  agentId?: string
  topic?: string
} {
  if (content.includes('【面试结束】')) {
    return { type: 'end' }
  }

  const continueMatch = content.match(/【继续[：:](.+?)】/)
  const nextMatch = content.match(/【下一位[：:](.+?)】/)
  const topicMatch = content.match(/【话题[：:](.+?)】/)
  const topic = topicMatch?.[1]?.trim()

  const targetName = (continueMatch?.[1] ?? nextMatch?.[1])?.trim()
  if (!targetName) {
    return { type: 'end' }
  }

  const agent = agents.find((a) => a.name.includes(targetName))
  if (!agent) {
    const fallback = agents[Math.floor(Math.random() * agents.length)]
    return {
      type: continueMatch ? 'continue' : 'next',
      agentId: fallback.id,
      topic,
    }
  }

  return {
    type: continueMatch ? 'continue' : 'next',
    agentId: agent.id,
    topic,
  }
}

function parsePassed(content: string): boolean {
  if (content.includes('【决定：通过】')) return true
  if (content.includes('【决定：不通过】')) return false
  return content.includes('通过') && !content.includes('不通过')
}

export interface InterviewCallbacks {
  onMessage: (message: InterviewMessage) => void
  onStatusChange: (status: string) => void
  onCurrentSpeaker: (agentId: string | null) => void
  onFinished: (result: {
    passed: boolean
    evaluations: InterviewEvaluation[]
    finalSummary: string
    messages: InterviewMessage[]
    agents: Agent[]
    userProfile: UserProfile
  }) => void
  onError: (error: string) => void
}

export class InterviewOrchestrator {
  private agents: Agent[] = []
  private userProfile!: UserProfile
  private apiConfig!: ApiConfig
  private gmSummary = ''
  private companyContext = ''
  private messages: InterviewMessage[] = []
  private callbacks!: InterviewCallbacks
  private lastInterviewerId: string | null = null
  private consecutiveCount = 0
  private stopped = false

  async startInterview(
    agents: Agent[],
    userProfile: UserProfile,
    apiConfig: ApiConfig,
    gmSummary: string,
    callbacks: InterviewCallbacks
  ): Promise<void> {
    this.agents = agents
    this.userProfile = userProfile
    this.apiConfig = apiConfig
    this.gmSummary = gmSummary
    this.callbacks = callbacks
    this.messages = []
    this.lastInterviewerId = null
    this.consecutiveCount = 0
    this.stopped = false

    try {
      callbacks.onStatusChange('opening')
      this.companyContext = await this.generateCompanyContext()

      const hr = agents.find((a) => a.role === 'hr') ?? agents[0]
      callbacks.onCurrentSpeaker(hr.id)

      const systemPrompt = buildInterviewSystemPrompt(
        hr,
        userProfile.companyName,
        userProfile.companyType,
        this.companyContext,
        gmSummary
      )
      const userMsg = buildOpeningMessage(hr, agents, userProfile, gmSummary)

      const openingContent = await chat(apiConfig, {
        systemPrompt,
        userMessage: userMsg,
        maxTokens: 300,
      })

      const openingMsg = createInterviewMessage(
        'interviewer_question',
        openingContent,
        'opening',
        hr
      )
      this.messages.push(openingMsg)
      callbacks.onMessage(openingMsg)
      this.lastInterviewerId = hr.id
      this.consecutiveCount = 1

      callbacks.onCurrentSpeaker(null)
      callbacks.onStatusChange('waiting_for_user')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      callbacks.onError(msg)
    }
  }

  async submitUserAnswer(answer: string): Promise<void> {
    if (this.stopped) return

    try {
      const userMsg = createInterviewMessage(
        'user_answer',
        answer,
        'questioning'
      )
      this.messages.push(userMsg)
      this.callbacks.onMessage(userMsg)

      this.callbacks.onStatusChange('moderator_deciding')

      const decision = await this.moderatorDecide()

      if (decision.type === 'end') {
        await this.doEvaluation()
        return
      }

      const nextAgent = this.agents.find((a) => a.id === decision.agentId)
      if (!nextAgent) {
        await this.doEvaluation()
        return
      }

      const isContinuation = decision.type === 'continue'

      if (nextAgent.id === this.lastInterviewerId) {
        this.consecutiveCount++
      } else {
        this.consecutiveCount = 1
      }
      this.lastInterviewerId = nextAgent.id

      this.callbacks.onStatusChange('questioning')
      this.callbacks.onCurrentSpeaker(nextAgent.id)

      const systemPrompt = buildInterviewSystemPrompt(
        nextAgent,
        this.userProfile.companyName,
        this.userProfile.companyType,
        this.companyContext,
        this.gmSummary
      )

      const questionUserMsg = buildInterviewQuestionPrompt(
        nextAgent,
        this.messages,
        decision.topic ?? '自由提问',
        isContinuation
      )

      const questionContent = await chat(this.apiConfig, {
        systemPrompt,
        userMessage: questionUserMsg,
        maxTokens: 300,
      })

      const questionMsg = createInterviewMessage(
        'interviewer_question',
        questionContent,
        'questioning',
        nextAgent
      )
      this.messages.push(questionMsg)
      this.callbacks.onMessage(questionMsg)
      this.callbacks.onCurrentSpeaker(null)
      this.callbacks.onStatusChange('waiting_for_user')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      this.callbacks.onError(msg)
    }
  }

  async endInterview(): Promise<void> {
    this.stopped = true
    await this.doEvaluation()
  }

  private async generateCompanyContext(): Promise<string> {
    const cached = loadFromStorage<string>('companyContext')
    if (cached) return cached

    const { systemPrompt, userMessage } = buildCompanyContextPrompt(
      this.userProfile.companyName,
      this.userProfile.companyType
    )
    return await chat(this.apiConfig, {
      systemPrompt,
      userMessage,
      maxTokens: 400,
    })
  }

  private async moderatorDecide(): Promise<{
    type: 'continue' | 'next' | 'end'
    agentId?: string
    topic?: string
  }> {
    const prompt = buildModeratorDecisionPrompt(
      this.agents,
      this.messages,
      this.gmSummary,
      this.lastInterviewerId
    )

    const content = await chat(this.apiConfig, {
      systemPrompt:
        '你是一个面试主持人。你的任务是根据面试进展决定下一步安排。严格按照要求的格式回复。',
      userMessage: prompt,
      maxTokens: 200,
    })

    return parseModeratorDecision(content, this.agents)
  }

  private async doEvaluation(): Promise<void> {
    this.callbacks.onStatusChange('evaluating')

    const evaluations: InterviewEvaluation[] = []

    for (const agent of this.agents) {
      this.callbacks.onCurrentSpeaker(agent.id)

      const systemPrompt = buildInterviewSystemPrompt(
        agent,
        this.userProfile.companyName,
        this.userProfile.companyType,
        this.companyContext,
        this.gmSummary
      )

      const evalUserMsg = buildEvaluationPrompt(
        agent,
        this.messages,
        this.userProfile
      )

      const evalContent = await chat(this.apiConfig, {
        systemPrompt,
        userMessage: evalUserMsg,
        maxTokens: 300,
      })

      evaluations.push({
        agentId: agent.id,
        agentName: agent.name,
        agentRole: agent.roleLabel,
        content: evalContent,
      })

      const evalMsg = createInterviewMessage(
        'system_notice',
        evalContent,
        'evaluating',
        agent
      )
      this.messages.push(evalMsg)
      this.callbacks.onMessage(evalMsg)
    }

    const summaryAgent = this.agents.find((a) => a.role === 'dept_head') ?? this.agents[0]
    this.callbacks.onCurrentSpeaker(summaryAgent.id)

    const summarySystemPrompt = buildInterviewSystemPrompt(
      summaryAgent,
      this.userProfile.companyName,
      this.userProfile.companyType,
      this.companyContext,
      this.gmSummary
    )

    const summaryUserMsg = buildFinalSummaryPrompt(
      summaryAgent,
      evaluations,
      this.messages
    )

    const summaryContent = await chat(this.apiConfig, {
      systemPrompt: summarySystemPrompt,
      userMessage: summaryUserMsg,
      maxTokens: 500,
    })

    const summaryMsg = createInterviewMessage(
      'system_notice',
      summaryContent,
      'evaluating',
      summaryAgent
    )
    this.messages.push(summaryMsg)
    this.callbacks.onMessage(summaryMsg)

    const passed = parsePassed(summaryContent)

    this.callbacks.onCurrentSpeaker(null)
    this.callbacks.onStatusChange('finished')

    this.callbacks.onFinished({
      passed,
      evaluations,
      finalSummary: summaryContent,
      messages: [...this.messages],
      agents: [...this.agents],
      userProfile: { ...this.userProfile },
    })
  }

  getMessages(): InterviewMessage[] {
    return [...this.messages]
  }
}
