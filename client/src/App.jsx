import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import AdminPage from './pages/AdminPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import JobsPage from './pages/JobsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import PlanPage from './pages/PlanPage.jsx'
import QuestionsPage from './pages/QuestionsPage.jsx'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/questions" element={<QuestionsPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
