import React from "react";
import {
  FileText,
  Download,
  Share2,
  Edit2,
  Trash2,
  FileLock2,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Shield,
  Eye,
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

const getFileIcon = (filename: string, mimeType: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf" || mimeType.includes("pdf")) {
    return (
      <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
        <FileText className="w-4 h-4" />
      </div>
    );
  }
  if (["png", "jpg", "jpeg", "webp"].includes(ext || "") || mimeType.includes("image")) {
    return (
      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
        <ImageIcon className="w-4 h-4" />
      </div>
    );
  }
  if (["zip", "tar", "gz", "rar"].includes(ext || "") || mimeType.includes("zip")) {
    return (
      <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
        <FileArchive className="w-4 h-4" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
      <FileText className="w-4 h-4" />
    </div>
  );
};

const categoryBadgeStyle: Record<string, string> = {
  FINANCIAL: "bg-emerald-50 text-emerald-700 border-emerald-200",
  LEGAL: "bg-amber-50 text-amber-700 border-amber-200",
  HR: "bg-sky-50 text-sky-700 border-sky-200",
  TECHNICAL: "bg-indigo-50 text-indigo-700 border-indigo-200",
  GENERAL: "bg-slate-100 text-slate-700 border-slate-200",
};

const permBadgeStyle: Record<string, string> = {
  OWNER: "bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold",
  EDIT: "bg-blue-50 text-blue-700 border-blue-200",
  READ: "bg-slate-100 text-slate-700 border-slate-200",
  ADMIN_METADATA: "bg-purple-50 text-purple-700 border-purple-200",
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
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <FileLock2 className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800 mb-1">No documents found</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No files match your search criteria or are shared with your account.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-xs min-w-[700px]">
        <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
          <tr>
            <th className="px-5 py-3.5">Document</th>
            <th className="px-4 py-3.5">Category</th>
            <th className="px-4 py-3.5">Size</th>
            <th className="px-4 py-3.5">Owner</th>
            <th className="px-4 py-3.5">Access Level</th>
            <th className="px-4 py-3.5">Date Modified</th>
            <th className="px-5 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-600">
          {documents.map((doc) => (
            <tr
              key={doc.id}
              className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
              onClick={() => onViewDetails(doc)}
            >
              {/* Document details */}
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  {getFileIcon(doc.originalFilename, doc.mimeType)}
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-xs">
                      {doc.title}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                      {doc.originalFilename}
                    </div>
                  </div>
                </div>
              </td>

              {/* Category */}
              <td className="px-4 py-3.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    categoryBadgeStyle[doc.category] || categoryBadgeStyle.GENERAL
                  }`}
                >
                  {doc.category}
                </span>
              </td>

              {/* Size */}
              <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                {formatBytes(doc.fileSize)}
              </td>

              {/* Owner */}
              <td className="px-4 py-3.5">
                <div className="text-slate-800 font-medium">{doc.owner.name}</div>
                <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{doc.owner.email}</div>
              </td>

              {/* Permission level */}
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      permBadgeStyle[doc.effectivePermission] || permBadgeStyle.READ
                    }`}
                  >
                    {permLabel[doc.effectivePermission] || doc.effectivePermission}
                  </span>
                  {doc.effectivePermission === "OWNER" && doc.activeSharesCount > 0 && (
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-200">
                      {doc.activeSharesCount} shared
                    </span>
                  )}
                </div>
              </td>

              {/* Date */}
              <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                {new Date(doc.updatedAt || doc.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>

              {/* Actions */}
              <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1">
                  {doc.effectivePermission !== "ADMIN_METADATA" && (
                    <button
                      onClick={() => onDownload(doc)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {doc.effectivePermission === "OWNER" && (
                    <button
                      onClick={() => onShare(doc)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Share Permissions"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {(doc.effectivePermission === "OWNER" || doc.effectivePermission === "EDIT") && (
                    <button
                      onClick={() => onEdit(doc)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Edit Metadata"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {doc.effectivePermission === "OWNER" && (
                    <button
                      onClick={() => onDelete(doc)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
