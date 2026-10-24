import {
  User,
  DocumentItem,
  DocumentPermissionItem,
  AuditEventItem,
  AdminMetrics,
  VerificationResult,
  PermissionLevel,
  UserStatus,
} from "../types";

const getApiBase = () => {
  if (typeof window !== "undefined" && (window as any).__TRUSTVAULT_API_BASE__) {
    return (window as any).__TRUSTVAULT_API_BASE__;
  }
  return "/api";
};

const API_BASE = getApiBase();

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: "include", // Essential for HttpOnly session cookie
  });

  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  auth: {
    login: (data: { email: string; password: string }) =>
      request<{ user: User; expiresAt: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    register: (data: { name: string; email: string; password: string }) =>
      request<{ user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    logout: () =>
      request<{ message: string }>("/auth/logout", {
        method: "POST",
      }),
    me: () =>
      request<{ user: User }>("/auth/me"),
    getDemoAccounts: () =>
      request<{
        accounts: Array<{ role: string; email: string; label: string }>;
        defaultDemoPassword: string;
      }>("/auth/demo-accounts"),
  },

  documents: {
    list: (params: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      ownerId?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== "") {
          searchParams.set(key, String(val));
        }
      });
      return request<{
        documents: DocumentItem[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/documents?${searchParams.toString()}`);
    },

    get: (id: string) =>
      request<{ document: DocumentItem & { permissions: DocumentPermissionItem[] } }>(`/documents/${id}`),

    upload: (formData: FormData) =>
      request<{ message: string; document: DocumentItem }>("/documents", {
        method: "POST",
        body: formData,
      }),

    update: (id: string, data: { title?: string; description?: string; category?: string }) =>
      request<{ message: string; document: DocumentItem }>(`/documents/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ message: string }>(`/documents/${id}`, {
        method: "DELETE",
      }),

    download: async (id: string, filename: string) => {
      const response = await fetch(`${API_BASE}/documents/${id}/download`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        let err = "Download failed";
        try {
          const json = await response.json();
          err = json.error || err;
        } catch {}
        throw new Error(err);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  },

  permissions: {
    list: (documentId: string) =>
      request<{ permissions: DocumentPermissionItem[] }>(`/documents/${documentId}/permissions`),

    grant: (documentId: string, data: { userId: string; permissionLevel: PermissionLevel }) =>
      request<{ message: string; permission: DocumentPermissionItem }>(
        `/documents/${documentId}/permissions`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      ),

    update: (documentId: string, userId: string, data: { permissionLevel: PermissionLevel }) =>
      request<{ message: string; permission: DocumentPermissionItem }>(
        `/documents/${documentId}/permissions/${userId}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      ),

    revoke: (documentId: string, userId: string) =>
      request<{ message: string }>(`/documents/${documentId}/permissions/${userId}`, {
        method: "DELETE",
      }),
  },

  admin: {
    getMetrics: () =>
      request<{ metrics: AdminMetrics; recentEvents: AuditEventItem[] }>("/admin/dashboard"),

    listUsers: () =>
      request<{ users: User[] }>("/admin/users"),

    updateUserStatus: (userId: string, status: UserStatus) =>
      request<{ message: string; user: User }>(`/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),

    listAuditLogs: (params: {
      page?: number;
      limit?: number;
      actionType?: string;
      outcome?: string;
      actorUserId?: string;
      documentId?: string;
      startDate?: string;
      endDate?: string;
    }) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== "") {
          searchParams.set(key, String(val));
        }
      });
      return request<{
        events: AuditEventItem[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/admin/audit?${searchParams.toString()}`);
    },

    verifyAuditChain: () =>
      request<{ verification: VerificationResult }>("/admin/audit/verify"),

    createCheckpoint: () =>
      request<{
        checkpoint: {
          checkpointHash: string;
          totalEvents: number;
          timestamp: string;
          signature: string;
        };
      }>("/admin/audit/checkpoint", { method: "POST" }),
  },
};
