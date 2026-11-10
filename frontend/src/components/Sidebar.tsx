import React from 'react'
import {
  LayoutDashboard,
  Landmark,
  ArrowRightLeft,
  History,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Shield,
  Globe,
} from 'lucide-react'

export type NavTab = 'dashboard' | 'accounts' | 'transactions' | 'time-machine' | 'security-check'

interface SidebarProps {
  activeTab: NavTab
  onSelectTab: (tab: NavTab) => void
  onNavigateToLanding?: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

const NAV_ITEMS: { id: NavTab; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    desc: 'Live balances and cash flow',
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: <Landmark className="w-4 h-4" />,
    desc: 'Manage balances and statements',
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: <ArrowRightLeft className="w-4 h-4" />,
    desc: 'Double-entry transfers and history',
  },
  {
    id: 'time-machine',
    label: 'Time Machine',
    icon: <History className="w-4 h-4" />,
    desc: 'Check balances at any past moment',
  },
  {
    id: 'security-check',
    label: 'Security Check',
    icon: <ShieldCheck className="w-4 h-4" />,
    desc: 'Verify ledger tamper-protection',
  },
]

export default function Sidebar({
  activeTab,
  onSelectTab,
  onNavigateToLanding,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <aside
      className={`relative flex flex-col justify-between border-r border-slate-200 bg-white transition-all duration-200 z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Section: Organization Branding */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
          {!isCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
                ◈
              </div>
              <div className="truncate">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none truncate">
                  Apex Treasury
                </h1>
                <span className="text-[11px] text-slate-400 font-medium">Production Core</span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                ◈
              </div>
            </div>
          )}

          {/* Collapse Button */}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer hidden md:block"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items (Segmented Pill Style) */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer text-left ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`shrink-0 transition-colors ${
                    isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                >
                  {item.icon}
                </div>
                {!isCollapsed && (
                  <div className="truncate">
                    <div className="leading-tight truncate">{item.label}</div>
                    <div className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-indigo-500/80 font-normal' : 'text-slate-400'}`}>
                      {item.desc}
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Bottom Section: Landing Page Link + Immutability Trust Badge */}
      <div className="p-4 border-t border-slate-100 space-y-2.5">
        {onNavigateToLanding && (
          <button
            onClick={onNavigateToLanding}
            title={isCollapsed ? 'Landing Page' : undefined}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/70 transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
            {!isCollapsed && <span>Public Landing Page</span>}
          </button>
        )}

        {!isCollapsed ? (
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-800 leading-tight">Ledger Active</div>
              <div className="text-[10px] text-slate-500 font-medium">Verified Active</div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="100% Append-Only Ledger">
            <Shield className="w-4 h-4 text-emerald-600" />
          </div>
        )}
      </div>
    </aside>
  )
}
