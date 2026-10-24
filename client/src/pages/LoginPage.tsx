import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Zap, CheckCircle2 } from "lucide-react";
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

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.auth.getDemoAccounts()
      .then((data) => {
        setDemoAccounts(data.accounts);
        if (data.defaultDemoPassword) setDefaultPassword(data.defaultDemoPassword);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await login(email.trim(), password);
      navigate(user.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const autofillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(defaultPassword);
    setError(null);
  };

  const roleBadge = (role: string) => {
    if (role === "ADMIN") return "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100";
    if (role === "OWNER") return "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100";
    return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel - Deep Navy Enterprise Branding (#0F172A) */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-[#0F172A] border-r border-slate-800 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">
              Trust<span className="text-indigo-400">Vault</span>
            </span>
            <span className="block text-[10px] font-mono text-slate-400 tracking-wider">
              ENTERPRISE SECURITY
            </span>
          </div>
        </div>

        <div className="space-y-8 my-auto py-8">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 mb-4">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              Cryptographic Trust Layer
            </span>
            <h2 className="text-4xl font-black text-white leading-tight mb-4 tracking-tight">
              Enterprise document<br />
              <span className="text-indigo-400">integrity & audit trail.</span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Every document is encrypted, permissions are governed by discretionary access controls, and all operations form a tamper-evident SHA-256 chained ledger.
            </p>
          </div>

          <div className="space-y-3.5">
            {[
              { icon: Shield, title: "Argon2id Session Security", desc: "Memory-hard password hashing with HttpOnly cookies" },
              { icon: Lock, title: "Zero-Trust Access Control", desc: "Granular owner-delegated READ and EDIT grants" },
              { icon: Zap, title: "Immutable Audit Chaining", desc: "HMAC-signed checkpoints verifiable by third parties" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{title}</div>
                  <div className="text-[11px] text-slate-400">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>© 2025 TrustVault Platform</span>
          <span className="text-emerald-400 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" /> SOC2 Type II Architecture
          </span>
        </div>
      </div>

      {/* Right panel - Clean White SaaS Card */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-card space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-base font-bold text-slate-900">TrustVault</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">Sign In to TrustVault</h1>
            <p className="text-xs text-slate-500">Enter your credentials to access your protected workspace</p>
          </div>

          {/* Error notification */}
          {error && (
            <div className="flex items-start gap-2.5 text-rose-800 bg-rose-50 border border-rose-200 px-4 py-3 rounded-xl text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-11 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          {demoAccounts.length > 0 && (
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  Quick Demo Accounts
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => autofillDemo(acc.email)}
                    className={`p-2.5 border rounded-xl text-center transition-all duration-150 active:scale-[0.98] ${roleBadge(
                      acc.role
                    )}`}
                  >
                    <div className="text-[11px] font-bold block">{acc.role}</div>
                    <div className="text-[10px] opacity-80 truncate">{acc.label}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                Demo password: <code className="text-slate-600 font-mono font-semibold">{defaultPassword}</code>
              </p>
            </div>
          )}

          <p className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Don't have an account?{" "}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
              Register as Owner
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};