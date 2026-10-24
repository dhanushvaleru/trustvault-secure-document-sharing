import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderLock,
  Share2,
  Upload,
  Activity,
  ShieldCheck,
  Settings,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  onOpenUpload?: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenUpload }) => {
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

  const renderLink = (item: NavItem, isAdmin = false) => {
    const Icon = item.icon;
    const active = isActive(item.to);
    return (
      <Link
        key={item.to}
        to={item.to}
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

  return (
    <aside className="w-60 border-r border-vault-800/80 bg-vault-950/80 flex flex-col min-h-[calc(100vh-64px)] shrink-0">
      <div className="flex-1 px-3 py-4 space-y-1">
        {/* Upload button */}
        {(user.role === "OWNER" || user.role === "ADMIN") && onOpenUpload && (
          <div className="mb-4">
            <button
              onClick={onOpenUpload}
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
      <div className="p-3 border-t border-vault-800/60">
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
    </aside>
  );
};
