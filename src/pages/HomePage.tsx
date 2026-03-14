import { Link } from 'react-router-dom'

const FEATURES = [
  {
    title: '简历筛选会',
    description: '总经理、HR、部门主管围在会议桌前，逐字审视你的简历。有人替你说话，有人当场拍桌——在你不在场的情况下，他们会怎么讨论你？',
    icon: '📋',
    path: '/setup',
    available: true,
  },
  {
    title: '部门主管面试',
    description: '通过简历关只是开始。部门主管会从专业深度和团队匹配两个维度，拆解你的每一段经历。',
    icon: '💼',
    path: '/dept-interview',
    available: true,
  },
  {
    title: '终面',
    description: '最后一关，和决策层面对面。能力已经不是问题，他们想知道的是——你这个人，值不值得押注。',
    icon: '🏛️',
    path: '/chairman-interview',
    available: false,
  },
]

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-16">
      <div className="text-center mb-10 md:mb-16">
        <h1 className="text-3xl md:text-5xl font-bold text-slate-800 mb-3 md:mb-4">
          SimJob
        </h1>
        <p className="text-base md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
          你的简历递上去之后，会议室里发生了什么？
        </p>
        <p className="text-xs md:text-sm text-slate-400 mt-2 md:mt-3">
          AI 还原真实招聘场景——五个性格各异的面试官，一场你看不见的内部讨论
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10 md:mb-16">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className={`relative rounded-2xl border p-6 md:p-8 transition-all ${
              f.available
                ? 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer'
                : 'bg-slate-50 border-slate-200 opacity-60'
            }`}
          >
            {!f.available && (
              <span className="absolute top-4 right-4 text-xs bg-slate-200 text-slate-500 px-2 py-1 rounded-full">
                即将开放
              </span>
            )}
            <div className="text-3xl md:text-4xl mb-3 md:mb-4">{f.icon}</div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {f.title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4 md:mb-6">
              {f.description}
            </p>
            {f.available ? (
              <Link
                to={f.path}
                className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                进入准备
              </Link>
            ) : (
              <span className="inline-block px-5 py-2.5 bg-slate-200 text-slate-400 text-sm font-medium rounded-lg">
                敬请期待
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs md:text-sm px-3 md:px-4 py-2 rounded-lg">
          <span>⚡</span>
          <span>纯前端运行，数据不上传服务器。需自备 OpenAI 兼容 API。</span>
        </div>
      </div>
    </div>
  )
}
