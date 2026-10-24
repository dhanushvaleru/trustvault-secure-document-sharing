import fs from "fs";
import path from "path";
import crypto from "crypto";
import { config } from "../config/index.js";

export interface FileValidationResult {
  isValid: boolean;
  detectedMimeType?: string;
  error?: string;
}

export interface StorageAdapter {
  saveFile(storageKey: string, buffer: Buffer): Promise<void>;
  readFile(storageKey: string): Promise<Buffer>;
  deleteFile(storageKey: string): Promise<void>;
  fileExists(storageKey: string): Promise<boolean>;
}

export class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolvePath(storageKey: string): string {
    // Defense against path traversal: sanitize storage key to alphanumeric + dashes/underscores only
    const sanitizedKey = storageKey.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!sanitizedKey || sanitizedKey !== storageKey) {
      throw new Error("Invalid or unsafe storage key detected");
    }

    const resolved = path.resolve(this.baseDir, sanitizedKey);
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error("Path traversal attempt detected");
    }
    return resolved;
  }

  async saveFile(storageKey: string, buffer: Buffer): Promise<void> {
    const filePath = this.resolvePath(storageKey);
    await fs.promises.writeFile(filePath, buffer);
  }

  async readFile(storageKey: string): Promise<Buffer> {
    const filePath = this.resolvePath(storageKey);
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found in storage");
    }
    return fs.promises.readFile(filePath);
  }

  async deleteFile(storageKey: string): Promise<void> {
    const filePath = this.resolvePath(storageKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async fileExists(storageKey: string): Promise<boolean> {
    try {
      const filePath = this.resolvePath(storageKey);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }
}

// Magic bytes table for strict server-side MIME type verification
const MAGIC_SIGNATURES: Array<{
  mime: string;
  ext: string[];
  check: (buf: Buffer) => boolean;
}> = [
  {
    mime: "application/pdf",
    ext: ["pdf"],
    check: (buf) => buf.length >= 4 && buf.toString("utf8", 0, 4) === "%PDF",
  },
  {
    mime: "image/png",
    ext: ["png"],
    check: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
  {
    mime: "image/jpeg",
    ext: ["jpg", "jpeg"],
    check: (buf) =>
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  {
    mime: "application/zip",
    ext: ["docx", "xlsx", "zip"],
    check: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07) &&
      (buf[3] === 0x04 || buf[3] === 0x06 || buf[3] === 0x08),
  },
  {
    mime: "text/plain",
    ext: ["txt", "csv", "json"],
    check: (buf) => {
      // Check for zero-byte nulls or binary control characters that indicate binary executables
      for (let i = 0; i < Math.min(buf.length, 512); i++) {
        const byte = buf[i];
        if (byte === 0) return false; // Null byte indicates binary
      }
      return true;
    },
  },
];

// Disallowed executable headers
const EXECUTABLE_SIGNATURES = [
  (buf: Buffer) => buf.length >= 2 && buf[0] === 0x4d && buf[1] === 0x5a, // MZ (Windows EXE / DLL)
  (buf: Buffer) =>
    buf.length >= 4 &&
    buf[0] === 0x7f &&
    buf[1] === 0x45 &&
    buf[2] === 0x4c &&
    buf[3] === 0x46, // ELF (Linux binary)
  (buf: Buffer) =>
    buf.length >= 4 &&
    ((buf[0] === 0xfe && buf[1] === 0xed && buf[2] === 0xfa && buf[3] === 0xce) ||
     (buf[0] === 0xcf && buf[1] === 0xfa && buf[2] === 0xed && buf[3] === 0xfe)), // Mach-O (Mac binary)
  (buf: Buffer) =>
    buf.length >= 2 && buf[0] === 0x23 && buf[1] === 0x21, // #! (Shebang script)
];

export class StorageService {
  private static adapter: StorageAdapter = new LocalStorageAdapter(config.storageDir);

  public static getAdapter(): StorageAdapter {
    return this.adapter;
  }

  /**
   * Validates file size, extension, and magic-byte signature against security rules.
   */
  static validateUploadedFile(
    filename: string,
    buffer: Buffer,
    reportedMime?: string
  ): FileValidationResult {
    // 1. File size check
    if (buffer.length === 0) {
      return { isValid: false, error: "Empty files are not permitted" };
    }
    if (buffer.length > config.maxFileSize) {
      return {
        isValid: false,
        error: `File size exceeds the maximum permitted limit of ${config.maxFileSize / (1024 * 1024)}MB`,
      };
    }

    // 2. Extension check
    const ext = path.extname(filename).toLowerCase().replace(/^\./, "");
    if (!ext) {
      return { isValid: false, error: "File must have an explicit extension" };
    }

    const ALLOWED_EXTENSIONS = [
      "pdf",
      "png",
      "jpg",
      "jpeg",
      "docx",
      "xlsx",
      "txt",
      "csv",
      "json",
    ];

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        isValid: false,
        error: `File extension '.${ext}' is not permitted. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
      };
    }

    // 3. Executable signature rejection
    for (const isExecutable of EXECUTABLE_SIGNATURES) {
      if (isExecutable(buffer)) {
        return {
          isValid: false,
          error: "Malicious or executable file signature detected. Upload rejected.",
        };
      }
    }

    // 4. Match magic bytes against allowed format
    let matchedMime: string | undefined;
    for (const sig of MAGIC_SIGNATURES) {
      if (sig.ext.includes(ext) && sig.check(buffer)) {
        matchedMime = sig.mime;
        break;
      }
    }

    if (!matchedMime) {
      return {
        isValid: false,
        error: "File content does not match its declared extension signature.",
      };
    }

    return {
      isValid: true,
      detectedMimeType: matchedMime,
    };
  }

  /**
   * Computes SHA-256 checksum of file buffer.
   */
  static computeChecksum(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Generates a secure, unguessable storage key (UUID v4).
   */
  static generateStorageKey(): string {
    return crypto.randomUUID();
  }

  /**
   * Saves file to private storage.
   */
  static async storeFile(storageKey: string, buffer: Buffer): Promise<void> {
    await this.adapter.saveFile(storageKey, buffer);
  }

  /**
   * Retrieves file from private storage.
   */
  static async retrieveFile(storageKey: string): Promise<Buffer> {
    return this.adapter.readFile(storageKey);
  }

  /**
   * Removes file from private storage safely.
   */
  static async removeFile(storageKey: string): Promise<void> {
    await this.adapter.deleteFile(storageKey);
  }
}
