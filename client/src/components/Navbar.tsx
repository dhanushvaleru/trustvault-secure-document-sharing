import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, LogOut, Menu, X, Bell, Search, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu, isMobileMenuOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const roleBadgeStyle =
    user?.role === "ADMIN"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : user?.role === "OWNER"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <header className="border-b border-[#E2E8F0] bg-[#FFFFFF] sticky top-0 z-30 px-4 lg:px-8 h-16 flex items-center justify-between">
      {/* Left: Mobile hamburger (if logged in) or Logo */}
      <div className="flex items-center gap-3">
        {user && onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="p-2 -ml-1 text-slate-500 hover:text-slate-900 rounded-lg md:hidden hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        {/* Brand logo shown on mobile or when logged out */}
        <Link to="/" className="flex items-center gap-2.5 md:hidden group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
            <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold text-slate-900 tracking-tight">
            Trust<span className="text-indigo-600">Vault</span>
          </span>
        </Link>

        {/* Security status indicator for desktop */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-[11px] font-medium text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>SHA-256 Audit Trail Active</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {user ? (
          <>
            {/* User details & role badge */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-900 leading-none">{user.name}</div>
                <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border mt-0.5 inline-block ${roleBadgeStyle}`}>
                  {user.role}
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-all duration-150"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-xs font-semibold px-4 py-2 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-xs font-semibold px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
