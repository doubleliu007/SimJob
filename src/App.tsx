import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import HomePage from '@/pages/HomePage'
import SetupPage from '@/pages/SetupPage'
import ResumeScreeningPage from '@/pages/ResumeScreeningPage'
import DeptInterviewPage from '@/pages/DeptInterviewPage'
import ChairmanInterviewPage from '@/pages/ChairmanInterviewPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/screening" element={<ResumeScreeningPage />} />
          <Route path="/dept-interview" element={<DeptInterviewPage />} />
          <Route path="/chairman-interview" element={<ChairmanInterviewPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
