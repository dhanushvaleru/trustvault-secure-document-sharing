import React, { useState, useEffect } from "react";
import { X, Share2, Shield, UserMinus, Plus, Clock, Check, AlertCircle } from "lucide-react";
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
      fetchPermissions();
      fetchUsers();
    }
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError("Please select a user to grant access");
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
      setSuccessMsg(res.message);
      setSelectedUserId("");
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
      setSuccessMsg(res.message);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-vault-900 border border-vault-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-vault-800">
          <div className="flex items-center space-x-2.5">
            <Share2 className="w-5 h-5 text-vault-400" />
            <div>
              <h3 className="font-semibold text-white">Manage Document Access</h3>
              <p className="text-xs text-slate-400 truncate max-w-sm">{doc.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-vault-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="flex items-center space-x-2 text-rose-300 bg-rose-950/50 border border-rose-800/80 px-3.5 py-2.5 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center space-x-2 text-emerald-300 bg-emerald-950/50 border border-emerald-800/80 px-3.5 py-2.5 rounded-xl text-xs">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Grant new permission section */}
          <form onSubmit={handleGrant} className="bg-vault-850 border border-vault-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Grant Access to Registered User
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-7">
                {users.length > 0 ? (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-vault-900 border border-vault-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-vault-400"
                  >
                    <option value="">Select registered user...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    placeholder="Enter target User UUID..."
                    className="w-full bg-vault-900 border border-vault-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-vault-400"
                  />
                )}
              </div>

              <div className="sm:col-span-3">
                <select
                  value={permissionLevel}
                  onChange={(e) => setPermissionLevel(e.target.value as PermissionLevel)}
                  className="w-full bg-vault-900 border border-vault-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-vault-400"
                >
                  <option value="READ">READ (View/Download)</option>
                  <option value="EDIT">EDIT (Metadata/Content)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-full bg-vault-500 hover:bg-vault-400 text-white rounded-xl text-xs font-medium py-2 px-3 shadow transition-colors flex items-center justify-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Grant</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Revocation is immediate: terminating access prevents all subsequent downloads.
            </p>
          </form>

          {/* Active grants list */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Active Permissions</span>
              <span className="text-vault-400 text-xs font-mono">{activeGrants.length} active</span>
            </h4>

            {activeGrants.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-vault-800 rounded-xl text-slate-500 text-xs">
                No external users currently have active grants to this document.
              </div>
            ) : (
              <div className="divide-y divide-vault-800 border border-vault-800 rounded-xl bg-vault-850/50 overflow-hidden">
                {activeGrants.map((grant) => (
                  <div key={grant.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-medium text-slate-200">{grant.user.name}</div>
                      <div className="text-[11px] text-slate-400">{grant.user.email}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>Granted {new Date(grant.grantedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <select
                        value={grant.permissionLevel}
                        onChange={(e) => handleUpdate(grant.userId, e.target.value as PermissionLevel)}
                        disabled={loading}
                        className="bg-vault-900 border border-vault-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none"
                      >
                        <option value="READ">READ</option>
                        <option value="EDIT">EDIT</option>
                      </select>

                      <button
                        onClick={() => handleRevoke(grant.userId)}
                        disabled={loading}
                        className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-800/60 transition-colors"
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
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Revocation History
              </h4>
              <div className="divide-y divide-vault-800 border border-vault-800 rounded-xl bg-vault-900/40 overflow-hidden text-xs">
                {revokedGrants.map((grant) => (
                  <div key={grant.id} className="p-3 flex items-center justify-between text-slate-400">
                    <div>
                      <span className="font-medium text-slate-300">{grant.user.name}</span>
                      <span className="text-[11px] text-slate-500 ml-2">({grant.user.email})</span>
                      <div className="text-[10px] text-rose-400/90 mt-0.5">
                        Revoked on {new Date(grant.revokedAt!).toLocaleString()}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-vault-800 text-slate-400 border border-vault-700">
                      {grant.permissionLevel} (Expired)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-vault-800 bg-vault-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-vault-800 hover:bg-vault-700 rounded-xl border border-vault-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
