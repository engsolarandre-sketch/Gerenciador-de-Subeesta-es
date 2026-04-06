import { Outlet, NavLink } from 'react-router-dom'
import {
  Zap, FolderKanban, Users, Building2,
  LayoutDashboard, Settings, LayoutGrid, LogOut
} from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../lib/supabase'

export default function Layout() {
  const link = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
      isActive
        ? 'bg-brand text-white'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
    )

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 bg-white border-r flex flex-col p-4 gap-1 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6 px-1">
          <Zap className="text-brand" size={20} />
          <span className="font-bold text-brand text-base tracking-tight">SubStation</span>
        </div>

        {/* Nav principal */}
        <NavLink to="/" end className={link}>
          <LayoutDashboard size={17} /> Dashboard
        </NavLink>
        <NavLink to="/projects" className={link}>
          <FolderKanban size={17} /> Projetos
        </NavLink>
        <NavLink to="/clients" className={link}>
          <Users size={17} /> Clientes
        </NavLink>
        <NavLink to="/resellers" className={link}>
          <Building2 size={17} /> Revendedores
        </NavLink>

        {/* Separador */}
        <div className="my-2 border-t" />

        {/* Portal do revendedor */}
        <NavLink to="/portal" className={({ isActive }) =>
          clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
            isActive
              ? 'bg-brand text-white border-brand'
              : 'text-brand border-brand/30 bg-brand/5 hover:bg-brand/10'
          )}>
          <LayoutGrid size={17} /> Portal Revendedor
        </NavLink>

        {/* Rodapé */}
        <div className="mt-auto pt-4 border-t flex flex-col gap-1">
          <NavLink to="/settings" className={link}>
            <Settings size={17} /> Parâmetros
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-500 hover:bg-red-50 hover:text-red-500 w-full text-left">
            <LogOut size={17} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
