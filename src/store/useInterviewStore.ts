import { create } from 'zustand'
import type {
  Agent,
  DiscussionResult,
  InterviewMessage,
  InterviewResult,
  InterviewStatus,
} from '@/types'
import { loadFromStorage, saveToStorage } from '@/utils/storage'

interface InterviewState {
  agents: Agent[]
  messages: InterviewMessage[]
  interviewStatus: InterviewStatus
  interviewResult: InterviewResult | null
  currentSpeakerId: string | null
  error: string | null
  companyContext: string
  gmConclusion: DiscussionResult | null

  setAgents: (agents: Agent[]) => void
  addMessage: (message: InterviewMessage) => void
  setInterviewStatus: (status: InterviewStatus) => void
  setInterviewResult: (result: InterviewResult) => void
  setCurrentSpeakerId: (id: string | null) => void
  setError: (error: string | null) => void
  setCompanyContext: (context: string) => void
  setGmConclusion: (result: DiscussionResult) => void
  resetInterview: () => void
}

const storedGmConclusion = loadFromStorage<DiscussionResult>('discussionResult')

export const useInterviewStore = create<InterviewState>((set) => ({
  agents: [],
  messages: [],
  interviewStatus: 'idle',
  interviewResult: null,
  currentSpeakerId: null,
  error: null,
  companyContext: '',
  gmConclusion: storedGmConclusion ?? null,

  setAgents: (agents) => set({ agents }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setInterviewStatus: (status) => set({ interviewStatus: status }),

  setInterviewResult: (result) => {
    set({ interviewResult: result })
    saveToStorage('interviewResult', result)
  },

  setCurrentSpeakerId: (id) => set({ currentSpeakerId: id }),

  setError: (error) => set({ error }),

  setCompanyContext: (context) => set({ companyContext: context }),

  setGmConclusion: (result) => set({ gmConclusion: result }),

  resetInterview: () =>
    set({
      agents: [],
      messages: [],
      interviewStatus: 'idle',
      interviewResult: null,
      currentSpeakerId: null,
      error: null,
      companyContext: '',
    }),
}))
