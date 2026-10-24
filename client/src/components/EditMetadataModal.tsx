import React, { useState, useEffect } from "react";
import { X, Edit3, AlertCircle } from "lucide-react";
import { api } from "../api/client";
import { DocumentItem } from "../types";

interface EditMetadataModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: DocumentItem) => void;
}

export const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"FINANCIAL" | "LEGAL" | "HR" | "TECHNICAL" | "GENERAL">("GENERAL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setDescription(doc.description || "");
      setCategory(doc.category);
      setError(null);
    }
  }, [doc]);

  if (!isOpen || !doc) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.documents.update(doc.id, {
        title: title.trim(),
        description: description.trim(),
        category,
      });
      onSuccess(res.document);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update document metadata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-vault-900 border border-vault-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-vault-800">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-5 h-5 text-vault-400" />
            <h3 className="font-semibold text-white">Edit Document Metadata</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-vault-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 text-rose-300 bg-rose-950/50 border border-rose-800/80 px-3.5 py-2.5 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-vault-850 border border-vault-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-vault-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-vault-850 border border-vault-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-vault-400"
            >
              <option value="GENERAL">General</option>
              <option value="FINANCIAL">Financial</option>
              <option value="LEGAL">Legal</option>
              <option value="HR">HR & People</option>
              <option value="TECHNICAL">Technical</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-vault-850 border border-vault-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-vault-400"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-vault-800 hover:bg-vault-700 rounded-xl border border-vault-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-medium bg-vault-500 hover:bg-vault-400 text-white rounded-xl shadow transition-colors"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
