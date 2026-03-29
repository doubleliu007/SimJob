import { create } from 'zustand'
import type {
  Agent,
  ApiConfig,
  ChatMessage,
  DiscussionResult,
  DiscussionStatus,
  UserProfile,
} from '@/types'
import { loadFromStorage, saveToStorage } from '@/utils/storage'

interface AppState {
  apiConfig: ApiConfig
  userProfile: UserProfile
  agents: Agent[]
  messages: ChatMessage[]
  discussionStatus: DiscussionStatus
  discussionResult: DiscussionResult | null
  moderatorId: string | null
  currentSpeakerId: string | null
  error: string | null

  setApiConfig: (config: ApiConfig) => void
  setUserProfile: (profile: UserProfile) => void
  setAgents: (agents: Agent[]) => void
  addMessage: (message: ChatMessage) => void
  setDiscussionStatus: (status: DiscussionStatus) => void
  setDiscussionResult: (result: DiscussionResult) => void
  setModeratorId: (id: string) => void
  setCurrentSpeakerId: (id: string | null) => void
  setError: (error: string | null) => void
  resetDiscussion: () => void
}

const defaultApiConfig: ApiConfig = loadFromStorage<ApiConfig>('apiConfig') ?? {
  apiKey: '',
  baseUrl: '',
  model: 'gpt-4o-mini',
}

const storedProfile = loadFromStorage<Partial<UserProfile>>('userProfile')
const defaultUserProfile: UserProfile = {
  resume: '',
  selfIntroduction: '',
  targetPosition: '',
  jobDescription: '',
  companyType: '',
  companyName: '',
  ...storedProfile,
}

const storedDiscussionResult = loadFromStorage<DiscussionResult>('discussionResult')

export const useStore = create<AppState>((set, get) => ({
  apiConfig: defaultApiConfig,
  userProfile: defaultUserProfile,
  agents: [],
  messages: [],
  discussionStatus: 'idle',
  discussionResult: storedDiscussionResult ?? null,
  moderatorId: null,
  currentSpeakerId: null,
  error: null,

  setApiConfig: (config) => {
    set({ apiConfig: config })
    saveToStorage('apiConfig', config)
  },

  setUserProfile: (profile) => {
    set({ userProfile: profile })
    saveToStorage('userProfile', profile)
  },

  setAgents: (agents) => set({ agents }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setDiscussionStatus: (status) => set({ discussionStatus: status }),

  setDiscussionResult: (result) => {
    set({ discussionResult: result })
    saveToStorage('discussionResult', result)
  },

  setModeratorId: (id) => set({ moderatorId: id }),

  setCurrentSpeakerId: (id) => set({ currentSpeakerId: id }),

  setError: (error) => set({ error }),

  resetDiscussion: () =>
    set({
      agents: [],
      messages: [],
      discussionStatus: 'idle',
      discussionResult: null,
      moderatorId: null,
      currentSpeakerId: null,
      error: null,
    }),
}))
