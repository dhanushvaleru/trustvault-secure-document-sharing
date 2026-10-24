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
  SlidersHorizontal,
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
  color: string;
  sub?: string;
}> = ({ label, value, icon: Icon, color, sub }) => (
  <div className="bg-vault-900 border border-vault-800 rounded-2xl p-5 flex items-start gap-4">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="text-2xl font-bold text-white leading-none mb-1">{value}</div>
      <div className="text-xs font-medium text-slate-400">{label}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
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
    setLoading(true); setError(null);
    try {
      const data = await api.documents.list({
        page, limit: 10,
        search: search.trim() || undefined,
        category: category || undefined,
        ownerId: filterType === "my" && user ? user.id : undefined,
        sortBy, sortOrder,
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

  useEffect(() => { fetchDocuments(); }, [page, category, sortBy, sortOrder, filterType]);

  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchDocuments(); };

  const handleDownload = async (doc: DocumentItem) => {
    try {
      await api.documents.download(doc.id, doc.originalFilename);
      setActionSuccessMsg(`Downloaded "${doc.originalFilename}"`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: any) { setError(err.message || "Download failed"); }
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
    } finally { setDeleteLoading(false); }
  };

  const ownedCount = documents.filter((d) => d.effectivePermission === "OWNER").length;
  const sharedCount = documents.filter((d) => d.effectivePermission !== "OWNER").length;

  const pageTitle =
    filterType === "my" ? "My Documents"
    : filterType === "shared" ? "Shared with Me"
    : "Document Vault";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{pageTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {filterType === "my"
              ? "Documents you own and control"
              : filterType === "shared"
              ? "Documents others have shared with your account"
              : "All documents you are authorized to access"}
          </p>
        </div>
        {(user?.role === "OWNER" || user?.role === "ADMIN") && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 bg-vault-500 hover:bg-vault-400 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-md hover:shadow-vault-500/20 transition-all duration-150 active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Stats row */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Visible" value={totalCount} icon={FileText} color="bg-vault-800 text-vault-300" />
          <StatCard label="Owned by Me" value={ownedCount} icon={FolderOpen} color="bg-blue-950/70 text-blue-300" />
          <StatCard label="Shared Access" value={sharedCount} icon={Share2} color="bg-emerald-950/70 text-emerald-300" />
          <StatCard label="Current Page" value={`${page}/${totalPages}`} icon={CheckCircle2} color="bg-amber-950/70 text-amber-300" sub="Use pagination below" />
        </div>
      )}

      {/* Notifications */}
      {actionSuccessMsg && (
        <div className="bg-emerald-950/50 border border-emerald-800/70 text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-300">✕</button>
        </div>
      )}
      {error && (
        <div className="bg-rose-950/50 border border-rose-800/70 text-rose-300 px-4 py-3 rounded-xl text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-300">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by document name…"
            className="input-field pl-10 pr-4 py-2.5 text-xs"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="bg-vault-900 border border-vault-700 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-vault-500 transition-colors"
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
            className="bg-vault-900 border border-vault-700 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-vault-500 transition-colors"
          >
            <option value="createdAt">Date Uploaded</option>
            <option value="title">Name</option>
            <option value="fileSize">File Size</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="p-2.5 bg-vault-900 border border-vault-700 text-slate-400 hover:text-white rounded-xl transition-colors"
            title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>

          <button
            onClick={fetchDocuments}
            className="p-2.5 bg-vault-900 border border-vault-700 text-slate-400 hover:text-vault-300 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Document table */}
      {loading ? (
        <div className="text-center py-20 bg-vault-900/50 rounded-2xl border border-vault-800">
          <div className="w-8 h-8 border-2 border-vault-700 border-t-vault-400 rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs text-slate-500">Validating permissions & loading…</span>
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
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>Page {page} of {totalPages} ({totalCount} documents)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 bg-vault-900 border border-vault-800 rounded-xl text-slate-300 disabled:opacity-40 hover:bg-vault-800 transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 bg-vault-900 border border-vault-800 rounded-xl text-slate-300 disabled:opacity-40 hover:bg-vault-800 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Document Details Modal */}
      {selectedDocForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-vault-900 border border-vault-700 rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-vault-800 p-5">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-vault-400" />
                <h3 className="font-semibold text-white">Document Metadata & Verification</h3>
              </div>
              <button onClick={() => setSelectedDocForDetails(null)} className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-vault-800">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Title</span>
                <span className="font-semibold text-white text-sm">{selectedDocForDetails.title}</span>
              </div>
              {selectedDocForDetails.description && (
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Description</span>
                  <span className="text-slate-300">{selectedDocForDetails.description}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 bg-vault-850/80 border border-vault-800 rounded-xl p-4">
                {[
                  { label: "Category", value: selectedDocForDetails.category },
                  { label: "Filename", value: selectedDocForDetails.originalFilename },
                  { label: "MIME Type", value: selectedDocForDetails.mimeType },
                  { label: "Owner", value: selectedDocForDetails.owner.name },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">{label}</span>
                    <span className="text-slate-200 font-medium font-mono text-[11px] truncate block">{value}</span>
                  </div>
                ))}
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">SHA-256 Checksum</span>
                <code className="text-[11px] text-vault-300 font-mono bg-vault-950 p-3 rounded-xl border border-vault-800 block break-all leading-relaxed">
                  {selectedDocForDetails.checksumSha256}
                </code>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-vault-800">
              {selectedDocForDetails.effectivePermission !== "ADMIN_METADATA" && (
                <button
                  onClick={() => { handleDownload(selectedDocForDetails); setSelectedDocForDetails(null); }}
                  className="px-4 py-2 bg-vault-500 hover:bg-vault-400 text-white rounded-xl text-xs font-semibold shadow transition-all"
                >
                  Download File
                </button>
              )}
              <button
                onClick={() => setSelectedDocForDetails(null)}
                className="px-4 py-2 bg-vault-800 hover:bg-vault-700 text-slate-300 rounded-xl text-xs font-medium border border-vault-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(newDoc) => { setActionSuccessMsg(`Uploaded "${newDoc.title}" successfully`); fetchDocuments(); }}
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
        onSuccess={(updated) => { setActionSuccessMsg(`Updated "${updated.title}"`); fetchDocuments(); }}
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
