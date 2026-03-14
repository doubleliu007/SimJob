export type RoleType =
  | 'general_manager'
  | 'hr'
  | 'dept_head'
  | 'chairman'
  | 'vp'

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
  targetPosition: string
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

// ===== 部门面试相关类型 =====

export type InterviewMessageType =
  | 'interviewer_question'
  | 'user_answer'
  | 'system_notice'

export type InterviewPhase =
  | 'opening'
  | 'questioning'
  | 'waiting_for_user'
  | 'evaluating'
  | 'finished'

export interface InterviewMessage {
  id: string
  type: InterviewMessageType
  agentId?: string
  agentName?: string
  agentRole?: string
  agentPersonality?: string
  personalityType?: PersonalityType
  agentAvatar?: string
  content: string
  phase: InterviewPhase
  timestamp: number
}

export type InterviewStatus =
  | 'idle'
  | 'generating_agents'
  | 'opening'
  | 'questioning'
  | 'waiting_for_user'
  | 'moderator_deciding'
  | 'evaluating'
  | 'finished'
  | 'error'

export interface InterviewEvaluation {
  agentId: string
  agentName: string
  agentRole: string
  content: string
}

export interface InterviewResult {
  passed: boolean
  evaluations: InterviewEvaluation[]
  finalSummary: string
  messages: InterviewMessage[]
  agents: Agent[]
  userProfile: UserProfile
}

// ===== 终面（董事长面）相关类型 =====

export type ChairmanInterviewStatus = InterviewStatus

export interface ChairmanInterviewResult {
  offerGranted: boolean
  evaluations: InterviewEvaluation[]
  finalSummary: string
  messages: InterviewMessage[]
  agents: Agent[]
  userProfile: UserProfile
}
