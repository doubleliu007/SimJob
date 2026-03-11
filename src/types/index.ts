export type RoleType =
  | 'general_manager'
  | 'hr'
  | 'dept_head'

export type PersonalityType =
  | 'gentle'
  | 'cold'
  | 'passionate'
  | 'slacker'
  | 'manic'
  | 'sycophant'
  | 'sarcastic'

export interface Agent {
  id: string
  name: string
  role: RoleType
  personality: PersonalityType
  roleLabel: string
  personalityLabel: string
  avatar: string
  isSeniorHR?: boolean
}

export type DiscussionPhase =
  | 'first_round'
  | 'free_discussion'
  | 'summary'
  | 'suggestion'

export interface ChatMessage {
  id: string
  agentId: string
  agentName: string
  agentRole: string
  agentPersonality: string
  personalityType: PersonalityType
  agentAvatar: string
  content: string
  nextSpeakerId?: string
  phase: DiscussionPhase
  timestamp: number
}

export interface UserProfile {
  resume: string
  selfIntroduction: string
  companyType: string
  companyName: string
}

export interface ApiConfig {
  apiKey: string
  baseUrl: string
  model: string
}

export interface DiscussionResult {
  passed: boolean
  summary: string
  suggestions: string
  messages: ChatMessage[]
  agents: Agent[]
  userProfile: UserProfile
}

export type DiscussionStatus =
  | 'idle'
  | 'generating_agents'
  | 'first_round'
  | 'free_discussion'
  | 'summarizing'
  | 'suggesting'
  | 'finished'
  | 'error'
