import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { testConnection } from '@/services/llm'

interface Props {
  onClose: () => void
}

export default function ApiSettingsModal({ onClose }: Props) {
  const { apiConfig, setApiConfig } = useStore()
  const [apiKey, setApiKey] = useState(apiConfig.apiKey)
  const [baseUrl, setBaseUrl] = useState(apiConfig.baseUrl)
  const [model, setModel] = useState(apiConfig.model)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null)

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    const ok = await testConnection({ apiKey, baseUrl, model })
    setTestResult(ok ? 'success' : 'fail')
    setTesting(false)
  }

  function handleSave() {
    setApiConfig({ apiKey, baseUrl, model })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800">API 配置</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              API Base URL
            </label>
            <input
              type="url"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
              placeholder="https://api.example.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">
              请填写完整的 API 地址，需要包含 <span className="font-mono text-slate-500">/v1</span> 路径，例如：https://api.example.com/v1
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              API Key
            </label>
            <input
              type="password"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              模型名称
            </label>
            <input
              type="text"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
              placeholder="gpt-4o-mini"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
        </div>

        {testResult && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              testResult === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {testResult === 'success'
              ? '✅ 连接成功！API 配置有效。'
              : '❌ 连接失败，请检查 URL、Key 和模型名称。'}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleTest}
            disabled={!apiKey || !baseUrl || !model || testing}
            className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={handleSave}
            disabled={!apiKey || !baseUrl || !model}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  )
}
