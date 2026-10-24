import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Users,
  Key,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<Array<{ role: string; email: string; label: string }>>([]);
  const [defaultPassword, setDefaultPassword] = useState("Password123!");
  const [selectedRole, setSelectedRole] = useState<string>("");

  const { user, login } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to appropriate workspace
  useEffect(() => {
    if (user) {
      navigate(user.role === "ADMIN" ? "/admin" : "/dashboard", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    api.auth
      .getDemoAccounts()
      .then((data) => {
        setDemoAccounts(data.accounts);
        if (data.defaultDemoPassword) setDefaultPassword(data.defaultDemoPassword);
        // Default to Owner account for convenience
        const owner = data.accounts.find((a) => a.role === "OWNER") || data.accounts[0];
        if (owner) {
          setEmail(owner.email);
          setPassword(data.defaultDemoPassword || "Password123!");
          setSelectedRole(owner.role);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both work email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await login(email.trim(), password);
      navigate(loggedInUser.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoRole = (role: string, demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(defaultPassword);
    setSelectedRole(role);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between items-center px-4 py-8 sm:py-12 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top subtle badge */}
      <div className="w-full max-w-md flex items-center justify-between text-xs text-slate-500 mb-4 px-1">
        <div className="flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Online · SSL Secured</span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">TrustVault v2.4</span>
      </div>

      {/* Main Clean Card */}
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-card hover:shadow-card-hover transition-all space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-[#0F172A] items-center justify-center shadow-md mb-1">
            <Shield className="w-6 h-6 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
              Sign in to TrustVault
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Secure document sharing with cryptographic audit trail
            </p>
          </div>
        </div>

        {/* Quick Demo Role Switcher */}
        {demoAccounts.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 px-0.5">
              <span>Quick Demo Role:</span>
              <span className="text-[10px] text-indigo-600 font-mono">1-click fill</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {demoAccounts.map((acc) => {
                const isSelected = selectedRole === acc.role;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleSelectDemoRole(acc.role, acc.email)}
                    className={`p-2.5 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/10 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          acc.role === "ADMIN"
                            ? "bg-purple-100 text-purple-700"
                            : acc.role === "OWNER"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {acc.role}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-3 h-3 text-indigo-600 shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-900 truncate">
                      {acc.label.split(" ")[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="flex items-start gap-2.5 text-rose-800 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl text-xs animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSelectedRole("");
                }}
                placeholder="name@company.com"
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 block">
                Password
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Argon2id Encrypted</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-11 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-0.5"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying credentials…</span>
              </>
            ) : (
              <>
                <span>Sign In to Platform</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-100 text-center space-y-3">
          <p className="text-xs text-slate-500">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
            >
              Register as Owner
            </Link>
          </p>

          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-500" />
              Zero-Trust DAC
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              SHA-256 Ledger
            </span>
          </div>
        </div>
      </div>

      {/* Page bottom security footer */}
      <footer className="w-full max-w-md text-center text-[11px] text-slate-400 mt-6 space-y-1">
        <p>© 2025 TrustVault Platform — Defensive Security Architecture</p>
        <p className="text-[10px] text-slate-400 font-mono">
          Server reverse-proxy protected · HttpOnly Cookies
        </p>
      </footer>
    </div>
  );
};