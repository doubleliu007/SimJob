import { create } from 'zustand'
import type {
  Agent,
  ChairmanInterviewResult,
  ChairmanInterviewStatus,
  InterviewMessage,
} from '@/types'
import { saveToStorage } from '@/utils/storage'

interface ChairmanState {
  agents: Agent[]
  messages: InterviewMessage[]
  chairmanStatus: ChairmanInterviewStatus
  chairmanResult: ChairmanInterviewResult | null
  currentSpeakerId: string | null
  error: string | null

  setAgents: (agents: Agent[]) => void
  addMessage: (message: InterviewMessage) => void
  setChairmanStatus: (status: ChairmanInterviewStatus) => void
  setChairmanResult: (result: ChairmanInterviewResult) => void
  setCurrentSpeakerId: (id: string | null) => void
  setError: (error: string | null) => void
  resetChairman: () => void
}

export const useChairmanStore = create<ChairmanState>((set) => ({
  agents: [],
  messages: [],
  chairmanStatus: 'idle',
  chairmanResult: null,
  currentSpeakerId: null,
  error: null,

  setAgents: (agents) => set({ agents }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setChairmanStatus: (status) => set({ chairmanStatus: status }),

  setChairmanResult: (result) => {
    set({ chairmanResult: result })
    saveToStorage('chairmanResult', result)
  },

  setCurrentSpeakerId: (id) => set({ currentSpeakerId: id }),

  setError: (error) => set({ error }),

  resetChairman: () =>
    set({
      agents: [],
      messages: [],
      chairmanStatus: 'idle',
      chairmanResult: null,
      currentSpeakerId: null,
      error: null,
    }),
}))
