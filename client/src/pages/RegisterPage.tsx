import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
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
    if (!name || !email || !password) {
      setError("All fields are required");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters long");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(name.trim(), email.trim(), password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try a different email.");
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between items-center px-4 py-8 sm:py-12 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top subtle badge */}
      <div className="w-full max-w-md flex items-center justify-between text-xs text-slate-500 mb-4 px-1">
        <div className="flex items-center gap-1.5 font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-full text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span>New Account Registration</span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">Owner Access</span>
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
              Create an Owner Account
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Start with complete document upload and permission delegation authority
            </p>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="flex items-start gap-2.5 text-rose-800 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl text-xs animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 rounded-xl text-xs animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">Account created successfully! Redirecting to sign in…</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alice Cooper"
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Master Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 10 chars · uppercase · number · symbol"
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"
                required
              />
            </div>

            {/* Password strength indicators */}
            {password.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        i <= strength ? strengthColor[strength] : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  Strength: <span className="font-semibold text-slate-700">{strengthLabel[strength]}</span>
                  {strength < 4 && " — include uppercase, numbers, and symbols"}
                </p>
              </div>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating Owner Account…</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-100 text-center space-y-3">
          <p className="text-xs text-slate-500">
            Already registered?{" "}
            <Link
              to="/login"
              className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
            >
              Sign In to Platform
            </Link>
          </p>

          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-500" />
              Argon2id Memory-Hard
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Owner Privileges
            </span>
          </div>
        </div>
      </div>

      {/* Page bottom footer */}
      <footer className="w-full max-w-md text-center text-[11px] text-slate-400 mt-6 space-y-1">
        <p>© 2025 TrustVault Platform — Defensive Security Architecture</p>
      </footer>
    </div>
  );
};