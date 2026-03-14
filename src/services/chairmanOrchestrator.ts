import type {
  Agent,
  ApiConfig,
  ChairmanInterviewResult,
  InterviewEvaluation,
  InterviewMessage,
  InterviewPhase,
  UserProfile,
} from '@/types'
import { chat } from './llm'
import { buildCompanyContextPrompt } from '@/config/prompts'
import { loadFromStorage } from '@/utils/storage'
import {
  buildChairmanEvaluationPrompt,
  buildChairmanFinalSummaryPrompt,
  buildChairmanModeratorDecisionPrompt,
  buildChairmanOpeningMessage,
  buildChairmanQuestionPrompt,
  buildChairmanSystemPrompt,
} from '@/config/chairmanPrompts'

let messageCounter = 0

function createInterviewMessage(
  type: InterviewMessage['type'],
  content: string,
  phase: InterviewPhase,
  agent?: Agent
): InterviewMessage {
  return {
    id: `ch_${Date.now()}_${messageCounter++}`,
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

function parseOfferDecision(content: string): boolean {
  if (content.includes('【决定：发放Offer】')) return true
  if (content.includes('【决定：不予录用】')) return false
  return content.includes('发放') && content.includes('Offer')
}

export interface ChairmanCallbacks {
  onMessage: (message: InterviewMessage) => void
  onStatusChange: (status: string) => void
  onCurrentSpeaker: (agentId: string | null) => void
  onFinished: (result: ChairmanInterviewResult) => void
  onError: (error: string) => void
}

export class ChairmanOrchestrator {
  private agents: Agent[] = []
  private userProfile!: UserProfile
  private apiConfig!: ApiConfig
  private previousResults = ''
  private companyContext = ''
  private messages: InterviewMessage[] = []
  private callbacks!: ChairmanCallbacks
  private lastInterviewerId: string | null = null
  private consecutiveCount = 0
  private stopped = false

  async startInterview(
    agents: Agent[],
    userProfile: UserProfile,
    apiConfig: ApiConfig,
    previousResults: string,
    callbacks: ChairmanCallbacks
  ): Promise<void> {
    this.agents = agents
    this.userProfile = userProfile
    this.apiConfig = apiConfig
    this.previousResults = previousResults
    this.callbacks = callbacks
    this.messages = []
    this.lastInterviewerId = null
    this.consecutiveCount = 0
    this.stopped = false

    try {
      callbacks.onStatusChange('opening')
      this.companyContext = await this.generateCompanyContext()

      const vp = agents.find((a) => a.role === 'vp') ?? agents[0]
      callbacks.onCurrentSpeaker(vp.id)

      const systemPrompt = buildChairmanSystemPrompt(
        vp,
        userProfile.companyName,
        userProfile.companyType,
        this.companyContext,
        previousResults
      )
      const userMsg = buildChairmanOpeningMessage(vp, agents, userProfile, previousResults)

      const openingContent = await chat(apiConfig, {
        systemPrompt,
        userMessage: userMsg,
        maxTokens: 512,
      })

      const openingMsg = createInterviewMessage(
        'interviewer_question',
        openingContent,
        'opening',
        vp
      )
      this.messages.push(openingMsg)
      callbacks.onMessage(openingMsg)
      this.lastInterviewerId = vp.id
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

      if (nextAgent.id === this.lastInterviewerId) {
        this.consecutiveCount++
      } else {
        this.consecutiveCount = 1
      }
      this.lastInterviewerId = nextAgent.id

      const isContinuation = decision.type === 'continue'

      this.callbacks.onStatusChange('questioning')
      this.callbacks.onCurrentSpeaker(nextAgent.id)

      const systemPrompt = buildChairmanSystemPrompt(
        nextAgent,
        this.userProfile.companyName,
        this.userProfile.companyType,
        this.companyContext,
        this.previousResults
      )

      const questionUserMsg = buildChairmanQuestionPrompt(
        nextAgent,
        this.messages,
        decision.topic ?? '自由交流',
        isContinuation
      )

      const questionContent = await chat(this.apiConfig, {
        systemPrompt,
        userMessage: questionUserMsg,
        maxTokens: 512,
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
      maxTokens: 600,
    })
  }

  private async moderatorDecide(): Promise<{
    type: 'continue' | 'next' | 'end'
    agentId?: string
    topic?: string
  }> {
    const prompt = buildChairmanModeratorDecisionPrompt(
      this.agents,
      this.messages,
      this.previousResults,
      this.lastInterviewerId
    )

    const content = await chat(this.apiConfig, {
      systemPrompt:
        '你是一场终面（高管面试）的隐藏主持人。你的任务是根据面试进展决定下一步安排。严格按照要求的格式回复。',
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

      const systemPrompt = buildChairmanSystemPrompt(
        agent,
        this.userProfile.companyName,
        this.userProfile.companyType,
        this.companyContext,
        this.previousResults
      )

      const evalUserMsg = buildChairmanEvaluationPrompt(
        agent,
        this.messages,
        this.userProfile,
        this.previousResults
      )

      const evalContent = await chat(this.apiConfig, {
        systemPrompt,
        userMessage: evalUserMsg,
        maxTokens: 800,
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

    const chairman = this.agents.find((a) => a.role === 'chairman') ?? this.agents[0]
    this.callbacks.onCurrentSpeaker(chairman.id)

    const summarySystemPrompt = buildChairmanSystemPrompt(
      chairman,
      this.userProfile.companyName,
      this.userProfile.companyType,
      this.companyContext,
      this.previousResults
    )

    const summaryUserMsg = buildChairmanFinalSummaryPrompt(
      chairman,
      evaluations,
      this.messages,
      this.previousResults
    )

    const summaryContent = await chat(this.apiConfig, {
      systemPrompt: summarySystemPrompt,
      userMessage: summaryUserMsg,
      maxTokens: 1024,
    })

    const summaryMsg = createInterviewMessage(
      'system_notice',
      summaryContent,
      'evaluating',
      chairman
    )
    this.messages.push(summaryMsg)
    this.callbacks.onMessage(summaryMsg)

    const offerGranted = parseOfferDecision(summaryContent)

    this.callbacks.onCurrentSpeaker(null)
    this.callbacks.onStatusChange('finished')

    this.callbacks.onFinished({
      offerGranted,
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
