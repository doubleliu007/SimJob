import type { Agent, InterviewMessage, UserProfile } from '@/types'
import { PERSONALITY_MAP } from './personalities'

function getPersonalityDesc(agent: Agent): string {
  return PERSONALITY_MAP.get(agent.personality)?.description ?? ''
}

function formatInterviewHistory(messages: InterviewMessage[]): string {
  if (messages.length === 0) return '（暂无对话记录）'
  return messages
    .filter((m) => m.type !== 'system_notice')
    .map((m) => {
      if (m.type === 'user_answer') {
        return `面试者：${m.content}`
      }
      return `${m.agentName}（${m.agentRole}）：${m.content}`
    })
    .join('\n\n')
}

function interviewerRoster(agents: Agent[]): string {
  return agents.map((a) => `${a.name}（${a.roleLabel}）`).join('、')
}

export function buildInterviewSystemPrompt(
  agent: Agent,
  companyName: string,
  companyType: string,
  companyContext: string,
  gmSummary: string
): string {
  const personalityDesc = getPersonalityDesc(agent)
  return `你是${agent.name}，${companyName}的${agent.roleLabel}。你的性格就是这样的：${personalityDesc}

关于你所在的公司：${companyContext}

你正在公司会议室里对一位候选人进行部门面试。在此之前，公司已经进行了简历筛选，总经理的结论是：
${gmSummary}

你的任务是通过提问来深入了解候选人的真实能力。提问要结合公司实际情况（业务方向、团队需求、企业文化），具体、有针对性，不要泛泛而谈。根据候选人的回答灵活追问，挖掘细节。
说话专业且自然，别太书面化。保持你的性格特点，说中文。每次只问一个问题，简洁明了，不超过3句话。`
}

export function buildOpeningMessage(
  agent: Agent,
  agents: Agent[],
  userProfile: UserProfile,
  gmSummary: string
): string {
  return `面试开始了。你是这场面试的HR负责人。在场的面试官有：${interviewerRoster(agents)}。

候选人应聘的是${userProfile.companyName}（${userProfile.companyType}行业）${userProfile.targetPosition ? `的「${userProfile.targetPosition}」岗位` : ''}。

之前简历筛选的总经理结论：
${gmSummary}

请用1-2句话简短开场，介绍一下面试安排（不需要点名各位面试官的具体名字），然后自然地引出第一个问题。语气自然友好，让候选人放松。直接说，不要加任何格式标记。`
}

export function buildModeratorDecisionPrompt(
  agents: Agent[],
  messages: InterviewMessage[],
  gmSummary: string,
  lastInterviewerId: string | null
): string {
  const history = formatInterviewHistory(messages)
  const roster = interviewerRoster(agents)

  const lastAgent = lastInterviewerId
    ? agents.find((a) => a.id === lastInterviewerId)
    : null

  const questionCount = messages.filter((m) => m.type === 'interviewer_question').length
  const lastUserAnswer = [...messages].reverse().find((m) => m.type === 'user_answer')

  return `你是一场部门面试的隐藏主持人。你需要决定下一步由谁提问以及提什么方向的问题。

在场面试官：${roster}

简历筛选阶段的总经理结论：
${gmSummary}

目前的面试对话记录：
${history}

已提问数量：${questionCount}

${lastAgent ? `上一个提问的面试官是：${lastAgent.name}（${lastAgent.roleLabel}）` : ''}
${lastUserAnswer ? `候选人最新回答：${lastUserAnswer.content}` : ''}

你的决策规则：
1. 如果候选人的回答暴露了值得深挖的点（含糊、矛盾、或有亮点），让同一面试官继续追问
2. 如果当前话题已经聊够了、开始重复、或挖得太深导致偏题，换一个面试官从新角度提问
3. 要确保各面试官都有机会提问，不要让某个人独占太久（连续提问不超过3次）
4. 要覆盖多个维度：技术能力、项目经验、团队协作、业务理解、职业规划、抗压能力等
5. 如果各维度都已覆盖充分（通常需要至少6-8轮提问），可以结束面试

回复格式（只输出以下格式之一，不要说别的）：

如果让同一面试官继续：
【继续：面试官姓名】
【话题：你想让他/她追问的具体方向】

如果换一个面试官：
【下一位：面试官姓名】
【话题：你想让他/她问的具体方向】

如果面试该结束了：
【面试结束】`
}

export function buildInterviewQuestionPrompt(
  agent: Agent,
  messages: InterviewMessage[],
  topic: string,
  isContinuation: boolean
): string {
  const history = formatInterviewHistory(messages)

  const continuationHint = isContinuation
    ? `你刚才问过这位候选人问题，现在根据他/她的回答继续追问。`
    : `轮到你了，从你${agent.roleLabel}的专业角度出发。`

  return `以下是目前的面试对话记录：
${history}

${continuationHint}

主持人给你的提问方向：「${topic}」

要求：
- 围绕这个方向提一个具体的问题
- 如果候选人提出了问题，可以先回答他，然后再问问题
- 可以引用候选人之前说过的内容来追问
- 问题要有针对性，能考察出真实能力
- 只问一个问题，简洁明了，不超过3句
- 保持你自己的风格和语气
- 直接提问，不要加任何格式标记`
}

export function buildEvaluationPrompt(
  agent: Agent,
  messages: InterviewMessage[],
  userProfile: UserProfile
): string {
  const history = formatInterviewHistory(messages)

  return `以下是完整的面试对话记录：
${history}

候选人应聘的岗位：${userProfile.targetPosition || '未指定'}

${agent.name}，面试结束了。请从你${agent.roleLabel}的角度，对这位候选人给出简短评价：
- 候选人表现出的优势和不足（各1-2点）
- 你觉得这人行不行，给个明确态度

用2-3句话说完，直接说结论，不要啰嗦。`
}

export function buildFinalSummaryPrompt(
  agent: Agent,
  evaluations: Array<{ agentName: string; agentRole: string; content: string }>,
  messages: InterviewMessage[]
): string {
  const evalSection = evaluations
    .map((e) => `${e.agentName}（${e.agentRole}）：${e.content}`)
    .join('\n\n')

  return `各位面试官的评价如下：
${evalSection}

${agent.name}，你来做最终总结：
1. 综合各位面试官的意见
2. 给出最终结论

最后标注：【决定：通过】或【决定：不通过】`
}
