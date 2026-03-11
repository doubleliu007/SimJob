import type { Agent, ChatMessage } from '@/types'

const PHASE_LABELS: Record<string, string> = {
  first_round: '第一轮发言',
  free_discussion: '自由讨论',
  summary: '总经理总结',
  suggestion: '资深HR建议',
}

export function formatDiscussionText(
  messages: ChatMessage[],
  agents: Agent[],
  companyType: string,
  companyName?: string
): string {
  const lines: string[] = []

  lines.push('═'.repeat(50))
  lines.push('SimJob 简历筛选会议记录')
  lines.push('═'.repeat(50))
  lines.push('')
  if (companyName) {
    lines.push(`目标公司：${companyName}（${companyType}）`)
  } else {
    lines.push(`公司类型：${companyType}`)
  }
  lines.push(`参会人员：`)
  for (const a of agents) {
    const seniorTag = a.isSeniorHR ? '（资深）' : ''
    lines.push(`  - ${a.name} | ${a.roleLabel}${seniorTag} | 性格：${a.personalityLabel}`)
  }
  lines.push('')
  lines.push('─'.repeat(50))

  let currentPhase = ''
  for (const msg of messages) {
    if (msg.phase !== currentPhase) {
      currentPhase = msg.phase
      lines.push('')
      lines.push(`▎${PHASE_LABELS[currentPhase] ?? currentPhase}`)
      lines.push('─'.repeat(50))
    }
    lines.push('')
    lines.push(`【${msg.agentName}（${msg.agentRole} · ${msg.agentPersonality}）】`)
    lines.push(msg.content)
  }

  lines.push('')
  lines.push('═'.repeat(50))
  lines.push(`导出时间：${new Date().toLocaleString('zh-CN')}`)
  lines.push('═'.repeat(50))

  return lines.join('\n')
}

export function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
