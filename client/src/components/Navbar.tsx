import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, LogOut, Menu, X } from "lucide-react";
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

  const roleBadgeClass =
    user?.role === "ADMIN"
      ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
      : user?.role === "OWNER"
      ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
      : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";

  return (
    <nav className="border-b border-vault-800/80 bg-vault-950/95 backdrop-blur-xl sticky top-0 z-50 px-4 lg:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
        {/* Left: Mobile hamburger (if logged in) + Logo */}
        <div className="flex items-center gap-3">
          {user && onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="p-2 -ml-1 text-slate-400 hover:text-white rounded-lg md:hidden hover:bg-vault-850 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-vault-600 to-vault-800 border border-vault-600/60 flex items-center justify-center shadow-lg group-hover:shadow-vault-500/20 transition-shadow">
              <Shield className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-[17px] font-bold tracking-tight text-white">
                Trust<span className="text-vault-400">Vault</span>
              </span>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5 hidden sm:block">
                Zero-Trust Document Platform
              </p>
            </div>
          </Link>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {user ? (
            <>
              {/* User badge */}
              <div className="flex items-center gap-2 bg-vault-900 border border-vault-800 px-2.5 py-1.5 rounded-xl">
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${roleBadgeClass}`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-none">{user.name}</div>
                  <div className={`text-[10px] font-mono mt-0.5 ${roleBadgeClass} rounded px-1 inline-block border`}>
                    {user.role}
                  </div>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs text-slate-400 hover:text-rose-300 bg-vault-900 hover:bg-rose-950/40 border border-vault-800 hover:border-rose-800/60 rounded-xl transition-all duration-150"
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
                className="text-xs font-semibold px-3 sm:px-4 py-2 text-slate-200 hover:text-white bg-vault-900 hover:bg-vault-800 border border-vault-700 rounded-xl transition-all duration-150"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-xs font-semibold px-3 sm:px-4 py-2 bg-vault-500 hover:bg-vault-400 text-white rounded-xl transition-all duration-150 shadow-md hover:shadow-vault-500/30"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
