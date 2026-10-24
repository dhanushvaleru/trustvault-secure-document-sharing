import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Users,
  FileText,
  Download,
  Share2,
  AlertOctagon,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Lock,
  UserX,
  UserCheck,
  ExternalLink,
  Key,
} from "lucide-react";
import { api } from "../api/client";
import {
  AdminMetrics,
  User,
  AuditEventItem,
  VerificationResult,
  UserStatus,
} from "../types";

export const AdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [recentEvents, setRecentEvents] = useState<AuditEventItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "audit">("overview");

  // Audit Explorer filters
  const [auditLogs, setAuditLogs] = useState<AuditEventItem[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [checkpoint, setCheckpoint] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashData, userData] = await Promise.all([
        api.admin.getMetrics(),
        api.admin.listUsers(),
      ]);
      setMetrics(dashData.metrics);
      setRecentEvents(dashData.recentEvents);
      setUsers(userData.users);

      // Also trigger background chain verification
      const verifyRes = await api.admin.verifyAuditChain();
      setVerification(verifyRes.verification);
    } catch (err: any) {
      setError(err.message || "Failed to load administrative console data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const data = await api.admin.listAuditLogs({
        page: auditPage,
        limit: 20,
        actionType: actionFilter || undefined,
        outcome: outcomeFilter || undefined,
      });
      setAuditLogs(data.events);
      setAuditTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || "Failed to query audit logs");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "audit") {
      fetchAuditLogs();
    }
  }, [activeTab, auditPage, actionFilter, outcomeFilter]);

  const handleManualVerify = async () => {
    setVerifying(true);
    try {
      const res = await api.admin.verifyAuditChain();
      setVerification(res.verification);
      setSuccessMsg("Cryptographic hash chain verification complete.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Audit verification check failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleGenerateCheckpoint = async () => {
    try {
      const res = await api.admin.createCheckpoint();
      setCheckpoint(res.checkpoint);
      setSuccessMsg("Signed external cryptographic checkpoint generated successfully.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to generate checkpoint");
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    const newStatus: UserStatus = user.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";
    try {
      await api.admin.updateUserStatus(user.id, newStatus);
      setSuccessMsg(`User ${user.email} is now ${newStatus}`);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update user status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-vault-900/80 border border-purple-900/50 rounded-2xl p-6 backdrop-blur">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 font-mono text-xs mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>ADMINISTRATIVE GOVERNANCE</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Security Console & Audit Trail</h2>
          <p className="text-xs text-slate-400 mt-1">
            System metrics, user lifecycle control, and real-time cryptographic audit chain verification.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleManualVerify}
            disabled={verifying}
            className="flex items-center space-x-2 bg-vault-800 hover:bg-vault-700 text-purple-300 border border-purple-800/60 font-medium text-xs py-2 px-3.5 rounded-xl shadow transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? "animate-spin" : ""}`} />
            <span>Verify Audit Chain</span>
          </button>

          <button
            onClick={handleGenerateCheckpoint}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs py-2 px-3.5 rounded-xl shadow transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Generate Checkpoint</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center justify-between animate-fade-in">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-950/60 border border-rose-800/80 text-rose-300 px-4 py-3 rounded-xl text-xs flex items-center justify-between animate-fade-in">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Cryptographic Chain Integrity Banner */}
      {verification && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs ${
            verification.isValid
              ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300"
              : "bg-rose-950/40 border-rose-800/80 text-rose-300 animate-pulse"
          }`}
        >
          <div className="flex items-center space-x-3">
            {verification.isValid ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
            )}
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>{verification.isValid ? "Audit Chain Intact & Verifiable" : "TAMPERING DETECTED IN AUDIT LOG"}</span>
                <span className="font-mono text-[10px] bg-vault-900 px-2 py-0.5 rounded border border-vault-700">
                  {verification.totalEvents} events chained
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono truncate max-w-xl">
                Latest Hash: {verification.latestHash}
              </div>
              {verification.reason && (
                <div className="text-rose-400 font-semibold mt-1">⚠️ {verification.reason}</div>
              )}
            </div>
          </div>

          <div className="text-slate-400 text-[10px] shrink-0 font-mono">
            Verified {new Date(verification.verifiedAt).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Checkpoint Display Modal / Card */}
      {checkpoint && (
        <div className="bg-vault-850 border border-purple-800/70 p-4 rounded-xl text-xs space-y-2">
          <div className="font-semibold text-purple-300 flex items-center justify-between">
            <span>Signed External Checkpoint (HMAC-SHA256)</span>
            <button onClick={() => setCheckpoint(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
            <div>
              <span className="text-slate-500 block">Checkpoint Hash:</span>
              <span className="break-all">{checkpoint.checkpointHash}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Cryptographic Signature:</span>
              <span className="break-all text-purple-300">{checkpoint.signature}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">
            This checkpoint can be written to cold immutable storage or third-party ledger to guarantee independent audit verifiability against database-level attackers.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-vault-800 space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-purple-400 text-purple-300"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Overview & Telemetry
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "users"
              ? "border-purple-400 text-purple-300"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          User Accounts ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "audit"
              ? "border-purple-400 text-purple-300"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Audit Log Explorer
        </button>
      </div>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === "overview" && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-vault-900 border border-vault-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Active Accounts</span>
                <Users className="w-4 h-4 text-vault-400" />
              </div>
              <div className="text-2xl font-bold text-white">{metrics.activeUsers}</div>
              <div className="text-[10px] text-slate-500 mt-1">{metrics.totalUsers} registered total</div>
            </div>

            <div className="bg-vault-900 border border-vault-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Documents Stored</span>
                <FileText className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{metrics.totalDocuments}</div>
              <div className="text-[10px] text-slate-500 mt-1">Private file storage</div>
            </div>

            <div className="bg-vault-900 border border-vault-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Authorized Downloads</span>
                <Download className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">{metrics.totalDownloads}</div>
              <div className="text-[10px] text-slate-500 mt-1">Audit verified</div>
            </div>

            <div className="bg-vault-900 border border-vault-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Denied Attempts</span>
                <AlertOctagon className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-rose-400">{metrics.deniedAccessAttempts}</div>
              <div className="text-[10px] text-slate-500 mt-1">{metrics.recentDenied24h} in last 24h</div>
            </div>
          </div>

          {/* Recent Audit Feed */}
          <div className="bg-vault-900 border border-vault-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-white text-sm flex items-center justify-between">
              <span>Recent Security Events</span>
              <span className="text-xs text-purple-400 font-mono">Live Chained Feed</span>
            </h3>

            <div className="divide-y divide-vault-800/80 text-xs">
              {recentEvents.map((evt) => (
                <div key={evt.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <span
                      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                        evt.outcome === "SUCCESS" ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                    <div className="truncate">
                      <span className="font-semibold text-slate-200">{evt.actionType}</span>
                      <span className="text-slate-500 text-[11px] ml-2 font-mono">
                        seq #{evt.sequence}
                      </span>
                      {evt.metadataJson && (
                        <div className="text-slate-400 text-[11px] font-mono truncate max-w-lg mt-0.5">
                          {evt.metadataJson}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 text-[11px] text-slate-500 font-mono">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER ACCOUNT LIFECYCLE */}
      {activeTab === "users" && (
        <div className="bg-vault-900 border border-vault-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-vault-850/80 border-b border-vault-800 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Owned Docs</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vault-800 text-slate-300">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-vault-850/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-white">{u.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px]">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        u.role === "ADMIN"
                          ? "bg-purple-950 text-purple-300 border border-purple-800"
                          : u.role === "OWNER"
                          ? "bg-blue-950 text-blue-300 border border-blue-800"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                        u.status === "ACTIVE"
                          ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                          : "bg-rose-950/60 text-rose-300 border-rose-800"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          u.status === "ACTIVE" ? "bg-emerald-400" : "bg-rose-400"
                        }`}
                      />
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px]">
                    {u._count?.ownedDocuments ?? 0}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {u.role !== "ADMIN" && (
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          u.status === "ACTIVE"
                            ? "bg-rose-950/30 text-rose-300 border-rose-800/80 hover:bg-rose-900/50"
                            : "bg-emerald-950/30 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/50"
                        }`}
                      >
                        {u.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: AUDIT LOG EXPLORER */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="bg-vault-900 border border-vault-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">All Action Types</option>
                <option value="AUTH_LOGIN">AUTH_LOGIN</option>
                <option value="AUTH_LOGIN_FAILED">AUTH_LOGIN_FAILED</option>
                <option value="DOC_UPLOAD">DOC_UPLOAD</option>
                <option value="DOC_DOWNLOAD">DOC_DOWNLOAD</option>
                <option value="DOC_UPDATE">DOC_UPDATE</option>
                <option value="DOC_DELETE">DOC_DELETE</option>
                <option value="PERM_GRANT">PERM_GRANT</option>
                <option value="PERM_REVOKE">PERM_REVOKE</option>
                <option value="ADMIN_USER_STATUS_CHANGE">ADMIN_USER_STATUS_CHANGE</option>
                <option value="ACCESS_DENIED">ACCESS_DENIED</option>
              </select>

              <select
                value={outcomeFilter}
                onChange={(e) => {
                  setOutcomeFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="bg-vault-900 border border-vault-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">All Outcomes</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="DENIED">DENIED</option>
              </select>
            </div>

            <button
              onClick={fetchAuditLogs}
              className="p-2 bg-vault-900 border border-vault-700 text-slate-300 hover:text-white rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-vault-900 border border-vault-800 rounded-2xl overflow-hidden shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-vault-850/80 border-b border-vault-800 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Seq</th>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Action</th>
                  <th className="px-4 py-3.5">Outcome</th>
                  <th className="px-4 py-3.5">Actor User</th>
                  <th className="px-4 py-3.5">Current SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vault-800 text-slate-300 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-vault-850/40 transition-colors">
                    <td className="px-4 py-3.5 text-vault-400 font-bold">#{log.sequence}</td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 font-bold font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          log.actionType.startsWith("DOC")
                            ? "bg-blue-950 text-blue-300 border border-blue-900"
                            : log.actionType.startsWith("PERM")
                            ? "bg-amber-950 text-amber-300 border border-amber-900"
                            : log.actionType === "ACCESS_DENIED"
                            ? "bg-rose-950 text-rose-300 border border-rose-900"
                            : "bg-purple-950 text-purple-300 border border-purple-900"
                        }`}
                      >
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                          log.outcome === "SUCCESS"
                            ? "text-emerald-400 bg-emerald-950/60"
                            : "text-rose-400 bg-rose-950/60"
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-[10px]">
                      {log.actorUserId ? log.actorUserId.slice(0, 8) + "..." : "SYSTEM/ANON"}
                    </td>
                    <td className="px-4 py-3.5 text-vault-300 text-[10px] truncate max-w-xs" title={log.currentHash}>
                      {log.currentHash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {auditTotalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-400 px-2 pt-2">
              <span>Showing page {auditPage} of {auditTotalPages}</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPage === 1}
                  className="px-3 py-1.5 bg-vault-900 border border-vault-800 rounded-lg disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                  disabled={auditPage === auditTotalPages}
                  className="px-3 py-1.5 bg-vault-900 border border-vault-800 rounded-lg disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
