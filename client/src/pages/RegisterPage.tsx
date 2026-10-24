import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Lock, Mail, User as UserIcon, AlertCircle, CheckCircle, ArrowRight, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const passwordStrength = () => {
    let score = 0;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "bg-rose-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError("All fields are required"); return; }
    if (password.length < 10) { setError("Password must be at least 10 characters"); return; }
    setLoading(true); setError(null);
    try {
      await register(name.trim(), email.trim(), password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally { setLoading(false); }
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-vault-950 flex">
      {/* Left branding panel */}
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
              Start with full<br />
              <span className="text-vault-400">document control.</span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Owner accounts can upload, share, and revoke access. Every action is recorded in a tamper-evident audit trail.
            </p>
          </div>
          <div className="bg-vault-900 border border-vault-800 rounded-2xl p-5 space-y-3 text-xs">
            <div className="font-semibold text-white text-sm">New accounts get:</div>
            {[
              "Full document upload capability",
              "Granular permission management",
              "Private encrypted file storage",
              "Real-time audit trail coverage",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-slate-400">
                <CheckCircle className="w-3.5 h-3.5 text-vault-400 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">© 2024 TrustVault Platform</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12">
        <div className="w-full max-w-sm space-y-5">
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-vault-500 to-vault-700 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-base font-bold text-white">TrustVault</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
            <p className="text-sm text-slate-400">Register as an Owner to start managing documents</p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 text-rose-300 bg-rose-950/50 border border-rose-800/70 px-4 py-3 rounded-xl text-sm animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2.5 text-emerald-300 bg-emerald-950/50 border border-emerald-800/70 px-4 py-3 rounded-xl text-sm">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Account created! Redirecting to sign in…</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alice Cooper"
                  className="input-field pl-10 pr-4 py-3"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="input-field pl-10 pr-4 py-3"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 10 chars · uppercase · number · symbol"
                  className="input-field pl-10 pr-4 py-3"
                  required
                />
              </div>
              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= strength ? strengthColor[strength] : "bg-vault-800"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Strength: <span className="font-semibold text-slate-400">{strengthLabel[strength]}</span>
                    {strength < 4 && " — add uppercase, numbers, and symbols"}
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full flex items-center justify-center gap-2 py-3 bg-vault-500 hover:bg-vault-400 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-vault-500/30 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Account…
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500">
            Already registered?{" "}
            <Link to="/login" className="text-vault-400 hover:text-vault-300 font-semibold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
