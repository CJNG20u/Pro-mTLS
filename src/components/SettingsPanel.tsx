import React, { useState } from 'react';
import { Lock, KeyRound, HardDrive, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../services/api.ts';
import { AuthStatus, SystemConfig } from '../types.ts';

interface SettingsPanelProps {
  authStatus: AuthStatus;
  /** Called after the server ended every session (including this one). */
  onSignedOutEverywhere: () => void;
  systemConfig?: SystemConfig | null;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ authStatus, onSignedOutEverywhere, systemConfig }) => {
  const dataDirDisplay = (systemConfig?.dataDir || './data').replace(/\/+$/, '');
  const minLength = authStatus.minPasswordLength ?? 10;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setMessage(null);

    if (newPassword.length < minLength) {
      setMessage({ type: 'error', text: `New password must be at least ${minLength} characters.` });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({
        type: 'success',
        text:
          res.otherSessionsSignedOut > 0
            ? `Password updated. ${res.otherSessionsSignedOut} other signed-in ${
                res.otherSessionsSignedOut === 1 ? 'device was' : 'devices were'
              } signed out.`
            : 'Password updated.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Could not change the password.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutEverywhere = async () => {
    if (loading) return;
    if (!window.confirm('Sign out of every device, including this one?')) return;
    setLoading(true);
    try {
      await api.logoutAll();
      onSignedOutEverywhere();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Could not sign out.' });
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Dashboard Security Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <span>Dashboard Security</span>
              {authStatus.authEnabled ? (
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  PROTECTED
                </span>
              ) : (
                <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  LOGIN OFF
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {authStatus.authEnabled ? (
                <>
                  Signed in as <span className="font-medium text-slate-200">{authStatus.username}</span>. Your CA private key and
                  every certificate are only reachable after signing in.
                </>
              ) : (
                <>
                  The login is turned off (<code className="font-mono text-amber-300">AUTH_DISABLED=true</code>). Anyone who can
                  reach this page can issue certificates and download keys. Remove that setting to require a sign-in.
                </>
              )}
            </p>
          </div>
        </div>

        {message && (
          <div
            role="status"
            className={`p-3 rounded-lg border text-xs mb-4 flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {authStatus.authEnabled && (
          <>
            <form onSubmit={handleChangePassword} className="space-y-3" noValidate>
              <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                Change password
              </h3>
              {/* Hidden username helps password managers attach the new password to the right account */}
              <input type="text" name="username" autoComplete="username" value={authStatus.username ?? ''} readOnly hidden />
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  type="password"
                  placeholder="Current password"
                  aria-label="Current password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="password"
                  placeholder="New password"
                  aria-label="New password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  aria-label="Confirm new password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Update password
                </button>
                <button
                  type="button"
                  onClick={() => void handleSignOutEverywhere()}
                  disabled={loading}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 text-slate-300 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                >
                  Sign out everywhere
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Changing your password signs out every other device. At least {minLength} characters.
              </p>
            </form>
          </>
        )}
      </div>

      {/* Persistent Storage Information */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <HardDrive className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Local PKI Persistent Storage</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          All cryptographic keys, certificates, CRL indexes, and Caddy configurations are stored locally in standard formats with strict file permissions:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 block font-mono text-[11px]">{dataDirDisplay}/ca/</span>
            <span className="text-slate-200 block font-medium mt-1">Root CA Trust Store</span>
            <span className="text-[11px] text-slate-500">Contains ca.crt (public) and ca.key (0600 private key).</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 block font-mono text-[11px]">{dataDirDisplay}/certs/</span>
            <span className="text-slate-200 block font-medium mt-1">Client Certs & .p12 Bundles</span>
            <span className="text-[11px] text-slate-500">Organized per certificate ID with bundle.p12 archives.</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 block font-mono text-[11px]">{dataDirDisplay}/crl/</span>
            <span className="text-slate-200 block font-medium mt-1">OpenSSL CRL Database</span>
            <span className="text-[11px] text-slate-500">RFC 5280 crl.pem, serial, crlnumber, and index.txt.</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 block font-mono text-[11px]">{dataDirDisplay}/config.json</span>
            <span className="text-slate-200 block font-medium mt-1">Caddy Sync & Security Config</span>
            <span className="text-[11px] text-slate-500">SSH host configurations and dashboard auth settings.</span>
          </div>

          {systemConfig?.crlOutputPath && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 sm:col-span-2">
              <span className="text-cyan-400 block font-mono text-[11px]">{systemConfig.crlOutputPath}</span>
              <span className="text-slate-200 block font-medium mt-1">Local CRL Export Target (CRL_OUTPUT_PATH)</span>
              <span className="text-[11px] text-slate-500">
                Automatically updated whenever a certificate is revoked. Reload command:{' '}
                <code className="font-mono text-slate-300">{systemConfig.caddyReloadCmd}</code>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
