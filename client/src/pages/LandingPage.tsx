import React from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Lock,
  KeyRound,
  History,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  FileText,
  Users,
  Activity,
  ChevronRight,
  Zap,
  Globe,
  Server,
} from "lucide-react";

const FeatureCard: React.FC<{
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  desc: string;
}> = ({ icon: Icon, iconColor, iconBg, title, desc }) => (
  <div className="group relative bg-vault-900 border border-vault-800 hover:border-vault-600 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl hover:shadow-vault-900/50">
    <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-4 shadow-sm`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
    <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
  </div>
);

const StatCard: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="text-center">
    <div className="text-3xl font-black text-white mb-1">{value}</div>
    <div className="text-xs text-slate-500">{label}</div>
  </div>
);

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-vault-950 text-slate-100 flex flex-col">
      {/* Top nav */}
      <header className="border-b border-vault-800/50 bg-vault-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-vault-500 to-vault-700 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[17px] font-bold text-white tracking-tight">
              Trust<span className="text-vault-400">Vault</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#security" className="text-sm text-slate-400 hover:text-white transition-colors">Security</a>
            <a href="#roles" className="text-sm text-slate-400 hover:text-white transition-colors">Access Control</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-sm font-medium px-4 py-2 text-slate-300 hover:text-white bg-vault-900 hover:bg-vault-800 border border-vault-700 rounded-xl transition-all duration-150"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold px-4 py-2 bg-vault-500 hover:bg-vault-400 text-white rounded-xl transition-all duration-150 shadow-md"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Gradient orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-vault-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-blue-600/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-28 text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 bg-vault-900 border border-vault-700/80 px-4 py-1.5 rounded-full text-xs font-medium text-vault-300 mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Cryptographic SHA-256 Hash-Chained Audit Trail
            <ChevronRight className="w-3 h-3" />
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white mb-6 leading-[1.05]">
            Your Documents.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-vault-400 to-blue-400">
              Your Rules.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Enterprise document management with granular access control, immediate revocation, and a
            verifiable audit trail that cannot be tampered with.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-vault-500 hover:bg-vault-400 text-white font-semibold text-sm rounded-xl shadow-lg hover:shadow-vault-500/30 transition-all duration-150 active:scale-[0.98]"
            >
              Start for Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-vault-900 hover:bg-vault-800 text-slate-200 font-semibold text-sm rounded-xl border border-vault-700 transition-all duration-150"
            >
              Sign In to Demo
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-8 max-w-sm mx-auto border-t border-vault-800/60 pt-10">
            <StatCard value="31" label="Security Tests" />
            <StatCard value="3" label="Role Tiers" />
            <StatCard value="100%" label="Chain Verified" />
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20 w-full">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-vault-400 mb-3 block">Features</span>
          <h2 className="text-3xl font-bold text-white mb-4">Defensive Security by Design</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            No public file URLs. No client-side authorization shortcuts. Every access decision is
            enforced on the server on every request.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FeatureCard
            icon={KeyRound}
            iconColor="text-vault-300"
            iconBg="bg-vault-800/80 border border-vault-700"
            title="Document-Level Access Control"
            desc="Every document evaluates permissions on every request. Administrators never inherit access to confidential files without an explicit grant."
          />
          <FeatureCard
            icon={AlertTriangle}
            iconColor="text-rose-300"
            iconBg="bg-rose-950/60 border border-rose-900/60"
            title="Immediate Revocation"
            desc="Revoking a user's grant terminates access instantly on database commit. No reliance on long-lived signed URLs or stale caches."
          />
          <FeatureCard
            icon={History}
            iconColor="text-emerald-300"
            iconBg="bg-emerald-950/60 border border-emerald-900/60"
            title="Tamper-Evident Audit Trail"
            desc="Events are chained: H[i] = SHA-256(event[i] + H[i-1]). Any modification or deletion of historical logs is instantly detected."
          />
          <FeatureCard
            icon={FileText}
            iconColor="text-blue-300"
            iconBg="bg-blue-950/60 border border-blue-900/60"
            title="Magic-Byte File Validation"
            desc="Files are validated against their actual byte signatures, not just filename extensions. Disguised executables are rejected at upload."
          />
          <FeatureCard
            icon={Lock}
            iconColor="text-amber-300"
            iconBg="bg-amber-950/60 border border-amber-900/60"
            title="Argon2id Password Security"
            desc="Passwords are hashed with Argon2id — the most resistant algorithm against GPU-based brute-force and side-channel attacks."
          />
          <FeatureCard
            icon={Server}
            iconColor="text-purple-300"
            iconBg="bg-purple-950/60 border border-purple-900/60"
            title="Private File Storage"
            desc="Documents are never served from public directories. All downloads are proxied through authenticated backend endpoints with full access checks."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="security" className="bg-vault-900/40 border-y border-vault-800/60 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-vault-400 mb-3 block">Architecture</span>
            <h2 className="text-3xl font-bold text-white mb-4">How TrustVault Works</h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              A separation of RBAC (role-based access control) and DAC (document-level access control) enforced at every layer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { n: "01", title: "Upload", desc: "File is validated via magic-byte signature, checksummed with SHA-256, and stored in a private directory inaccessible to the web." },
              { n: "02", title: "Control", desc: "Owner grants READ or EDIT permissions to specific registered users. Permissions can be revoked at any time with instant enforcement." },
              { n: "03", title: "Access", desc: "Every read, download, and modification checks server-side permissions in real-time. No data leaks through IDOR or enumeration." },
              { n: "04", title: "Audit", desc: "All security events are recorded in a cryptographic hash chain, enabling independent verification of log integrity." },
            ].map((step) => (
              <div key={step.n} className="relative bg-vault-900 border border-vault-800 rounded-2xl p-5">
                <div className="text-4xl font-black text-vault-800/80 font-mono mb-3">{step.n}</div>
                <h3 className="text-sm font-bold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles section */}
      <section id="roles" className="max-w-6xl mx-auto px-6 py-20 w-full">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-vault-400 mb-3 block">Access Control</span>
          <h2 className="text-3xl font-bold text-white mb-4">Three-Tier Role Architecture</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Roles define administrative capabilities. Document permissions control content access. They are always separate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Admin */}
          <div className="bg-vault-900 border border-purple-900/40 rounded-2xl p-6 space-y-4 hover:border-purple-700/60 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400">ADMIN Role</div>
                <h4 className="text-sm font-bold text-white">System Governance</h4>
              </div>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {[
                "Inspect full audit trail and verify hash chain integrity",
                "Deactivate compromised accounts and terminate sessions",
                "View system-wide metrics and security telemetry",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
              <li className="flex items-start gap-2 text-rose-400">
                <span className="shrink-0">✕</span>
                <span>Cannot read confidential document contents without explicit grant</span>
              </li>
            </ul>
          </div>

          {/* Owner */}
          <div className="bg-vault-900 border border-blue-900/40 rounded-2xl p-6 space-y-4 hover:border-blue-700/60 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-center">
                <FolderLock className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-blue-400">OWNER Role</div>
                <h4 className="text-sm font-bold text-white">Document Control</h4>
              </div>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {[
                "Upload documents with automatic magic-byte validation",
                "Grant READ or EDIT permissions to specific users",
                "Immediately revoke any active permission grant",
                "Delete owned documents and manage metadata",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Viewer */}
          <div className="bg-vault-900 border border-emerald-900/40 rounded-2xl p-6 space-y-4 hover:border-emerald-700/60 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">VIEWER Role</div>
                <h4 className="text-sm font-bold text-white">Least-Privilege Access</h4>
              </div>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {[
                "Access exclusively documents with an active, valid grant",
                "Download via authenticated backend proxy — no public URLs",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
              {[
                "Unshared documents return 404 — no metadata is ever leaked",
                "Cannot upload, grant permissions, or manage users",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-rose-400">
                  <span className="shrink-0">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-vault-800/60 py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to secure your documents?</h2>
          <p className="text-sm text-slate-400 mb-8">
            Sign in with one of the demo accounts to explore the full platform with real data and working security controls.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-vault-500 hover:bg-vault-400 text-white font-semibold text-sm rounded-xl shadow-lg hover:shadow-vault-500/30 transition-all duration-150"
          >
            Try the Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="mt-6 text-xs text-slate-500">
            Demo accounts: admin@trustvault.demo · owner@trustvault.demo · viewer@trustvault.demo<br />
            All with password: <code className="text-vault-300 font-mono">Password123!</code>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-vault-800/50 bg-vault-950 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-vault-800 border border-vault-700 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-vault-400" />
            </div>
            <span className="text-sm font-semibold text-slate-300">TrustVault Platform</span>
            <span className="text-xs text-slate-600">— Production-Grade Security</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <Link to="/login" className="hover:text-slate-300 transition-colors">Demo Login</Link>
            <Link to="/register" className="hover:text-slate-300 transition-colors">Register</Link>
            <a href="#security" className="hover:text-slate-300 transition-colors">Security Model</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Need to import FolderLock below
function FolderLock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M10 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v2.5" />
      <rect x="14" y="13" width="8" height="7" rx="1" />
      <path d="M16 13v-1a2 2 0 1 1 4 0v1" />
    </svg>
  );
}
