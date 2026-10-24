import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Users,
  FileText,
  Download,
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
  Shield,
  Clock,
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
    <div className="space-y-6 animate-fade-in">
      {/* Admin Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 font-semibold text-xs mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>ADMINISTRATIVE GOVERNANCE</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Security Console & Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-1">
            System metrics, user lifecycle control, and real-time cryptographic audit chain verification.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handleManualVerify}
            disabled={verifying}
            className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-indigo-700 border border-slate-200 font-semibold text-xs py-2.5 px-3.5 rounded-xl shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? "animate-spin" : ""}`} />
            <span>Verify Audit Chain</span>
          </button>

          <button
            onClick={handleGenerateCheckpoint}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 px-3.5 rounded-xl shadow-sm transition-all active:scale-[0.98]"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Generate Checkpoint</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-card animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-card animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Cryptographic Chain Integrity Banner */}
      {verification && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs shadow-card ${
            verification.isValid
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900 animate-pulse"
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            {verification.isValid ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-bold flex items-center gap-2">
                <span>{verification.isValid ? "Audit Chain Intact & Cryptographically Valid" : "TAMPERING DETECTED IN AUDIT LOG"}</span>
                <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-700">
                  {verification.totalEvents} events chained
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono truncate max-w-xl">
                Latest Hash: {verification.latestHash}
              </div>
              {verification.reason && (
                <div className="text-rose-700 font-semibold mt-1">⚠️ {verification.reason}</div>
              )}
            </div>
          </div>

          <div className="text-slate-500 text-[10px] shrink-0 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            Verified {new Date(verification.verifiedAt).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Checkpoint Display Card */}
      {checkpoint && (
        <div className="bg-white border border-indigo-200 p-5 rounded-2xl shadow-card text-xs space-y-3 animate-fade-in">
          <div className="font-bold text-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              <span>Signed External Checkpoint (HMAC-SHA256)</span>
            </div>
            <button onClick={() => setCheckpoint(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">Checkpoint Hash:</span>
              <span className="break-all text-slate-800 font-bold">{checkpoint.checkpointHash}</span>
            </div>
            <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
              <span className="text-indigo-600 font-semibold uppercase text-[10px] block mb-1">HMAC Signature:</span>
              <span className="break-all text-indigo-800 font-bold">{checkpoint.signature}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            This checkpoint can be written to cold immutable storage or third-party ledger to guarantee independent audit verifiability against database-level attackers.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Overview & Telemetry</span>
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "users"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Accounts ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "audit"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Audit Log Explorer</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === "overview" && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Active Accounts</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{metrics.activeUsers}</div>
              <div className="text-[11px] text-slate-400 mt-1">{metrics.totalUsers} registered total</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Documents Stored</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{metrics.totalDocuments}</div>
              <div className="text-[11px] text-slate-400 mt-1">Encrypted file storage</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Authorized Downloads</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{metrics.totalDownloads}</div>
              <div className="text-[11px] text-slate-400 mt-1">Audited & verified</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Denied Attempts</span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertOctagon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-rose-600">{metrics.deniedAccessAttempts}</div>
              <div className="text-[11px] text-slate-400 mt-1">{metrics.recentDenied24h} in last 24h</div>
            </div>
          </div>

          {/* Recent Audit Feed */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Recent Security Events
                </h3>
              </div>
              <span className="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                Live Chained Feed
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {recentEvents.map((evt) => (
                <div key={evt.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors px-1">
                  <div className="flex items-center space-x-3 min-w-0">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
                        evt.outcome === "SUCCESS" ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    <div className="truncate">
                      <span className="font-bold text-slate-800">{evt.actionType}</span>
                      <span className="text-slate-400 text-[11px] ml-2 font-mono">
                        seq #{evt.sequence}
                      </span>
                      {evt.metadataJson && (
                        <div className="text-slate-500 text-[11px] font-mono truncate max-w-lg mt-0.5">
                          {evt.metadataJson}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 text-[11px] text-slate-400 font-mono">
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
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Owned Docs</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-900">{u.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px]">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        u.role === "ADMIN"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : u.role === "OWNER"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        u.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          u.status === "ACTIVE" ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-slate-700">
                    {u._count?.ownedDocuments ?? 0}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {u.role !== "ADMIN" && (
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          u.status === "ACTIVE"
                            ? "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
                            : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
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
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-card flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 focus:bg-white cursor-pointer"
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
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-600 focus:bg-white cursor-pointer"
              >
                <option value="">All Outcomes</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="DENIED">DENIED</option>
              </select>
            </div>

            <button
              onClick={fetchAuditLogs}
              className="p-2 bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="Refresh Audit Logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Seq</th>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Action</th>
                  <th className="px-4 py-3.5">Outcome</th>
                  <th className="px-4 py-3.5">Actor User</th>
                  <th className="px-4 py-3.5">SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 text-indigo-700 font-bold">#{log.sequence}</td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 font-bold font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          log.actionType.startsWith("DOC")
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : log.actionType.startsWith("PERM")
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : log.actionType === "ACCESS_DENIED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold border ${
                          log.outcome === "SUCCESS"
                            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                            : "text-rose-700 bg-rose-50 border-rose-200"
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[10px]">
                      {log.actorUserId ? log.actorUserId.slice(0, 8) + "..." : "SYSTEM/ANON"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-[10px] truncate max-w-xs" title={log.currentHash}>
                      {log.currentHash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {auditTotalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500 px-2 pt-2">
              <span>Showing page <strong className="text-slate-800">{auditPage}</strong> of <strong className="text-slate-800">{auditTotalPages}</strong></span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPage === 1}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 shadow-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                  disabled={auditPage === auditTotalPages}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 shadow-sm"
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