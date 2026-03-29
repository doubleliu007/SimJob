import type { Agent, ChatMessage, UserProfile } from '@/types'
import { PERSONALITY_MAP } from './personalities'

function getPersonalityDesc(agent: Agent): string {
  return PERSONALITY_MAP.get(agent.personality)?.description ?? ''
}

function formatDiscussionHistory(messages: ChatMessage[]): string {
  if (messages.length === 0) return '（暂无发言记录）'
  return messages
    .map((m) => `${m.agentName}（${m.agentRole}）：${m.content}`)
    .join('\n\n')
}

function agentRoster(agents: Agent[], excludeId?: string): string {
  return agents
    .filter((a) => a.id !== excludeId)
    .map((a) => `${a.name}（${a.roleLabel}）`)
    .join('、')
}

export function formatJDSection(jobDescription: string): string {
  if (!jobDescription) return ''
  return `\n该岗位的职位描述（JD）：\n${jobDescription}\n`
}

export function buildJobDescriptionPrompt(
  targetPosition: string,
  companyName: string,
  companyType: string
): { systemPrompt: string; userMessage: string } {
  return {
    systemPrompt: '你是一个招聘助手。请根据岗位和公司信息，生成一份简洁的职位描述。用中文回答。',
    userMessage: `请为「${companyName}」（${companyType}行业）的「${targetPosition || '综合岗位'}」生成一份简短的职位描述（JD），包括：
1. 岗位职责（3-4条）
2. 任职要求（3-4条）

要求简洁，总共不超过150字，不要分段标题，直接用短句列出。`,
  }
}

export function buildCompanyContextPrompt(
  companyName: string,
  companyType: string
): { systemPrompt: string; userMessage: string } {
  return {
    systemPrompt: '你是一个企业信息助手。请根据你的知识如实介绍公司情况。如果你不确定某些信息，可以说"据公开信息"或合理推测，但不要编造具体数字。用中文回答。',
    userMessage: `请简要介绍「${companyName}」这家${companyType}公司，包括：
1. 主营业务和核心产品/服务
2. 行业地位和规模
3. 企业文化和工作氛围的特点
4. 近1-2年的重要动态（如有）

用3-5句话概括，不要分点，写成一段自然的描述。如果你对这家公司不太了解，就根据「${companyType}」行业的一般情况来描述一家这样的公司。`,
  }
}

export function buildSystemPrompt(
  agent: Agent,
  companyName: string,
  companyType: string,
  companyContext: string
): string {
  const personalityDesc = getPersonalityDesc(agent)
  return `你是${agent.name}，${companyName}的${agent.roleLabel}。你的性格就是这样的：${personalityDesc}

关于你所在的公司：${companyContext}

你正在公司会议室里开简历筛选会，和同事们一起看一个候选人的材料，讨论要不要让他进面试。
说话要结合公司实际情况（业务方向、团队需求、企业文化），专业且自然，别太书面化。每次最多5-10句。可以同意、反驳、补充、吐槽别人说的。说中文。
重要：不要重复别人已经说过的观点。如果你同意某个观点，一句话带过就行，把篇幅留给新的分析或更深的思考。`
}

export function buildFirstRoundUserMessage(
  agent: Agent,
  userProfile: UserProfile,
  agents: Agent[],
  previousMessages: ChatMessage[]
): string {
  const prevSection = previousMessages.length > 0
    ? `\n前面同事已经说了：\n${formatDiscussionHistory(previousMessages)}\n\n不要重复他们的观点，找到新的角度来分析。`
    : ''

  return `简历筛选会开始了。在场的有：${agentRoster(agents)}，还有你${agent.name}。

候选人的简历：
${userProfile.resume}

候选人的自我介绍：
${userProfile.selfIntroduction}

候选人应聘的是${userProfile.companyName}（${userProfile.companyType}行业）${userProfile.targetPosition ? `，目标岗位是「${userProfile.targetPosition}」` : ''}。${formatJDSection(userProfile.jobDescription)}
${prevSection}
第一轮，每人说说对这份简历的第一印象。轮到你了${agent.name}，从你${agent.roleLabel}的角度，结合公司的实际业务和需求说说看法。直接说，不用自我介绍。`
}

function extractDiscussedTopics(messages: ChatMessage[]): string {
  if (messages.length === 0) return '暂无'
  const topics = new Set<string>()
  for (const m of messages) {
    const keywords = m.content.match(/(?:关于|提到|说到|觉得|认为|问题是|方面).{2,15}/g)
    if (keywords) keywords.forEach((k) => topics.add(k))
  }
  if (topics.size === 0) return '（已有若干轮发言，请自行从记录中总结）'
  return [...topics].slice(0, 8).join('；')
}

export function buildModeratorPickMessage(
  moderator: Agent,
  agents: Agent[],
  messages: ChatMessage[],
  lastSpeaker: Agent
): string {
  const history = formatDiscussionHistory(messages)
  const roster = agents
    .filter((a) => a.id !== moderator.id)
    .map((a) => `${a.name}（${a.roleLabel}）`)
    .join('、')
  const touchedTopics = extractDiscussedTopics(messages)

  return `以下是到目前为止的讨论记录：
${history}

已经触及的话题方向：${touchedTopics}

刚才${lastSpeaker.name}说完了。你是这次会的主持人，你要做两件事：
1. 回顾讨论，判断哪些维度还没深入或者完全没聊到（比如：技术能力、业务理解、团队适配、成长潜力、简历疑点、稳定性、薪资预期等等）
2. 选一个最适合聊这个方向的人，并给他/她抛一个具体的问题或讨论方向

在场的人有：${roster}

如果讨论已经充分（各维度都有深入），回复：【会议结束】
否则回复以下格式（两行，不要说别的）：
【下一位：某某某】
【话题：你想让他/她回答的具体问题或讨论的具体方向】`
}

export function buildFreeDiscussionUserMessage(
  agent: Agent,
  agents: Agent[],
  messages: ChatMessage[],
  moderatorTopic?: string
): string {
  const history = formatDiscussionHistory(messages)

  const topicGuide = moderatorTopic
    ? `\n主持人给你的问题/方向：「${moderatorTopic}」\n请围绕这个方向展开，结合你${agent.roleLabel}的专业视角给出有深度的分析。`
    : `\n从你${agent.roleLabel}的角度，挑一个别人还没深入聊过的点来展开。`

  return `以下是到目前为止的讨论记录：
${history}
${topicGuide}

轮到你了${agent.name}。要求：
- 别人说过的观点不要重复，认同的话一句话带过
- 要有你自己的独立判断，最好能举出具体依据（简历里的细节、行业经验等）
- 如果有不同意见，直接说，讲清楚为什么
- 最多3-5句，说到点子上

直接发表观点，不要加【下一位：xxx】之类的格式标记。`
}

export function buildSummaryUserMessage(
  agent: Agent,
  messages: ChatMessage[]
): string {
  const history = formatDiscussionHistory(messages)

  return `以下是完整的讨论记录：
${history}

讨论到这了。${agent.name}你来总结一下：
- 汇总大家的意见
- 拍板这人过不过
- 最后标注：【决定：通过】或【决定：不通过】`
}

export function buildHRSuggestionUserMessage(
  agent: Agent,
  userProfile: UserProfile,
  messages: ChatMessage[]
): string {
  const history = formatDiscussionHistory(messages)

  return `以下是刚才简历筛选会的讨论记录：
${history}

候选人原始简历：
${userProfile.resume}

候选人原始自我介绍：
${userProfile.selfIntroduction}
${formatJDSection(userProfile.jobDescription)}
${agent.name}，刚才会上大家提了不少意见。你来给这位候选人出一份简历和自我介绍的优化建议：
1. 简历哪些地方要改？怎么改？
2. 自我介绍哪里可以更好？
3. 给3-5条具体能落地的建议

条理清晰地列出来。`
}
