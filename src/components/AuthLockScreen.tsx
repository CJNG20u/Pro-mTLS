import React, { useState } from 'react';
import { ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api.ts';
import { BrandMark } from './BrandMark.tsx';

interface AuthLockScreenProps {
  /** setup: first run, create the admin account. login: username + password.
   *  legacy: an older password-only login exists; the first sign-in upgrades it to an "admin" account. */
  mode: 'setup' | 'login' | 'legacy';
  minPasswordLength: number;
  onAuthenticated: () => void;
}

export const AuthLockScreen: React.FC<AuthLockScreenProps> = ({ mode, minPasswordLength, onAuthenticated }) => {
  const isSetup = mode === 'setup';
  const isLegacy = mode === 'legacy';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (isSetup) {
      if (password.length < minPasswordLength) {
        setError(`Password must be at least ${minPasswordLength} characters.`);
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSetup) {
        await api.setupAccount(username.trim(), password);
      } else {
        await api.login(isLegacy ? 'admin' : username.trim(), password);
      }
      onAuthenticated();
    } catch (err: any) {
      setError(err.message || 'Sign-in failed.');
      setPassword('');
      setConfirm('');
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-medium';

  const canSubmit = !loading && !!password && (isLegacy || !!username.trim());

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 border-t-2 border-t-emerald-400 rounded-2xl p-8 shadow-2xl">
        <BrandMark className="w-14 h-14 text-emerald-400 mx-auto mb-5" />

        <div className="text-center mb-6">
          <span className="kicker block mb-1">Private CA console</span>
          <h1 className="text-xl font-bold text-white tracking-tight">Pro mTLS Manager</h1>
          <p className="text-xs text-slate-400 mt-1">
            {isSetup
              ? 'Create your admin account. It protects your certificate authority and private keys.'
              : isLegacy
                ? 'Enter your dashboard password. It will be upgraded to a full account named "admin".'
                : 'Sign in to open your certificate authority.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg mb-4 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {!isLegacy && (
            <div>
              <label htmlFor="mtls-username" className="block text-xs font-medium text-slate-300 mb-1.5">
                Username
              </label>
              <input
                id="mtls-username"
                type="text"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label htmlFor="mtls-password" className="block text-xs font-medium text-slate-300 mb-1.5">
              {isLegacy ? 'Dashboard password' : 'Password'}
            </label>
            <div className="relative">
              <input
                id="mtls-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                autoFocus={isLegacy}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isSetup && (
              <p className="text-[11px] text-slate-500 mt-1">At least {minPasswordLength} characters.</p>
            )}
          </div>

          {isSetup && (
            <div>
              <label htmlFor="mtls-confirm" className="block text-xs font-medium text-slate-300 mb-1.5">
                Confirm password
              </label>
              <input
                id="mtls-confirm"
                type={showPassword ? 'text' : 'password'}
                name="confirm-password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isSetup ? 'Create account' : 'Sign in'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <span className="text-[11px] text-slate-500">
            Self-hosted Private Certificate Authority & Caddy mTLS Engine
          </span>
        </div>
      </div>
    </div>
  );
};
