import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'

import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import NewProjectPage from './pages/NewProjectPage'
import ClientsPage from './pages/ClientsPage'
import ResellersPage from './pages/ResellersPage'
import ResellerDetailPage from './pages/ResellerDetailPage'
import ResellerFormPage from './pages/ResellerFormPage'
import SettingsPage from './pages/SettingsPage'
import ResellerPortalPage from './pages/ResellerPortalPage'
import ResellerPortalPublicPage from './pages/ResellerPortalPublicPage'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    // Sessão inicial
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    // Listener para login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Aguarda verificação da sessão
  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <Routes>
      {/* Portal público do revendedor — sempre acessível */}
      <Route path="/portal/:resellerId" element={<ResellerPortalPublicPage />} />

      {/* Login — redireciona para home se já autenticado */}
      <Route path="/login" element={
        session ? <Navigate to="/" replace /> : <LoginPage />
      } />

      {/* Rotas internas — protegidas */}
      <Route path="/" element={
        session ? <Layout /> : <Navigate to="/login" replace />
      }>
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<NewProjectPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="resellers" element={<ResellersPage />} />
        <Route path="resellers/new" element={<ResellerFormPage />} />
        <Route path="resellers/:id" element={<ResellerDetailPage />} />
        <Route path="resellers/:id/edit" element={<ResellerFormPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="portal" element={<ResellerPortalPage />} />
      </Route>
    </Routes>
  )
}
