import React from "react";
import {
  FileText,
  Download,
  Share2,
  Edit2,
  Trash2,
  MoreHorizontal,
  FileLock2,
} from "lucide-react";
import { DocumentItem } from "../types";

interface DocumentTableProps {
  documents: DocumentItem[];
  onDownload: (doc: DocumentItem) => void;
  onShare: (doc: DocumentItem) => void;
  onEdit: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
  onViewDetails: (doc: DocumentItem) => void;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const categoryStyle: Record<string, string> = {
  FINANCIAL: "bg-emerald-950/60 text-emerald-300 border-emerald-800/70",
  LEGAL: "bg-amber-950/60 text-amber-300 border-amber-800/70",
  HR: "bg-sky-950/60 text-sky-300 border-sky-800/70",
  TECHNICAL: "bg-indigo-950/60 text-indigo-300 border-indigo-800/70",
  GENERAL: "bg-slate-800/60 text-slate-300 border-slate-700",
};

const permStyle: Record<string, string> = {
  OWNER: "bg-vault-800 text-vault-300 border-vault-700",
  EDIT: "bg-blue-950/60 text-blue-300 border-blue-800/70",
  READ: "bg-slate-800/60 text-slate-300 border-slate-700",
  ADMIN_METADATA: "bg-purple-950/60 text-purple-300 border-purple-800/70",
};

const permLabel: Record<string, string> = {
  OWNER: "Owner",
  EDIT: "Can Edit",
  READ: "Read Only",
  ADMIN_METADATA: "Admin View",
};

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  onDownload,
  onShare,
  onEdit,
  onDelete,
  onViewDetails,
}) => {
  if (documents.length === 0) {
    return (
      <div className="text-center py-20 bg-vault-900/50 rounded-2xl border border-vault-800 border-dashed">
        <FileLock2 className="w-12 h-12 text-vault-700 mx-auto mb-4" />
        <h4 className="text-sm font-semibold text-slate-300 mb-1">No documents found</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No files match your current filters, or no documents have been shared with your account.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-vault-800 bg-vault-900/60 shadow-xl">
      <table className="w-full text-left text-xs min-w-[700px]">
        <thead className="bg-vault-850/90 border-b border-vault-800 text-[10px] uppercase tracking-widest font-semibold text-slate-500">
          <tr>
            <th className="px-5 py-4 w-[35%]">Document</th>
            <th className="px-4 py-4">Category</th>
            <th className="px-4 py-4">Size</th>
            <th className="px-4 py-4">Owner</th>
            <th className="px-4 py-4">Access</th>
            <th className="px-4 py-4">Uploaded</th>
            <th className="px-5 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-vault-800/50">
          {documents.map((doc) => (
            <tr
              key={doc.id}
              className="hover:bg-vault-850/30 transition-colors duration-100 group cursor-pointer"
              onClick={() => onViewDetails(doc)}
            >
              {/* Document name + filename */}
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-vault-800/80 border border-vault-700/60 flex items-center justify-center text-vault-400 shrink-0 group-hover:border-vault-600 transition-colors">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 group-hover:text-vault-300 transition-colors truncate max-w-[200px]">
                      {doc.title}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px] mt-0.5">
                      {doc.originalFilename}
                    </div>
                  </div>
                </div>
              </td>

              {/* Category */}
              <td className="px-4 py-4">
                <span className={`badge ${categoryStyle[doc.category] || categoryStyle.GENERAL}`}>
                  {doc.category}
                </span>
              </td>

              {/* Size */}
              <td className="px-4 py-4 text-slate-500 font-mono">
                {formatBytes(doc.fileSize)}
              </td>

              {/* Owner */}
              <td className="px-4 py-4">
                <div className="font-medium text-slate-300">{doc.owner.name}</div>
                <div className="text-[10px] text-slate-600 font-mono">{doc.owner.email}</div>
              </td>

              {/* Access level */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-1.5">
                  <span className={`badge ${permStyle[doc.effectivePermission] || permStyle.READ}`}>
                    {permLabel[doc.effectivePermission] || doc.effectivePermission}
                  </span>
                  {doc.effectivePermission === "OWNER" && doc.activeSharesCount > 0 && (
                    <span className="text-[10px] text-vault-400 bg-vault-800 px-1.5 py-0.5 rounded border border-vault-700">
                      {doc.activeSharesCount} shared
                    </span>
                  )}
                </div>
              </td>

              {/* Date */}
              <td className="px-4 py-4 text-slate-500">
                {new Date(doc.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </td>

              {/* Actions */}
              <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.effectivePermission !== "ADMIN_METADATA" && (
                    <button
                      onClick={() => onDownload(doc)}
                      className="p-1.5 text-slate-500 hover:text-emerald-300 hover:bg-vault-800 rounded-lg transition-all"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {doc.effectivePermission === "OWNER" && (
                    <button
                      onClick={() => onShare(doc)}
                      className="p-1.5 text-slate-500 hover:text-vault-300 hover:bg-vault-800 rounded-lg transition-all"
                      title="Manage Permissions"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {(doc.effectivePermission === "OWNER" || doc.effectivePermission === "EDIT") && (
                    <button
                      onClick={() => onEdit(doc)}
                      className="p-1.5 text-slate-500 hover:text-amber-300 hover:bg-vault-800 rounded-lg transition-all"
                      title="Edit Metadata"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {doc.effectivePermission === "OWNER" && (
                    <button
                      onClick={() => onDelete(doc)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-all"
                      title="Delete Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
