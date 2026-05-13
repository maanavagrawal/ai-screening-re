"use client";

import { Mic, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { QuestionFrame } from "@/components/intake/primitives";

type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  start: () => void;
};

export function FreeTextQuestion({
  loading,
  onSubmit
}: {
  loading?: boolean;
  onSubmit: (value: string) => void;
}) {
  const [text, setText] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    setSpeechSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  }, []);

  function startMic() {
    const ctor = ((window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition);
    if (!ctor) return;
    const recognition = new ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      setText((current) => `${current}${current ? " " : ""}${transcript}`.trim());
    };
    recognition.start();
  }

  return (
    <QuestionFrame
      eyebrow="In your words"
      title="What are you looking for?"
      subtitle="A few real details help your matches get much sharper."
    >
      <div className="relative">
        <textarea
          aria-label="Home search notes"
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="agent-focus min-h-56 w-full resize-none rounded-2xl border border-warm-border bg-white/75 p-4 pr-14 text-base leading-7 shadow-sm placeholder:text-warm-muted"
          placeholder="e.g. 'We have two kids and a dog, my wife works from home so she needs an office, I bike to work downtown, light reno is fine but nothing major.'"
        />
        {speechSupported ? (
          <button
            type="button"
            aria-label="Use microphone"
            onClick={startMic}
            className="agent-focus absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--agent-accent-soft)] text-[var(--agent-accent)]"
          >
            <Mic size={18} />
          </button>
        ) : null}
      </div>
      {text.length >= 200 ? (
        <p className="mt-2 text-right text-xs text-warm-muted">{text.length} characters</p>
      ) : null}
      <Button className="mt-5 w-full gap-2" disabled={text.trim().length < 2 || loading} onClick={() => onSubmit(text)}>
        {loading ? "Reading your notes..." : "Continue"}
        <Send size={17} />
      </Button>
    </QuestionFrame>
  );
}
