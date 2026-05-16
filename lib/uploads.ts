type UploadedFileLike = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  size?: number;
  type?: string;
  name?: string;
};

export function isUploadedFile(value: unknown): value is UploadedFileLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function"
  );
}

export function safeStoragePathSegment(value: string, fallback = "item") {
  const safe = value.trim().replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 120);
  return safe || fallback;
}

export function safeUploadFileName(fileName: string) {
  const baseName = fileName.split(/[\\/]/).filter(Boolean).at(-1) ?? "";
  const safe = baseName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return safe || "upload";
}
