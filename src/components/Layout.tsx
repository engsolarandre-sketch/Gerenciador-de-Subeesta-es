import { Outlet, NavLink } from 'react-router-dom'
import {
  Zap, FolderKanban, Users, Building2,
  LayoutDashboard, Settings, LayoutGrid, LogOut, RadioTower
} from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../lib/supabase'

export default function Layout() {
  const link = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
      isActive
        ? 'bg-white text-slate-950 shadow-sm'
        : 'text-slate-300 hover:bg-white/8 hover:text-white'
    )

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <aside className="w-64 shrink-0 bg-slate-950 text-white">
        <div className="flex h-full flex-col p-4">
          <div className="mb-7 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-400 text-slate-950 shadow-sm">
              <Zap size={21} />
            </div>
            <div>
              <p className="text-base font-bold leading-tight tracking-tight">SubStation</p>
              <p className="text-xs font-medium text-slate-400">Gestão de subestações</p>
            </div>
          </div>

          <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <RadioTower size={14} />
              Operação
            </div>
            <p className="mt-1 text-sm font-semibold text-white">Projetos elétricos MT</p>
          </div>

          <nav className="flex flex-col gap-1">
            <NavLink to="/" end className={link}>
              <LayoutDashboard size={18} /> Dashboard
            </NavLink>
            <NavLink to="/projects" className={link}>
              <FolderKanban size={18} /> Projetos
            </NavLink>
            <NavLink to="/clients" className={link}>
              <Users size={18} /> Clientes
            </NavLink>
            <NavLink to="/resellers" className={link}>
              <Building2 size={18} /> Revendedores
            </NavLink>
            <NavLink to="/portal" className={link}>
              <LayoutGrid size={18} /> Portal Revendedor
            </NavLink>
          </nav>

          <div className="mt-auto border-t border-white/10 pt-4">
            <NavLink to="/settings" className={link}>
              <Settings size={18} /> Parâmetros
            </NavLink>
            <button
              onClick={handleLogout}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-200">
              <LogOut size={18} /> Sair
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/85 px-8 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">SubStation Manager</p>
            <p className="text-sm font-medium text-slate-700">Controle técnico e comercial de projetos de subestação</p>
          </div>
          <div className="app-chip">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Online
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto px-8 py-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
