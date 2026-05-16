"use client";

import { Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { QuestionFrame } from "@/components/intake/primitives";

type PreapprovalResponse = {
  path?: string;
  signedUrl?: string | null;
  error?: string;
};

export function PreapprovalUploadQuestion({
  agentSlug,
  sessionId,
  disabled,
  onAnswer
}: {
  agentSlug: string;
  sessionId: string;
  disabled?: boolean;
  onAnswer: (value: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setUploading(true);
      setError("");
      try {
        const response = await fetch("/api/preapproval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_slug: agentSlug,
            session_id: sessionId,
            file_name: file.name,
            content_type: file.type
          })
        });
        const data = (await response.json()) as PreapprovalResponse;
        if (!response.ok || data.error) throw new Error(data.error ?? "Upload could not be prepared.");
        if (data.signedUrl) {
          const uploadResponse = await fetch(data.signedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file
          });
          if (!uploadResponse.ok) throw new Error("Upload failed.");
        }
        onAnswer(null);
      } catch {
        setError("We could not upload that file. You can try again or send it later.");
      } finally {
        setUploading(false);
      }
    },
    [agentSlug, onAnswer, sessionId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: disabled || uploading,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp"]
    },
    maxFiles: 1
  });

  return (
    <QuestionFrame title="Want to add your pre-approval?" subtitle="Optional, but it helps prioritize showings.">
      <div
        {...getRootProps({
          role: "button",
          "aria-label": "Upload pre-approval PDF or image"
        })}
        className="agent-focus flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-warm-border bg-white/70 p-6 text-center"
      >
        <input {...getInputProps({ "aria-label": "Pre-approval file" })} />
        <Upload className="text-[var(--agent-accent)]" size={28} />
        <p className="mt-4 text-sm font-semibold">{isDragActive ? "Drop it here" : "Upload PDF or image"}</p>
        <p className="mt-1 text-sm text-warm-muted">{uploading ? "Preparing upload..." : "You can skip this."}</p>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm leading-6 text-warm-muted">{error}</p> : null}
      <Button className="mt-4 w-full" variant="secondary" disabled={disabled || uploading} onClick={() => onAnswer(null)}>
        I&apos;ll send it later
      </Button>
    </QuestionFrame>
  );
}
