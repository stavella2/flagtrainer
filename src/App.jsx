import { Routes, Route } from 'react-router-dom'
import CoachLogin from './pages/CoachLogin'
import CoachDashboard from './pages/CoachDashboard'
import TeamDetail from './pages/TeamDetail'
import TrainingEditor from './pages/TrainingEditor'
import PlayerView from './pages/PlayerView'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CoachLogin />} />
      <Route path="/coach" element={<CoachDashboard />} />
      <Route path="/coach/team/:teamId" element={<TeamDetail />} />
      <Route path="/coach/team/:teamId/training/:trainingId" element={<TrainingEditor />} />
      <Route path="/t/:token" element={<PlayerView />} />
    </Routes>
  )
}