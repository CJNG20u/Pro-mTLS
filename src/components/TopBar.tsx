import React from 'react';
import { KeyRound, Server, FileText, Settings, Plus, Lock } from 'lucide-react';
import { BrandMark } from './BrandMark.tsx';

type Tab = 'dashboard' | 'certificates' | 'caddy' | 'crl' | 'settings';

interface TopBarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onOpenIssueModal: () => void;
  caActive: boolean;
  authEnabled: boolean;
  onLogout?: () => void;
}

const NAV: { id: Tab; label: string; short: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Certificates & CA', short: 'Certificates', icon: KeyRound },
  { id: 'caddy', label: 'Server Sync', short: 'Sync', icon: Server },
  { id: 'crl', label: 'CRL & Trust', short: 'CRL', icon: FileText },
  { id: 'settings', label: 'Settings', short: 'Settings', icon: Settings },
];

const isActive = (tab: Tab, active: Tab) =>
  tab === 'dashboard' ? active === 'dashboard' || active === 'certificates' : active === tab;

/**
 * App navigation. On desktop this renders as a fixed left rail; on small
 * screens it collapses into a top bar with a scrollable tab row.
 * (Component name kept as TopBar so App.tsx wiring is unchanged.)
 */
export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenIssueModal,
  caActive,
  authEnabled,
  onLogout,
}) => {
  const issueButton = (extra = '') => (
    <button
      onClick={onOpenIssueModal}
      disabled={!caActive}
      className={`px-4 py-2.5 text-xs rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${extra} ${
        caActive
          ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
      }`}
    >
      <Plus className="w-4 h-4" />
      <span>Issue Certificate</span>
    </button>
  );

  const caIndicator = (
    <div className="flex items-center gap-2">
      <span className="relative flex w-2 h-2">
        {caActive && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
        )}
        <span className={`relative inline-flex w-2 h-2 rounded-full ${caActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      </span>
      <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${caActive ? 'text-emerald-400' : 'text-amber-400'}`}>
        {caActive ? 'CA online' : 'No root CA'}
      </span>
    </div>
  );

  return (
    <>
      {/* ---------- Desktop rail ---------- */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-slate-800 bg-slate-950/90 backdrop-blur-md">
        {/* Brand */}
        <div className="px-5 pt-6 pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <BrandMark className="w-9 h-9 text-emerald-400 shrink-0" />
            <div className="leading-tight">
              <div className="font-display text-[15px] font-semibold text-white tracking-tight">
                Pro mTLS
              </div>
              <div className="kicker">Private CA console</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          <div className="kicker px-3 pb-2">Workspace</div>
          {NAV.map(({ id, label, icon: Icon }, i) => {
            const active = isActive(id, activeTab);
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white border border-slate-800'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                {active && <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r bg-emerald-400" />}
                <span className={`font-mono text-[10px] tabular-nums ${active ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-500'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : ''}`} />
                <span className="font-medium">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer of rail */}
        <div className="px-5 py-5 border-t border-slate-800 space-y-4">
          {caIndicator}
          {issueButton('w-full')}
          {authEnabled && onLogout && (
            <button
              onClick={onLogout}
              title="Lock Dashboard"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock dashboard</span>
            </button>
          )}
        </div>
      </aside>

      {/* ---------- Mobile bar ---------- */}
      <header className="md:hidden sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandMark className="w-7 h-7 text-emerald-400 shrink-0" />
            <div className="leading-tight min-w-0">
              <div className="font-display text-sm font-semibold text-white">Pro mTLS</div>
              {caIndicator}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {authEnabled && onLogout && (
              <button
                onClick={onLogout}
                title="Lock Dashboard"
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
            {issueButton('px-3! py-2!')}
          </div>
        </div>

        <div className="flex items-center overflow-x-auto px-3 pb-2 gap-1 scrollbar-none">
          {NAV.map(({ id, short }) => {
            const active = isActive(id, activeTab);
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 border ${
                  active
                    ? 'bg-slate-900 text-white border-slate-700'
                    : 'text-slate-400 border-transparent'
                }`}
              >
                {short}
              </button>
            );
          })}
        </div>
      </header>
    </>
  );
};
