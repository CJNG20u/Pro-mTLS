import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Shield, KeyRound, Server, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { CaDetails, StoredClientCert, AuthStatus, SystemConfig } from './types.ts';
import { api } from './services/api.ts';
import { TopBar } from './components/TopBar.tsx';
import { CaStatusCard } from './components/CaStatusCard.tsx';
import { CaInitModal } from './components/CaInitModal.tsx';
import { IssueCertModal } from './components/IssueCertModal.tsx';
import { CertList } from './components/CertList.tsx';
import { CaddySyncPanel } from './components/CaddySyncPanel.tsx';
import { CrlPanel } from './components/CrlPanel.tsx';
import { SettingsPanel } from './components/SettingsPanel.tsx';
import { InstallGuideModal } from './components/InstallGuideModal.tsx';
import { AuthLockScreen } from './components/AuthLockScreen.tsx';
import { BrandMark } from './components/BrandMark.tsx';

const PAGE_TITLES: Record<string, { kicker: string; title: string; blurb: string }> = {
  dashboard: { kicker: '01 / Authority', title: 'Certificates & CA', blurb: 'Your private root, the identities it has signed, and their state.' },
  certificates: { kicker: '01 / Authority', title: 'Certificates & CA', blurb: 'Your private root, the identities it has signed, and their state.' },
  caddy: { kicker: '02 / Distribution', title: 'Server Sync', blurb: 'Push the CA and revocation list to your Caddy server over SSH.' },
  crl: { kicker: '03 / Revocation', title: 'CRL & Trust', blurb: 'The published certificate revocation list and trust material.' },
  settings: { kicker: '04 / System', title: 'Settings', blurb: 'Dashboard access and application preferences.' },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'certificates' | 'caddy' | 'crl' | 'settings'>('dashboard');
  const [ca, setCa] = useState<CaDetails | null>(null);
  const [certs, setCerts] = useState<StoredClientCert[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ authEnabled: true, authenticated: false });
  const [loading, setLoading] = useState(true);

  // Modals
  const [isInitCaOpen, setIsInitCaOpen] = useState(false);
  const [isIssueCertOpen, setIsIssueCertOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const loadData = useCallback(async () => {
    try {
      const auth = await api.getAuthStatus();
      setAuthStatus(auth);

      if (auth.authenticated) {
        const [caData, certsData, sysCfg] = await Promise.all([
          api.getCaDetails(),
          api.getCertificates(),
          api.getSystemConfig(),
        ]);
        setCa(caData);
        setCerts(certsData);
        setSystemConfig(sysCfg);
      }
    } catch (e: any) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleUnauthorized = () => {
      setAuthStatus((prev) => ({ ...prev, authenticated: false }));
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, [loadData]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // the cookie may already be invalid; lock the screen regardless
    }
    setAuthStatus((prev) => ({ ...prev, authenticated: false }));
    showToast('Logged out of dashboard', 'info');
  };

  const handleCaSuccess = (newCa: CaDetails) => {
    setCa(newCa);
    showToast(`Root CA "${newCa.commonName}" initialized successfully!`, 'success');
    loadData();
  };

  const handleCertIssued = (newCert: StoredClientCert) => {
    showToast(`Client certificate for "${newCert.personalizedName}" issued!`, 'success');
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <BrandMark className="w-12 h-12 text-emerald-400 animate-pulse mb-4" />
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          <span className="kicker text-slate-400!">Starting Pro mTLS Manager</span>
        </div>
      </div>
    );
  }

  // First run (no account yet) or not signed in
  if (authStatus.authEnabled && (authStatus.setupRequired || !authStatus.authenticated)) {
    return (
      <AuthLockScreen
        mode={authStatus.setupRequired ? 'setup' : authStatus.legacyPassword ? 'legacy' : 'login'}
        minPasswordLength={authStatus.minPasswordLength ?? 10}
        onAuthenticated={() => {
          setLoading(true);
          void loadData();
        }}
      />
    );
  }

  const caActive = ca?.status === 'active';
  const page = PAGE_TITLES[activeTab];

  return (
    <div className="min-h-screen text-slate-100 flex flex-col md:pl-64">
      {/* Top Bar strictly matching contract */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenIssueModal={() => setIsIssueCertOpen(true)}
        caActive={caActive}
        authEnabled={authStatus.authEnabled}
        onLogout={handleLogout}
      />

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 transition-all transform animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`pl-3 pr-4 py-3 rounded-lg shadow-2xl border border-l-4 text-xs font-medium flex items-center gap-2.5 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/40 text-rose-300'
                : 'bg-slate-900/95 border-slate-700 text-slate-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-10 space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-1 pb-5 border-b border-slate-800/80">
          <span className="kicker text-emerald-400!">{page.kicker}</span>
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">{page.title}</h1>
          <p className="text-sm text-slate-400">{page.blurb}</p>
        </div>

        {/* Missing CA Warning Banner if on certificates or caddy tab */}
        {!caActive && activeTab !== 'dashboard' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-semibold block text-white">Root Certificate Authority not initialized</span>
                <span>You must generate an internal Root CA before issuing certificates or syncing with Caddy.</span>
              </div>
            </div>
            <button
              onClick={() => setIsInitCaOpen(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              Initialize CA Now
            </button>
          </div>
        )}

        {/* Primary View: Root CA Overview + Client Certificates */}
        {(activeTab === 'dashboard' || activeTab === 'certificates') && (
          <div className="space-y-6">
            <CaStatusCard
              ca={ca}
              onOpenInitModal={() => setIsInitCaOpen(true)}
              onOpenIssueModal={() => setIsIssueCertOpen(true)}
              onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
            />

            {caActive && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-emerald-400" />
                      <span>Client Certificates ({certs.length})</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Active identity certificates, .p12 bundles, expiration tracking, and revocation controls.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsIssueCertOpen(true)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Issue Certificate</span>
                  </button>
                </div>

                <CertList
                  certs={certs}
                  onOpenIssueModal={() => setIsIssueCertOpen(true)}
                  onRefresh={loadData}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Caddy Server Integration */}
        {activeTab === 'caddy' && (
          <CaddySyncPanel systemConfig={systemConfig} />
        )}

        {/* Tab 4: CRL & Trust */}
        {activeTab === 'crl' && (
          <CrlPanel />
        )}

        {/* Tab 5: Settings */}
        {activeTab === 'settings' && (
          <SettingsPanel
            authStatus={authStatus}
            onSignedOutEverywhere={() => setAuthStatus((prev) => ({ ...prev, authenticated: false }))}
            systemConfig={systemConfig}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandMark className="w-4 h-4 text-slate-500" />
            <span className="font-mono uppercase tracking-[0.14em] text-[10px] text-slate-400">Pro mTLS Manager</span>
            <span className="text-slate-700">/</span>
            <span>Private CA & mTLS console</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setIsInstallGuideOpen(true)}
              className="hover:text-slate-200 transition-colors"
            >
              Device Setup Guides
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab('caddy')}
              className="hover:text-slate-200 transition-colors"
            >
              Caddyfile Docs
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CaInitModal
        isOpen={isInitCaOpen}
        onClose={() => setIsInitCaOpen(false)}
        onSuccess={handleCaSuccess}
        existingCa={ca}
        systemConfig={systemConfig}
      />

      <IssueCertModal
        isOpen={isIssueCertOpen}
        onClose={() => setIsIssueCertOpen(false)}
        onSuccess={handleCertIssued}
        systemConfig={systemConfig}
        onOpenInstallGuide={() => {
          setIsIssueCertOpen(false);
          setIsInstallGuideOpen(true);
        }}
      />

      <InstallGuideModal
        isOpen={isInstallGuideOpen}
        onClose={() => setIsInstallGuideOpen(false)}
      />
    </div>
  );
}
