import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Zap } from "lucide-react";
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
    if (!email || !password) { setError("Email and password are required"); return; }
    setLoading(true); setError(null);
    try {
      const user = await login(email.trim(), password);
      navigate(user.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const autofillDemo = (demoEmail: string) => {
    setEmail(demoEmail); setPassword(defaultPassword); setError(null);
  };

  const roleBadge = (role: string) => {
    if (role === "ADMIN") return "border-purple-800/80 bg-purple-950/60 text-purple-300";
    if (role === "OWNER") return "border-blue-800/80 bg-blue-950/60 text-blue-300";
    return "border-emerald-800/80 bg-emerald-950/60 text-emerald-300";
  };

  return (
    <div className="min-h-screen bg-vault-950 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-vault-900/40 border-r border-vault-800/60 p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-vault-500 to-vault-700 flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            Trust<span className="text-vault-400">Vault</span>
          </span>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              Secure access to<br />
              <span className="text-vault-400">your documents.</span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Every login is server-side session authenticated with Argon2id password hashing and
              cryptographic audit logging.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: Shield, label: "Argon2id password hashing" },
              { icon: Lock, label: "HttpOnly, Secure session cookies" },
              { icon: Zap, label: "Tamper-evident SHA-256 audit chain" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-slate-400">
                <div className="w-7 h-7 rounded-lg bg-vault-800 border border-vault-700 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-vault-300" />
                </div>
                {label}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">© 2024 TrustVault Platform — Production-Grade Security</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-vault-500 to-vault-700 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-base font-bold text-white">TrustVault</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-sm text-slate-400">Sign in to your account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 text-rose-300 bg-rose-950/50 border border-rose-800/70 px-4 py-3 rounded-xl text-sm animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="input-field pl-10 pr-4 py-3"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-field pl-10 pr-11 py-3"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-vault-500 hover:bg-vault-400 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-vault-500/30 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Demo accounts */}
          {demoAccounts.length > 0 && (
            <div className="border-t border-vault-800 pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-vault-800" />
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Quick Demo</span>
                <div className="h-px flex-1 bg-vault-800" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => autofillDemo(acc.email)}
                    className={`p-2.5 border rounded-xl text-center transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${roleBadge(acc.role)}`}
                  >
                    <div className="text-[11px] font-bold block">{acc.role}</div>
                    <div className="text-[10px] opacity-70 truncate">{acc.label}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-600 text-center">
                Password: <code className="text-slate-500 font-mono">{defaultPassword}</code>
              </p>
            </div>
          )}

          <p className="text-center text-xs text-slate-500">
            Don't have an account?{" "}
            <Link to="/register" className="text-vault-400 hover:text-vault-300 font-semibold transition-colors">
              Register as Owner
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
