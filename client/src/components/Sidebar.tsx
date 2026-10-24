import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderLock,
  Share2,
  Upload,
  Activity,
  ShieldCheck,
  ChevronRight,
  X,
  Shield,
  FileText,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  onOpenUpload?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenUpload, isOpen = false, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  const mainNav: NavItem[] = [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    ...(user.role === "OWNER" || user.role === "ADMIN"
      ? [{ label: "My Documents", to: "/documents/my", icon: FolderLock }]
      : []),
    { label: "Shared with Me", to: "/documents/shared", icon: Share2 },
  ];

  const adminNav: NavItem[] = [
    { label: "Security Console", to: "/admin", icon: ShieldCheck },
    { label: "Audit Explorer", to: "/admin/audit", icon: Activity },
  ];

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const renderLink = (item: NavItem, isAdmin = false) => {
    const Icon = item.icon;
    const active = isActive(item.to);
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={handleLinkClick}
        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
          active
            ? "bg-indigo-600 text-white font-semibold shadow-sm"
            : "text-slate-400 hover:text-white hover:bg-slate-800/60"
        }`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
        <span className="flex-1">{item.label}</span>
        {active && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-4 bg-[#0F172A] text-slate-100">
      <div className="space-y-5">
        {/* Logo / Header */}
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">
                Trust<span className="text-indigo-400">Vault</span>
              </span>
              <span className="text-[10px] text-slate-400 block -mt-1 font-normal">
                Enterprise Security
              </span>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg md:hidden hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Action Button for Owner/Admin */}
        {(user.role === "OWNER" || user.role === "ADMIN") && onOpenUpload && (
          <div className="pt-1">
            <button
              onClick={() => {
                if (onClose) onClose();
                onOpenUpload();
              }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all duration-150 active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        )}

        {/* Navigation list */}
        <div className="space-y-1">
          <div className="px-3 pb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Workspace
            </span>
          </div>
          {mainNav.map((item) => renderLink(item))}
        </div>

        {/* Admin section for admin role */}
        {user.role === "ADMIN" && (
          <div className="pt-3 border-t border-slate-800 space-y-1">
            <div className="px-3 pb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                Governance
              </span>
            </div>
            {adminNav.map((item) => renderLink(item, true))}
          </div>
        )}
      </div>

      {/* Bottom User status card */}
      <div className="pt-4 border-t border-slate-800">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">{user.name}</div>
            <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
          </div>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              user.role === "ADMIN" ? "bg-purple-400" : "bg-emerald-400"
            }`}
            title={`Role: ${user.role}`}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static navy sidebar */}
      <aside className="hidden md:flex w-64 bg-[#0F172A] border-r border-slate-800 flex-col min-h-screen shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer with backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
          <div className="fixed inset-y-0 left-0 w-64 bg-[#0F172A] shadow-2xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
