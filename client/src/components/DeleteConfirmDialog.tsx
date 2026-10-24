import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { DocumentItem } from "../types";

interface DeleteConfirmDialogProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  document: doc,
  isOpen,
  onClose,
  onConfirm,
  loading,
}) => {
  if (!isOpen || !doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-vault-900 border border-rose-800/60 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400 mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-base font-semibold text-white">Delete Document?</h3>
          <p className="text-xs text-slate-300">
            Are you sure you want to delete <span className="font-semibold text-white">"{doc.title}"</span>?
          </p>
          <p className="text-[11px] text-slate-400 bg-vault-850 p-3 rounded-xl border border-vault-800 text-left">
            ⚠️ The physical file will be safely removed from private storage and inaccessible immediately. All historical audit logs and permission events remain cryptographically preserved.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-vault-800 hover:bg-vault-700 rounded-xl border border-vault-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow transition-colors flex items-center space-x-1.5"
          >
            {loading ? (
              <span>Deleting...</span>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Deletion</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
