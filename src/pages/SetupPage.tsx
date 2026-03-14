import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import ApiSettingsModal from '@/components/ApiSettingsModal'

const COMPANY_TYPES = [
  { value: '互联网科技', icon: '💻' },
  { value: '金融', icon: '🏦' },
  { value: '制造业', icon: '🏭' },
  { value: '教育培训', icon: '📚' },
  { value: '医疗健康', icon: '🏥' },
  { value: '游戏', icon: '🎮' },
  { value: '电商', icon: '🛒' },
  { value: '咨询', icon: '📊' },
]

const DEFAULT_COMPANIES: Record<string, string[]> = {
  '互联网科技': ['字节跳动', '腾讯', '阿里巴巴', '美团', '百度', '小红书', '华为', 'OPPO'],
  '金融': ['招商银行', '中信证券', '蚂蚁集团', '平安集团', '中金公司', '华泰证券'],
  '制造业': ['比亚迪', '宁德时代', '美的集团', '格力电器', '大疆创新', '三一重工'],
  '教育培训': ['新东方', '好未来', '猿辅导', '作业帮', '网易有道', '粉笔教育'],
  '医疗健康': ['药明康德', '迈瑞医疗', '恒瑞医药', '京东健康', '微医', '丁香园'],
  '游戏': ['米哈游', '网易游戏', '莉莉丝', '叠纸游戏', '鹰角网络', '西山居'],
  '电商': ['拼多多', '京东', 'SHEIN', '唯品会', '得物', '抖音电商'],
  '咨询': ['麦肯锡', '波士顿咨询', '贝恩咨询', '德勤', '埃森哲', '罗兰贝格'],
}

function pickRandomCompany(companyType: string): string {
  const list = DEFAULT_COMPANIES[companyType]
  if (!list || list.length === 0) return `${companyType}行业某知名公司`
  return list[Math.floor(Math.random() * list.length)]
}

export default function SetupPage() {
  const navigate = useNavigate()
  const { userProfile, setUserProfile, apiConfig } = useStore()
  const [showApiModal, setShowApiModal] = useState(false)

  const [resume, setResume] = useState(userProfile.resume)
  const [selfIntro, setSelfIntro] = useState(userProfile.selfIntroduction)
  const [targetPosition, setTargetPosition] = useState(userProfile.targetPosition ?? '')
  const [companyType, setCompanyType] = useState(
    userProfile.companyType || COMPANY_TYPES[0].value
  )
  const [companyName, setCompanyName] = useState(userProfile.companyName ?? '')

  const isApiConfigured = apiConfig.apiKey && apiConfig.baseUrl
  const isFormValid = resume.trim() && selfIntro.trim() && companyType

  function handleStart() {
    if (!isApiConfigured) {
      setShowApiModal(true)
      return
    }
    const finalCompanyName = companyName.trim() || pickRandomCompany(companyType)
    setUserProfile({
      resume,
      selfIntroduction: selfIntro,
      targetPosition,
      companyType,
      companyName: finalCompanyName,
    })
    navigate('/screening')
  }

  return (
    <div className="h-full overflow-y-auto"><div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">准备你的面试材料</h1>
      <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-8">
        填写简历和自我介绍，选择目标公司类型，然后开始模拟面试之旅
      </p>

      {/* API Config Status */}
      <div
        className={`mb-8 p-4 rounded-xl border cursor-pointer transition-colors ${
          isApiConfigured
            ? 'bg-green-50 border-green-200 hover:border-green-300'
            : 'bg-red-50 border-red-200 hover:border-red-300'
        }`}
        onClick={() => setShowApiModal(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">{isApiConfigured ? '✅' : '⚠️'}</span>
            <div>
              <p className="font-medium text-slate-700">
                {isApiConfigured ? 'API 已配置' : 'API 未配置'}
              </p>
              <p className="text-sm text-slate-500">
                {isApiConfigured
                  ? `模型: ${apiConfig.model}`
                  : '点击此处配置 API Key 和 Base URL'}
              </p>
            </div>
          </div>
          <span className="text-sm text-blue-600 font-medium">
            {isApiConfigured ? '修改' : '配置'}
          </span>
        </div>
      </div>

      {/* Resume */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          简历内容
        </label>
        <textarea
          className="w-full h-48 px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
          placeholder="请粘贴你的简历文字内容，包括教育背景、工作经历、技能等……"
          value={resume}
          onChange={(e) => setResume(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-400">
          {resume.length} 字
        </p>
      </div>

      {/* Self Introduction */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          自我介绍
        </label>
        <textarea
          className="w-full h-32 px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
          placeholder="请写一段自我介绍，将会在面试中使用……"
          value={selfIntro}
          onChange={(e) => setSelfIntro(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-400">
          {selfIntro.length} 字
        </p>
      </div>

      {/* Target Position */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          目标岗位
          <span className="ml-2 text-xs font-normal text-slate-400">
            选填，如：前端开发工程师、产品经理、数据分析师
          </span>
        </label>
        <input
          type="text"
          className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          placeholder="请输入你应聘的岗位名称"
          value={targetPosition}
          onChange={(e) => setTargetPosition(e.target.value)}
        />
      </div>

      {/* Company Type */}
      <div className="mb-10">
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          目标公司类型
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {COMPANY_TYPES.map((ct) => (
            <button
              key={ct.value}
              onClick={() => setCompanyType(ct.value)}
              className={`flex flex-col items-center gap-1 p-2.5 md:p-3 rounded-xl border text-sm transition-all ${
                companyType === ct.value
                  ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="text-xl md:text-2xl">{ct.icon}</span>
              <span className="font-medium text-xs md:text-sm">{ct.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Company Name */}
      <div className="mb-10">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          目标公司名称
          <span className="ml-2 text-xs font-normal text-slate-400">
            选填，不填会为你随机匹配一家真实公司
          </span>
        </label>
        <input
          type="text"
          className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          placeholder={`例如：${DEFAULT_COMPANIES[companyType]?.slice(0, 3).join('、') ?? '某知名公司'}`}
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={!isFormValid}
        className={`w-full py-3.5 rounded-xl text-base font-semibold transition-all ${
          isFormValid
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
      >
        {isApiConfigured ? '🚀 开始简历筛选讨论' : '⚙️ 请先配置 API'}
      </button>

      {showApiModal && (
        <ApiSettingsModal onClose={() => setShowApiModal(false)} />
      )}
    </div></div>
  )
}
