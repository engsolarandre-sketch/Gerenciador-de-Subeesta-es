import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
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
  return (
    <Routes>
      {/* Portal público do revendedor — sem menu interno */}
      <Route path="/portal/:resellerId" element={<ResellerPortalPublicPage />} />

      {/* Rotas internas */}
      <Route path="/" element={<Layout />}>
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