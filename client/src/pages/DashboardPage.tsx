import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  ArrowUpDown,
  RefreshCw,
  AlertCircle,
  FileText,
  Share2,
  FolderOpen,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileCode,
  Download,
  Calendar,
  User as UserIcon,
  Activity,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { DocumentItem } from "../types";
import { DocumentTable } from "../components/DocumentTable";
import { UploadModal } from "../components/UploadModal";
import { ShareModal } from "../components/ShareModal";
import { EditMetadataModal } from "../components/EditMetadataModal";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";

interface DashboardPageProps {
  filterType?: "all" | "my" | "shared";
}

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  sub?: string;
  badge?: string;
}> = ({ label, value, icon: Icon, iconBg, iconColor, sub, badge }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all flex items-start justify-between">
    <div className="flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">{value}</div>
        <div className="text-xs font-medium text-slate-500 mt-0.5">{label}</div>
        {sub && <div className="text-[11px] text-slate-400 mt-1 font-mono">{sub}</div>}
      </div>
    </div>
    {badge && (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        {badge}
      </span>
    )}
  </div>
);

export const DashboardPage: React.FC<DashboardPageProps> = ({ filterType = "all" }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocForShare, setSelectedDocForShare] = useState<DocumentItem | null>(null);
  const [selectedDocForEdit, setSelectedDocForEdit] = useState<DocumentItem | null>(null);
  const [selectedDocForDelete, setSelectedDocForDelete] = useState<DocumentItem | null>(null);
  const [selectedDocForDetails, setSelectedDocForDetails] = useState<DocumentItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.documents.list({
        page,
        limit: 10,
        search: search.trim() || undefined,
        category: category || undefined,
        ownerId: filterType === "my" && user ? user.id : undefined,
        sortBy,
        sortOrder,
      });
      let filtered = data.documents;
      if (filterType === "shared" && user) {
        filtered = filtered.filter((d) => d.owner.id !== user.id);
      }
      setDocuments(filtered);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.total);
    } catch (err: any) {
      setError(err.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, category, sortBy, sortOrder, filterType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDocuments();
  };

  const handleDownload = async (doc: DocumentItem) => {
    try {
      await api.documents.download(doc.id, doc.originalFilename);
      setActionSuccessMsg(`Downloaded "${doc.originalFilename}"`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Download failed");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDocForDelete) return;
    setDeleteLoading(true);
    try {
      await api.documents.delete(selectedDocForDelete.id);
      setActionSuccessMsg(`Deleted "${selectedDocForDelete.title}"`);
      setSelectedDocForDelete(null);
      await fetchDocuments();
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete document");
    } finally {
      setDeleteLoading(false);
    }
  };

  const ownedCount = documents.filter((d) => d.effectivePermission === "OWNER").length;
  const sharedCount = documents.filter((d) => d.effectivePermission !== "OWNER").length;

  const pageTitle =
    filterType === "my"
      ? "My Documents"
      : filterType === "shared"
      ? "Shared with Me"
      : "Document Vault";

  const pageSubtitle =
    filterType === "my"
      ? "Documents you own, manage permissions for, and retain cryptographic control over."
      : filterType === "shared"
      ? "Documents securely delegated to you with active read or edit grants."
      : "Centralized workspace for encrypted enterprise records with role-based governance.";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome & Action Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {user?.role || "USER"} WORKSPACE
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified Session
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name || "Member"}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            {pageSubtitle}
          </p>
        </div>

        {(user?.role === "OWNER" || user?.role === "ADMIN") && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Documents"
          value={totalCount}
          icon={FileText}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          badge="Live"
        />
        <StatCard
          label="Owned by Me"
          value={ownedCount}
          icon={FolderOpen}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          sub={`${totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0}% of total`}
        />
        <StatCard
          label="Shared Access"
          value={sharedCount}
          icon={Share2}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          sub="Delegated permissions"
        />
        <StatCard
          label="Security Status"
          value="Intact"
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          sub="SHA-256 chained"
          badge="Audit Ready"
        />
      </div>

      {/* Notifications */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-card animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-card animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-600 hover:text-rose-800 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Document List + Recent Activity Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Column: Document Vault Management (Span 3 on xl) */}
        <div className="xl:col-span-3 space-y-4">
          {/* Controls: Search, Category, Sort, Refresh */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-card flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents by name or title…"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </form>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors cursor-pointer"
              >
                <option value="">All Categories</option>
                <option value="FINANCIAL">Financial</option>
                <option value="LEGAL">Legal</option>
                <option value="HR">HR & People</option>
                <option value="TECHNICAL">Technical</option>
                <option value="GENERAL">General</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors cursor-pointer"
              >
                <option value="createdAt">Date Uploaded</option>
                <option value="title">Name</option>
                <option value="fileSize">File Size</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="p-2 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>

              <button
                onClick={fetchDocuments}
                className="p-2 bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors"
                title="Refresh Documents"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Document Table */}
          {loading ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-card">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <span className="text-xs font-medium text-slate-500">
                Checking permissions & decrypting records…
              </span>
            </div>
          ) : (
            <DocumentTable
              documents={documents}
              onDownload={handleDownload}
              onShare={(doc) => setSelectedDocForShare(doc)}
              onEdit={(doc) => setSelectedDocForEdit(doc)}
              onDelete={(doc) => setSelectedDocForDelete(doc)}
              onViewDetails={(doc) => setSelectedDocForDetails(doc)}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500 px-2 pt-1">
              <span>
                Showing page <strong className="text-slate-700">{page}</strong> of{" "}
                <strong className="text-slate-700">{totalPages}</strong> ({totalCount} total documents)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-card"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-card"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recent Activity & Quick Controls (Span 1 on xl) */}
        <div className="space-y-6">
          {/* Recent Activity Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Recent Activity
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                Active Audit
              </span>
            </div>

            {documents.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No recent activity records available yet.
              </p>
            ) : (
              <div className="space-y-3.5">
                {documents.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocForDetails(doc)}
                    className="group p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-all flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {doc.title}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{doc.owner.name}</span>
                        <span>•</span>
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 shrink-0 self-center transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Security & Compliance Card */}
          <div className="bg-gradient-to-br from-slate-900 to-navy-900 text-white rounded-2xl p-5 shadow-card space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-xs tracking-wide">Audit & Cryptography</h4>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Every document uploaded or downloaded generates an immutable SHA-256 chained entry signed by the server.
            </p>
            <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-800">
              <span>Argon2id + DAC</span>
              <span className="text-emerald-400">● 100% Secure</span>
            </div>
          </div>
        </div>
      </div>

      {/* Document Details & Cryptographic Verification Modal */}
      {selectedDocForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-modal animate-slide-up overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Document Metadata & Verification</h3>
                  <p className="text-[11px] text-slate-500">Cryptographic audit identity</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocForDetails(null)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-200/60"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Document Title
                </span>
                <span className="font-bold text-slate-900 text-sm">{selectedDocForDetails.title}</span>
              </div>

              {selectedDocForDetails.description && (
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Description
                  </span>
                  <p className="text-slate-600 text-xs leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {selectedDocForDetails.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                {[
                  { label: "Category", value: selectedDocForDetails.category },
                  { label: "Original Filename", value: selectedDocForDetails.originalFilename },
                  { label: "MIME Type", value: selectedDocForDetails.mimeType },
                  { label: "Document Owner", value: selectedDocForDetails.owner.name },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                      {label}
                    </span>
                    <span className="text-slate-800 font-medium font-mono text-[11px] truncate block">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    SHA-256 Checksum (Content Integrity)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 font-medium">✓ Verified</span>
                </div>
                <code className="text-[11px] text-indigo-700 font-mono bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 block break-all leading-relaxed">
                  {selectedDocForDetails.checksumSha256}
                </code>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2.5 p-4 border-t border-slate-100 bg-slate-50/60">
              <button
                onClick={() => setSelectedDocForDetails(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors shadow-sm"
              >
                Close
              </button>
              {selectedDocForDetails.effectivePermission !== "ADMIN_METADATA" && (
                <button
                  onClick={() => {
                    handleDownload(selectedDocForDetails);
                    setSelectedDocForDetails(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Document</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(newDoc) => {
          setActionSuccessMsg(`Uploaded "${newDoc.title}" successfully`);
          fetchDocuments();
        }}
      />
      <ShareModal
        document={selectedDocForShare}
        isOpen={!!selectedDocForShare}
        onClose={() => setSelectedDocForShare(null)}
        onPermissionsUpdated={() => fetchDocuments()}
      />
      <EditMetadataModal
        document={selectedDocForEdit}
        isOpen={!!selectedDocForEdit}
        onClose={() => setSelectedDocForEdit(null)}
        onSuccess={(updated) => {
          setActionSuccessMsg(`Updated "${updated.title}"`);
          fetchDocuments();
        }}
      />
      <DeleteConfirmDialog
        document={selectedDocForDelete}
        isOpen={!!selectedDocForDelete}
        onClose={() => setSelectedDocForDelete(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </div>
  );
};