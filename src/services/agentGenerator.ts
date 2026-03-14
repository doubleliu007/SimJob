import type { Agent, PersonalityType } from '@/types'
import { ROLE_CONFIGS, SURNAMES } from '@/config/roles'
import { PERSONALITY_CONFIGS } from '@/config/personalities'

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateAgents(): Agent[] {
  const agents: Agent[] = []
  const usedSurnames = new Set<string>()
  const shuffledSurnames = shuffle(SURNAMES)
  let surnameIndex = 0

  function getNextSurname(): string {
    while (surnameIndex < shuffledSurnames.length) {
      const s = shuffledSurnames[surnameIndex++]
      if (!usedSurnames.has(s)) {
        usedSurnames.add(s)
        return s
      }
    }
    return SURNAMES[Math.floor(Math.random() * SURNAMES.length)]
  }

  for (const roleConfig of ROLE_CONFIGS) {
    const count = randomInt(roleConfig.minCount, roleConfig.maxCount)
    const shuffledPersonalities = shuffle(PERSONALITY_CONFIGS)
    const usedPersonalities = new Set<PersonalityType>()

    for (let i = 0; i < count; i++) {
      let personality = shuffledPersonalities[i % shuffledPersonalities.length]
      if (usedPersonalities.has(personality.type) && count < PERSONALITY_CONFIGS.length) {
        personality = shuffledPersonalities.find(
          (p) => !usedPersonalities.has(p.type)
        )!
      }
      usedPersonalities.add(personality.type)

      const surname = getNextSurname()
      const avatar = roleConfig.avatars[i % roleConfig.avatars.length]
      const isSeniorHR = roleConfig.type === 'hr' && i === 0

      agents.push({
        id: `${roleConfig.type}_${i}`,
        name: `${surname}${roleConfig.label}`,
        role: roleConfig.type,
        personality: personality.type,
        roleLabel: isSeniorHR ? '资深HR' : roleConfig.label,
        personalityLabel: personality.label,
        avatar,
        isSeniorHR,
      })
    }
  }

  return agents
}

export function getAgentsByRole(agents: Agent[], role: string): Agent[] {
  return agents.filter((a) => a.role === role)
}

export function getGeneralManagers(agents: Agent[]): Agent[] {
  return getAgentsByRole(agents, 'general_manager')
}

export function getSeniorHR(agents: Agent[]): Agent | undefined {
  return agents.find((a) => a.isSeniorHR)
}

export function getRandomModerator(agents: Agent[]): Agent {
  const gms = getGeneralManagers(agents)
  return pickRandom(gms)
}

export function generateInterviewAgents(): Agent[] {
  const agents: Agent[] = []
  const usedSurnames = new Set<string>()
  const shuffledSurnames = shuffle(SURNAMES)
  let surnameIndex = 0

  function getNextSurname(): string {
    while (surnameIndex < shuffledSurnames.length) {
      const s = shuffledSurnames[surnameIndex++]
      if (!usedSurnames.has(s)) {
        usedSurnames.add(s)
        return s
      }
    }
    return SURNAMES[Math.floor(Math.random() * SURNAMES.length)]
  }

  const interviewRoles: Array<{
    role: 'dept_head' | 'hr'
    label: string
    avatar: string
    count: number
  }> = [
    { role: 'dept_head', label: '部门主管', avatar: '💼', count: 1 },
    { role: 'dept_head', label: '部门主管', avatar: '📈', count: 1 },
    { role: 'hr', label: 'HR', avatar: '📋', count: 1 },
  ]

  const shuffledPersonalities = shuffle(PERSONALITY_CONFIGS)
  const usedPersonalities = new Set<PersonalityType>()

  for (let i = 0; i < interviewRoles.length; i++) {
    const config = interviewRoles[i]
    let personality = shuffledPersonalities[i % shuffledPersonalities.length]
    if (usedPersonalities.has(personality.type)) {
      personality = shuffledPersonalities.find(
        (p) => !usedPersonalities.has(p.type)
      )!
    }
    usedPersonalities.add(personality.type)

    const surname = getNextSurname()

    agents.push({
      id: `interview_${config.role}_${i}`,
      name: `${surname}${config.label}`,
      role: config.role,
      personality: personality.type,
      roleLabel: config.label,
      personalityLabel: personality.label,
      avatar: config.avatar,
    })
  }

  return agents
}
