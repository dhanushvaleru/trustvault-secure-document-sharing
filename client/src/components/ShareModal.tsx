import React, { useState, useEffect } from "react";
import {
  X,
  Share2,
  Shield,
  UserMinus,
  Plus,
  Clock,
  Check,
  AlertCircle,
  Calendar,
  MessageSquare,
  Mail,
  UserCheck,
} from "lucide-react";
import { api } from "../api/client";
import { DocumentItem, DocumentPermissionItem, User, PermissionLevel } from "../types";

interface ShareModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPermissionsUpdated?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  onPermissionsUpdated,
}) => {
  const [permissions, setPermissions] = useState<DocumentPermissionItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>("READ");
  const [expirationDate, setExpirationDate] = useState("");
  const [optionalMessage, setOptionalMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchPermissions = async () => {
    if (!doc) return;
    try {
      const data = await api.permissions.list(doc.id);
      setPermissions(data.permissions);
    } catch (err: any) {
      setError(err.message || "Failed to load permissions");
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api.admin.listUsers().catch(() => ({ users: [] }));
      // Filter out document owner
      const eligible = data.users.filter((u) => u.id !== doc?.owner.id);
      setUsers(eligible);
    } catch {}
  };

  useEffect(() => {
    if (isOpen && doc) {
      setError(null);
      setSuccessMsg(null);
      setExpirationDate("");
      setOptionalMessage("");
      fetchPermissions();
      fetchUsers();
    }
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError("Please select a recipient user to grant access");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.permissions.grant(doc.id, {
        userId: selectedUserId,
        permissionLevel,
      });
      setSuccessMsg(res.message || "Access successfully delegated to recipient.");
      setSelectedUserId("");
      setExpirationDate("");
      setOptionalMessage("");
      await fetchPermissions();
      onPermissionsUpdated?.();
    } catch (err: any) {
      setError(err.message || "Failed to grant permission");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (userId: string, newLevel: PermissionLevel) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.permissions.update(doc.id, userId, { permissionLevel: newLevel });
      setSuccessMsg(res.message);
      await fetchPermissions();
      onPermissionsUpdated?.();
    } catch (err: any) {
      setError(err.message || "Failed to update permission");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (userId: string) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.permissions.revoke(doc.id, userId);
      setSuccessMsg(res.message || "Access revoked successfully.");
      await fetchPermissions();
      onPermissionsUpdated?.();
    } catch (err: any) {
      setError(err.message || "Failed to revoke permission");
    } finally {
      setLoading(false);
    }
  };

  const activeGrants = permissions.filter((p) => !p.revokedAt);
  const revokedGrants = permissions.filter((p) => p.revokedAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-modal overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Share Document</h3>
              <p className="text-xs text-slate-500 truncate max-w-sm">{doc.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="flex items-center space-x-2 text-rose-800 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl text-xs animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center space-x-2 text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 rounded-xl text-xs animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* New Share Grant Form */}
          <form onSubmit={handleGrant} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Grant New Access</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">Immediate propagation</span>
            </div>

            {/* Recipient User / Email */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Recipient Email or Account
              </label>
              {users.length > 0 ? (
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                  >
                    <option value="">Select registered recipient...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.email} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    placeholder="Enter recipient User UUID or email…"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
              )}
            </div>

            {/* Permission Level & Expiration Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Permission Level
                </label>
                <select
                  value={permissionLevel}
                  onChange={(e) => setPermissionLevel(e.target.value as PermissionLevel)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                >
                  <option value="READ">READ (View & Download)</option>
                  <option value="EDIT">EDIT (Metadata & Content)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Expiration Date (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Optional message */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Note / Message (Optional)
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <textarea
                  value={optionalMessage}
                  onChange={(e) => setOptionalMessage(e.target.value)}
                  rows={2}
                  placeholder="Add a context note for this permission grant…"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            {/* Grant Button */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold py-2.5 px-4 shadow-sm hover:shadow transition-all flex items-center space-x-1.5 active:scale-[0.98] disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{loading ? "Granting Access…" : "Share Document"}</span>
              </button>
            </div>
          </form>

          {/* Active grants list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Current Access Grants
              </h4>
              <span className="text-indigo-600 font-semibold text-xs bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                {activeGrants.length} active
              </span>
            </div>

            {activeGrants.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs bg-slate-50/50">
                No external users currently have active grants to this document.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-card">
                {activeGrants.map((grant) => (
                  <div key={grant.id} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                        {grant.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{grant.user.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{grant.user.email}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Granted {new Date(grant.grantedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <select
                        value={grant.permissionLevel}
                        onChange={(e) => handleUpdate(grant.userId, e.target.value as PermissionLevel)}
                        disabled={loading}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
                      >
                        <option value="READ">READ</option>
                        <option value="EDIT">EDIT</option>
                      </select>

                      <button
                        onClick={() => handleRevoke(grant.userId)}
                        disabled={loading}
                        className="text-rose-600 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
                        title="Revoke Access Immediately"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revoked history */}
          {revokedGrants.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Revocation History
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/60 overflow-hidden text-xs">
                {revokedGrants.map((grant) => (
                  <div key={grant.id} className="p-3 flex items-center justify-between text-slate-500">
                    <div>
                      <span className="font-semibold text-slate-700">{grant.user.name}</span>
                      <span className="text-[11px] text-slate-400 ml-2">({grant.user.email})</span>
                      <div className="text-[10px] text-rose-600 mt-0.5">
                        Revoked on {new Date(grant.revokedAt!).toLocaleString()}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200/70 text-slate-600 font-medium font-mono">
                      {grant.permissionLevel} (Revoked)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Audit logging: All access grants and revokes are cryptographically chained.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};