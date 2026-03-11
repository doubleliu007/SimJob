import { Link, Outlet, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/setup', label: '开始面试' },
  { path: '/screening', label: '简历筛选' },
  { path: '/dept-interview', label: '部门面试' },
  { path: '/chairman-interview', label: '董事长面试' },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center h-16 gap-8">
            <Link to="/" className="text-xl font-bold text-slate-800 tracking-tight">
              🎭 SimJob
            </Link>
            <div className="flex gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
