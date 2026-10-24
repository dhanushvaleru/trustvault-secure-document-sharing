import React, { useState } from "react";
import { X, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "../api/client";
import { DocumentItem } from "../types";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDoc: DocumentItem) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"FINANCIAL" | "LEGAL" | "HR" | "TECHNICAL" | "GENERAL">("GENERAL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        // Auto-fill title from clean filename
        const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExt);
      }
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload");
      return;
    }
    if (!title.trim()) {
      setError("Document title is required");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("category", category);

    try {
      const res = await api.documents.upload(formData);
      onSuccess(res.document);
      onClose();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-vault-900 border border-vault-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-vault-800">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-vault-400" />
            <h3 className="font-semibold text-white">Upload Secure Document</h3>
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

          {/* File input dropzone */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Select Document
            </label>
            <div className="border-2 border-dashed border-vault-700 hover:border-vault-500 rounded-xl p-5 text-center transition-colors cursor-pointer bg-vault-850/50 relative">
              <input
                type="file"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.txt,.csv,.json"
              />
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <FileText className="w-8 h-8 text-vault-400" />
                <span className="text-xs text-slate-300 font-medium">
                  {file ? file.name : "Click or drag file here to attach"}
                </span>
                <span className="text-[11px] text-slate-500">
                  Supported: PDF, PNG, JPG, DOCX, XLSX, TXT, CSV, JSON (Max 10MB)
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Master Service Agreement"
              className="w-full bg-vault-850 border border-vault-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-vault-400"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Category
              </label>
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
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Summary of document purpose or context"
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
              className="px-5 py-2 text-xs font-medium bg-vault-500 hover:bg-vault-400 text-white rounded-xl shadow transition-colors flex items-center space-x-2"
            >
              {loading ? (
                <span>Encrypting & Storing...</span>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
