import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { VapiCallProvider } from './context/VapiCallContext'
import { AppShell } from './layout/AppShell'
import { OverviewPage } from './pages/Overview'
import { CallsPage } from './pages/Calls'
import { LiveCallPage } from './pages/LiveCallPage'
import { EvalDetailPage } from './pages/EvalDetail'

function App() {
  return (
    <BrowserRouter>
      <VapiCallProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="calls" element={<CallsPage />} />
            <Route path="calls/:id/live" element={<LiveCallPage />} />
            <Route path="calls/:id" element={<EvalDetailPage />} />
          </Route>
        </Routes>
      </VapiCallProvider>
    </BrowserRouter>
  )
}

export default App
