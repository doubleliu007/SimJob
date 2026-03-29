import type {
  Agent,
  ApiConfig,
  ChatMessage,
  DiscussionPhase,
  UserProfile,
} from '@/types'
import { chat } from './llm'
import { getGeneralManagers, getRandomModerator, getSeniorHR } from './agentGenerator'
import {
  buildCompanyContextPrompt,
  buildFirstRoundUserMessage,
  buildFreeDiscussionUserMessage,
  buildHRSuggestionUserMessage,
  buildJobDescriptionPrompt,
  buildModeratorPickMessage,
  buildSummaryUserMessage,
  buildSystemPrompt,
} from '@/config/prompts'
import { saveToStorage } from '@/utils/storage'
import { ROLE_CONFIGS } from '@/config/roles'

let messageCounter = 0

function createMessage(
  agent: Agent,
  content: string,
  phase: DiscussionPhase,
  nextSpeakerId?: string
): ChatMessage {
  return {
    id: `msg_${Date.now()}_${messageCounter++}`,
    agentId: agent.id,
    agentName: agent.name,
    agentRole: agent.roleLabel,
    agentPersonality: agent.personalityLabel,
    personalityType: agent.personality,
    agentAvatar: agent.avatar,
    content,
    nextSpeakerId,
    phase,
    timestamp: Date.now(),
  }
}

function parseNextSpeakerFromModerator(
  content: string,
  agents: Agent[],
  moderatorId: string
): { nextId: string | null; topic: string | undefined } {
  const nameMatch = content.match(/【下一位[：:](.+?)】/)
  if (!nameMatch) return { nextId: null, topic: undefined }

  const name = nameMatch[1].trim()
  const found = agents.find(
    (a) => a.id !== moderatorId && a.name.includes(name)
  )

  const topicMatch = content.match(/【话题[：:](.+?)】/)
  const topic = topicMatch?.[1]?.trim()

  return { nextId: found?.id ?? null, topic }
}

function checkMeetingEnd(content: string): boolean {
  return content.includes('【会议结束】')
}

function parsePassed(content: string): boolean {
  if (content.includes('【决定：通过】')) return true
  if (content.includes('【决定：不通过】')) return false
  return content.includes('通过') && !content.includes('不通过')
}

function getFirstRoundOrder(agents: Agent[]): Agent[] {
  const priorityMap = new Map(ROLE_CONFIGS.map((r) => [r.type, r.priority]))
  return [...agents].sort(
    (a, b) => (priorityMap.get(a.role) ?? 99) - (priorityMap.get(b.role) ?? 99)
  )
}

export interface OrchestratorCallbacks {
  onAgentSpeaking: (agent: Agent) => void
  onMessage: (message: ChatMessage) => void
  onPhaseChange: (phase: DiscussionPhase) => void
  onModeratorSelected: (agent: Agent) => void
  onCompanyContext?: (companyContext: string) => void
  onFinished: (passed: boolean, summary: string, suggestions: string) => void
  onError: (error: string) => void
  shouldStop: () => boolean
}

export async function runDiscussion(
  agents: Agent[],
  originalUserProfile: UserProfile,
  apiConfig: ApiConfig,
  callbacks: OrchestratorCallbacks
): Promise<void> {
  const allMessages: ChatMessage[] = []
  let companyContext = ''
  let userProfile = originalUserProfile

  async function generateCompanyContext(): Promise<string> {
    const { systemPrompt, userMessage } = buildCompanyContextPrompt(
      userProfile.companyName,
      userProfile.companyType
    )
    const context = await chat(apiConfig, {
      systemPrompt,
      userMessage,
      maxTokens: 600,
    })
    return context
  }

  async function agentSpeak(
    agent: Agent,
    userMessage: string,
    phase: DiscussionPhase,
    maxTokens?: number
  ): Promise<ChatMessage> {
    callbacks.onAgentSpeaking(agent)

    const systemPrompt = buildSystemPrompt(
      agent,
      userProfile.companyName,
      userProfile.companyType,
      companyContext
    )
    const content = await chat(apiConfig, {
      systemPrompt,
      userMessage,
      maxTokens,
    })

    const msg = createMessage(agent, content, phase)
    allMessages.push(msg)
    callbacks.onMessage(msg)
    return msg
  }

  async function moderatorPick(
    moderator: Agent,
    lastSpeaker: Agent
  ): Promise<{ nextId: string | null; shouldEnd: boolean; topic?: string }> {
    const systemPrompt = buildSystemPrompt(
      moderator,
      userProfile.companyName,
      userProfile.companyType,
      companyContext
    )
    const userMessage = buildModeratorPickMessage(
      moderator,
      agents,
      allMessages,
      lastSpeaker
    )

    const content = await chat(apiConfig, {
      systemPrompt,
      userMessage,
    })

    if (checkMeetingEnd(content)) {
      return { nextId: null, shouldEnd: true }
    }

    const { nextId, topic } = parseNextSpeakerFromModerator(content, agents, moderator.id)
    return { nextId, shouldEnd: false, topic }
  }

  try {
    // === Phase 0: Generate Company Context & Job Description ===
    companyContext = await generateCompanyContext()
    callbacks.onCompanyContext?.(companyContext)

    if (!userProfile.jobDescription) {
      const { systemPrompt: jdSys, userMessage: jdMsg } = buildJobDescriptionPrompt(
        userProfile.targetPosition,
        userProfile.companyName,
        userProfile.companyType
      )
      const generatedJD = await chat(apiConfig, {
        systemPrompt: jdSys,
        userMessage: jdMsg,
        maxTokens: 300,
      })
      userProfile = { ...userProfile, jobDescription: generatedJD }
      saveToStorage('jobDescription', generatedJD)
    }

    // === Phase 1: First Round ===
    callbacks.onPhaseChange('first_round')
    const ordered = getFirstRoundOrder(agents)

    for (const agent of ordered) {
      if (callbacks.shouldStop()) break
      try {
        const userMsg = buildFirstRoundUserMessage(agent, userProfile, agents, allMessages)
        await agentSpeak(agent, userMsg, 'first_round', 1024)
      } catch (err: unknown) {
        console.warn(`[orchestrator] ${agent.name} 首轮发言失败，已跳过:`, err)
        const skipMsg = createMessage(
          agent,
          `（${agent.name} 的发言生成失败，已自动跳过）`,
          'first_round'
        )
        allMessages.push(skipMsg)
        callbacks.onMessage(skipMsg)
      }
    }

    if (callbacks.shouldStop()) {
      await doSummaryAndSuggestions()
      return
    }

    // === Phase 2: Free Discussion (GM moderates) ===
    callbacks.onPhaseChange('free_discussion')
    const moderator = getRandomModerator(agents)
    callbacks.onModeratorSelected(moderator)

    let lastSpeaker = ordered[ordered.length - 1]
    const maxRounds = 20
    const spokenInRound = new Set<string>()

    let consecutiveErrors = 0
    const maxConsecutiveErrors = 3

    for (let round = 0; round < maxRounds; round++) {
      if (callbacks.shouldStop()) break
      if (consecutiveErrors >= maxConsecutiveErrors) break

      try {
        const { nextId, shouldEnd, topic } = await moderatorPick(moderator, lastSpeaker)

        if (shouldEnd) break

        let nextAgent: Agent | undefined
        if (nextId) {
          nextAgent = agents.find((a) => a.id === nextId)
        }

        if (!nextAgent) {
          const candidates = agents.filter(
            (a) => a.id !== moderator.id && a.id !== lastSpeaker.id && !spokenInRound.has(a.id)
          )
          if (candidates.length === 0) {
            spokenInRound.clear()
            const fallback = agents.filter(
              (a) => a.id !== moderator.id && a.id !== lastSpeaker.id
            )
            nextAgent = fallback[Math.floor(Math.random() * fallback.length)]
          } else {
            nextAgent = candidates[Math.floor(Math.random() * candidates.length)]
          }
        }

        if (!nextAgent) break

        spokenInRound.add(nextAgent.id)

        const userMsg = buildFreeDiscussionUserMessage(
          nextAgent,
          agents,
          allMessages,
          topic
        )
        await agentSpeak(nextAgent, userMsg, 'free_discussion', 1024)
        lastSpeaker = nextAgent
        consecutiveErrors = 0
      } catch (err: unknown) {
        consecutiveErrors++
        console.warn(`[orchestrator] 自由讨论第 ${round + 1} 轮失败 (${consecutiveErrors}/${maxConsecutiveErrors}):`, err)
      }
    }

    await doSummaryAndSuggestions()
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    callbacks.onError(errorMsg)
  }

  async function doSummaryAndSuggestions() {
    let summaryContent = ''
    let passed = false
    let hrContent = ''

    // === Phase 3: GM Summary ===
    callbacks.onPhaseChange('summary')
    const gms = getGeneralManagers(agents)
    const summaryGM = gms[0]
    try {
      const summaryMsg = buildSummaryUserMessage(summaryGM, allMessages)
      const summaryResult = await agentSpeak(summaryGM, summaryMsg, 'summary', 2048)
      summaryContent = summaryResult.content
      passed = parsePassed(summaryContent)
    } catch (err: unknown) {
      console.warn('[orchestrator] 总结阶段失败:', err)
      summaryContent = '（总结生成失败，无法给出最终判断）'
      const fallbackMsg = createMessage(summaryGM, summaryContent, 'summary')
      allMessages.push(fallbackMsg)
      callbacks.onMessage(fallbackMsg)
    }

    // === Phase 4: Senior HR Suggestions ===
    callbacks.onPhaseChange('suggestion')
    const seniorHR = getSeniorHR(agents) ?? agents.find((a) => a.role === 'hr')!
    try {
      const hrMsg = buildHRSuggestionUserMessage(seniorHR, userProfile, allMessages)
      const hrResult = await agentSpeak(seniorHR, hrMsg, 'suggestion', 2048)
      hrContent = hrResult.content
    } catch (err: unknown) {
      console.warn('[orchestrator] HR 建议阶段失败:', err)
      hrContent = '（HR 建议生成失败）'
      const fallbackMsg = createMessage(seniorHR, hrContent, 'suggestion')
      allMessages.push(fallbackMsg)
      callbacks.onMessage(fallbackMsg)
    }

    callbacks.onFinished(passed, summaryContent, hrContent)
  }
}
