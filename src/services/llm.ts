import OpenAI from 'openai'
import type { ApiConfig } from '@/types'

let client: OpenAI | null = null
let currentConfig: ApiConfig | null = null

export function initLLMClient(config: ApiConfig) {
  if (
    currentConfig &&
    currentConfig.apiKey === config.apiKey &&
    currentConfig.baseUrl === config.baseUrl
  ) {
    return client!
  }

  client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    dangerouslyAllowBrowser: true,
  })
  currentConfig = { ...config }
  return client
}

export function getLLMClient(): OpenAI {
  if (!client) {
    throw new Error('LLM 客户端未初始化，请先配置 API Key 和 Base URL')
  }
  return client
}

export interface ChatRequest {
  systemPrompt: string
  userMessage: string
  history?: Array<{ role: 'assistant' | 'user'; content: string }>
  maxTokens?: number
}

export async function chat(
  config: ApiConfig,
  request: ChatRequest
): Promise<string> {
  const llm = initLLMClient(config)

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: request.systemPrompt },
  ]

  if (request.history) {
    for (const msg of request.history) {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  messages.push({ role: 'user', content: request.userMessage })

  const response = await llm.chat.completions.create({
    model: config.model,
    messages,
    temperature: 0.9,
    max_tokens: request.maxTokens ?? 1024,
  })

  const content = response.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error(
      `API 返回了空响应或格式异常。原始响应：${JSON.stringify(response).slice(0, 500)}`
    )
  }
  return content
}

export async function testConnection(config: ApiConfig): Promise<boolean> {
  try {
    const llm = initLLMClient(config)
    await llm.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: '你好' }],
      max_tokens: 10,
    })
    return true
  } catch {
    return false
  }
}
