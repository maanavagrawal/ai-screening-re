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
