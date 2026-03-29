import type { Agent, InterviewMessage, UserProfile } from '@/types'
import { PERSONALITY_MAP } from './personalities'
import { formatJDSection } from './prompts'

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

export function buildChairmanSystemPrompt(
  agent: Agent,
  companyName: string,
  companyType: string,
  companyContext: string,
  previousResults: string
): string {
  const personalityDesc = getPersonalityDesc(agent)
  return `你是${agent.name}，${companyName}的${agent.roleLabel}。你的性格就是这样的：${personalityDesc}

关于你所在的公司：${companyContext}

你正在对一位候选人进行最终面试（终面）。这位候选人已经通过了简历筛选和部门面试，现在进入最后决策环节。

之前各轮面试的情况：
${previousResults}

作为公司高管，你关注的不再是具体技术能力（前面已经验证过了），而是：
- 这个人的格局和视野
- 价值观是否与公司文化契合
- 长期发展潜力和稳定性
- 抗压能力、自我认知和成熟度
- 对行业和公司的理解深度
- 沟通中展现的人格魅力与可信度

说话要有高管的气场，但不刻意摆架子。语气可以更随意、更像聊天，但每个问题都精准直击要害。保持你的性格特点，说中文。每次只问一个问题，不超过3句话。`
}

export function buildChairmanOpeningMessage(
  agent: Agent,
  agents: Agent[],
  userProfile: UserProfile,
  previousResults: string
): string {
  return `终面开始了。你是这场面试的副总裁。在场的有：${interviewerRoster(agents)}。

候选人应聘的是${userProfile.companyName}（${userProfile.companyType}行业）${userProfile.targetPosition ? `的「${userProfile.targetPosition}」岗位` : ''}。${formatJDSection(userProfile.jobDescription)}
之前各轮面试的情况：
${previousResults}

这是最终面，气氛应该比之前的面试更轻松。请用1-2句话简短开场，营造一种"就是聊聊"的氛围，然后自然地抛出第一个问题。问题应该是开放式的、偏个人化的，比如聊聊职业理想、对行业的看法、为什么选择这家公司等。直接说，不要加任何格式标记。`
}

export function buildChairmanModeratorDecisionPrompt(
  agents: Agent[],
  messages: InterviewMessage[],
  previousResults: string,
  lastInterviewerId: string | null
): string {
  const history = formatInterviewHistory(messages)
  const roster = interviewerRoster(agents)

  const lastAgent = lastInterviewerId
    ? agents.find((a) => a.id === lastInterviewerId)
    : null

  const questionCount = messages.filter((m) => m.type === 'interviewer_question').length
  const lastUserAnswer = [...messages].reverse().find((m) => m.type === 'user_answer')

  return `你是一场终面（高管面试）的隐藏主持人。你需要决定下一步由谁提问以及提什么方向的问题。

在场高管：${roster}

之前各轮面试的评价：
${previousResults}

目前的终面对话记录：
${history}

已提问数量：${questionCount}

${lastAgent ? `上一个提问的是：${lastAgent.name}（${lastAgent.roleLabel}）` : ''}
${lastUserAnswer ? `候选人最新回答：${lastUserAnswer.content}` : ''}

你的决策规则：
1. 终面更注重深度对话，如果候选人的回答展现出有趣的视角或值得深挖的地方，让同一位高管继续聊
2. 如果话题已充分或需要换个维度，让另一位高管从新角度提问
3. 两位高管都要有充分的交流机会
4. 需要覆盖的维度：职业规划与动机、价值观与文化匹配、行业洞察、自我认知、领导力/协作风格、对公司的理解与期待
5. 终面通常5-7轮提问即可，不需要太多（高管时间宝贵）

回复格式（只输出以下格式之一，不要说别的）：

如果让同一位高管继续：
【继续：高管姓名】
【话题：你想让他/她深入聊的方向】

如果换一位高管：
【下一位：高管姓名】
【话题：你想让他/她聊的方向】

如果面试该结束了：
【面试结束】`
}

export function buildChairmanQuestionPrompt(
  agent: Agent,
  messages: InterviewMessage[],
  topic: string,
  isContinuation: boolean
): string {
  const history = formatInterviewHistory(messages)

  const continuationHint = isContinuation
    ? `你刚才和候选人聊过，现在接着他/她的回答继续深入。`
    : `轮到你了，从你${agent.roleLabel}的视角来聊。`

  return `以下是目前的终面对话记录：
${history}

${continuationHint}

主持人给你的聊天方向：「${topic}」

要求：
- 围绕这个方向提一个问题，但方式要像聊天，不像审问
- 可以分享一点自己的经历或看法来引出问题（一两句即可）
- 可以引用候选人之前说过的话来推进对话
- 问题要有深度，能看出候选人的真实想法和格局
- 只问一个问题，简洁自然，不超过3句
- 保持你自己的风格和语气
- 直接说，不要加任何格式标记`
}

export function buildChairmanEvaluationPrompt(
  agent: Agent,
  messages: InterviewMessage[],
  userProfile: UserProfile,
  previousResults: string
): string {
  const history = formatInterviewHistory(messages)

  return `以下是完整的终面对话记录：
${history}

候选人应聘的岗位：${userProfile.targetPosition || '未指定'}${formatJDSection(userProfile.jobDescription)}
之前各轮面试的评价：
${previousResults}

${agent.name}，终面结束了。请从你${agent.roleLabel}的角度，给出你对这位候选人的终面评价：
- 在对话中展现出的格局和视野
- 价值观与公司的契合度
- 你最欣赏和最担心的各一点
- 你的明确态度：建议给 offer 还是不给

用3-4句话说完，直接表态，不要啰嗦。`
}

export function buildChairmanFinalSummaryPrompt(
  agent: Agent,
  evaluations: Array<{ agentName: string; agentRole: string; content: string }>,
  messages: InterviewMessage[],
  previousResults: string
): string {
  const evalSection = evaluations
    .map((e) => `${e.agentName}（${e.agentRole}）：${e.content}`)
    .join('\n\n')

  return `各位高管的终面评价如下：
${evalSection}

之前各轮面试的整体评价：
${previousResults}

${agent.name}，你是公司的${agent.roleLabel}，你来做最终决定：

1. 综合所有面试轮次的表现和今天终面的印象
2. 给出你最终的判断：这个候选人值不值得公司投入资源培养
3. 如果决定给 offer，说明你看好他/她的理由
4. 如果决定不给 offer，说明具体的顾虑

最后标注：【决定：发放Offer】或【决定：不予录用】`
}
