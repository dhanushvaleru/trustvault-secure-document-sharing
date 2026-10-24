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
        className={`sidebar-link ${
          active
            ? isAdmin
              ? "bg-purple-900/30 text-purple-200 border border-purple-800/60 shadow-sm"
              : "sidebar-link-active"
            : isAdmin
            ? "text-slate-400 hover:text-purple-200 hover:bg-purple-900/20"
            : "sidebar-link-inactive"
        }`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${active && isAdmin ? "text-purple-400" : isAdmin ? "text-purple-500" : ""}`} />
        <span className="flex-1">{item.label}</span>
        {active && <ChevronRight className="w-3 h-3 opacity-50" />}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-3">
      <div className="space-y-1">
        {/* Mobile Header with close button */}
        <div className="flex items-center justify-between px-3 py-2 md:hidden border-b border-vault-800/60 mb-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Navigation</span>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload button */}
        {(user.role === "OWNER" || user.role === "ADMIN") && onOpenUpload && (
          <div className="mb-4">
            <button
              onClick={() => {
                if (onClose) onClose();
                onOpenUpload();
              }}
              className="w-full flex items-center justify-center gap-2 bg-vault-500 hover:bg-vault-400 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-md hover:shadow-vault-500/30 transition-all duration-150 active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        )}

        {/* Section label */}
        <div className="px-3 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Navigation
          </span>
        </div>

        {/* Main nav */}
        {mainNav.map((item) => renderLink(item))}

        {/* Admin section */}
        {user.role === "ADMIN" && (
          <div className="pt-4 mt-2 border-t border-vault-800/60">
            <div className="px-3 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-600">
                Administration
              </span>
            </div>
            {adminNav.map((item) => renderLink(item, true))}
          </div>
        )}
      </div>

      {/* Bottom status card */}
      <div className="p-2 border-t border-vault-800/60">
        <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[11px] font-semibold text-emerald-300">Chain Protected</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            SHA-256 tamper-evident audit trail active
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:flex w-60 border-r border-vault-800/80 bg-vault-950/80 flex-col min-h-[calc(100vh-64px)] shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer with backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-64 bg-vault-950 border-r border-vault-800 shadow-2xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
