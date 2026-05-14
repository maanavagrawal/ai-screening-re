"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import QRCode from "qrcode";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Link as LinkIcon,
  Mic,
  Phone,
  Plus,
  Wand2
} from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { SetupPreview } from "@/components/setup/setup-preview";
import { DEAL_BREAKERS, MUST_HAVES } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/formatting";
import type { AgentSetupDraftData, ListingPayload } from "@/lib/types";

const steps = ["welcome", "basics", "voice", "listings", "neighborhoods", "phone", "link", "simulation"] as const;
type Step = (typeof steps)[number];

const cityOptions = ["Austin, TX", "Seattle, WA", "Denver, CO", "Los Angeles, CA", "Miami, FL", "Chicago, IL"];

type WizardListing = Partial<ListingPayload> & { sourceUrl?: string; extractMessage?: string };

export function SetupWizard({
  step,
  initialDraft
}: {
  step: Step;
  initialDraft: Partial<AgentSetupDraftData>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Partial<AgentSetupDraftData>>({
    accentColor: "#C97B5C",
    listings: [{}, {}, {}] as ListingPayload[],
    ...initialDraft
  });
  const [listings, setListings] = useState<WizardListing[]>(
    (initialDraft.listings?.length ? initialDraft.listings : [{}, {}, {}]) as WizardListing[]
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [micSupported, setMicSupported] = useState(false);
  const [origin, setOrigin] = useState(process.env.NEXT_PUBLIC_APP_URL || "https://yourapp.com");

  const stepIndex = Math.max(0, steps.indexOf(step));
  const fullUrl = `${origin.replace(/\/$/, "")}/${draft.slug || slugFromName(draft.name) || "your-link"}`;

  useEffect(() => {
    setMicSupported(typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window));
    if (!process.env.NEXT_PUBLIC_APP_URL) setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (step === "link") {
      QRCode.toDataURL(fullUrl, { width: 256, margin: 1 }).then(setQr).catch(() => setQr(null));
    }
  }, [fullUrl, step]);

  const previewDraft = useMemo(() => ({ ...draft, listings: listings as ListingPayload[] }), [draft, listings]);

  async function savePatch(patch: Partial<AgentSetupDraftData>, currentStep = step) {
    const next = { ...draft, ...patch };
    setDraft(next);
    await fetch("/api/setup/save-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_step: currentStep, data: patch })
    }).catch(() => undefined);
  }

  async function saveListings(nextListings: WizardListing[], currentStep = step) {
    setListings(nextListings);
    await fetch("/api/setup/save-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_step: currentStep, data: { listings: nextListings } })
    }).catch(() => undefined);
  }

  function go(nextStep: Step) {
    router.push(`/setup/${nextStep}`);
  }

  return (
    <main className="min-h-svh lg:grid lg:grid-cols-[minmax(0,1fr)_440px]">
      <section className="flex min-h-svh flex-col px-5 py-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3">
          {step !== "welcome" ? (
            <button
              className="agent-focus inline-flex h-11 w-11 items-center justify-center rounded-full border border-warm-border bg-white"
              onClick={() => go(steps[Math.max(0, stepIndex - 1)])}
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
          ) : null}
          <div className="h-1 flex-1 rounded-full bg-warm-border">
            <div
              className="h-1 rounded-full bg-[var(--agent-accent)] transition-all"
              style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-8">
          {error ? (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}
          {step === "welcome" ? <Welcome onNext={() => go("basics")} /> : null}
          {step === "basics" ? (
            <Basics draft={draft} savePatch={savePatch} onNext={() => go("voice")} />
          ) : null}
          {step === "voice" ? (
            <Voice
              draft={draft}
              micSupported={micSupported}
              busy={busy}
              setBusy={setBusy}
              savePatch={savePatch}
              onNext={() => go("listings")}
            />
          ) : null}
          {step === "listings" ? (
            <Listings
              listings={listings}
              saveListings={saveListings}
              busy={busy}
              setBusy={setBusy}
              onNext={() => {
                const neighborhoods = Array.from(
                  new Set(listings.map((listing) => listing.neighborhood).filter(Boolean) as string[])
                );
                savePatch({ neighborhoods: Array.from(new Set([...(draft.neighborhoods ?? []), ...neighborhoods])) }, "neighborhoods");
                go("neighborhoods");
              }}
            />
          ) : null}
          {step === "neighborhoods" ? (
            <Neighborhoods draft={draft} listings={listings} savePatch={savePatch} onNext={() => go("phone")} />
          ) : null}
          {step === "phone" ? (
            <PhoneStep draft={draft} savePatch={savePatch} busy={busy} setBusy={setBusy} onNext={() => go("link")} />
          ) : null}
          {step === "link" ? (
            <LinkStep
              draft={draft}
              fullUrl={fullUrl}
              qr={qr}
              busy={busy}
              setBusy={setBusy}
              slugAvailable={slugAvailable}
              setSlugAvailable={setSlugAvailable}
              savePatch={savePatch}
              setError={setError}
              onPublished={() => go("simulation")}
            />
          ) : null}
          {step === "simulation" ? <Simulation draft={draft} busy={busy} setBusy={setBusy} /> : null}
        </div>
      </section>
      <SetupPreview draft={previewDraft} />
    </main>
  );
}

function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-serif text-5xl leading-none">
          In 10 minutes, you&apos;ll have a page that turns your Instagram followers into qualified buyers.
        </h1>
        <p className="mt-5 text-warm-muted">Each step creates something visible: your page, your voice, your listings, then your first lead preview.</p>
      </div>
      <div className="grid gap-3 text-sm">
        {["Tell us about your market", "Add your first 3 listings", "Connect your phone for instant lead alerts", "Get your shareable link"].map((item) => (
          <p key={item} className="flex items-center gap-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--agent-accent-soft)] text-[var(--agent-accent)]">
              <Check size={14} />
            </span>
            {item}
          </p>
        ))}
      </div>
      <Button className="w-full gap-2" onClick={onNext}>Let&apos;s go <ArrowRight size={18} /></Button>
    </div>
  );
}

function Basics({
  draft,
  savePatch,
  onNext
}: {
  draft: Partial<AgentSetupDraftData>;
  savePatch: (patch: Partial<AgentSetupDraftData>) => Promise<void>;
  onNext: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    multiple: false,
    onDrop: async ([file]) => {
      if (!file) return;
      setUploading(true);
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/setup/headshot", { method: "POST", body: form });
      const json = await response.json();
      setUploading(false);
      if (response.ok) await savePatch({ headshotUrl: json.url });
    }
  });

  const ready = Boolean(draft.name && draft.market && draft.headshotUrl);
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-5xl leading-none">Basics first.</h1>
      <Field label="Full name" value={draft.name ?? ""} onChange={(name) => savePatch({ name, slug: draft.slug || slugFromName(name) })} />
      <label className="block">
        <span className="text-sm font-semibold">Market</span>
        <input
          list="cities"
          className="mt-2 h-14 w-full rounded-2xl border-warm-border bg-white px-4"
          value={draft.market ?? ""}
          onChange={(event) => savePatch({ market: event.target.value })}
          placeholder="Austin, TX"
        />
        <datalist id="cities">{cityOptions.map((city) => <option key={city} value={city} />)}</datalist>
      </label>
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-2xl border border-dashed border-warm-border bg-white/70 p-6 text-center",
          isDragActive && "border-[var(--agent-accent)] bg-[var(--agent-accent-soft)]"
        )}
      >
        <input {...getInputProps()} />
        <p className="font-semibold">{uploading ? "Cropping..." : draft.headshotUrl ? "Headshot ready" : "Drop a square headshot"}</p>
        <p className="mt-2 text-sm text-warm-muted">Minimum 400x400. We&apos;ll crop it to a clean 800px JPEG.</p>
      </div>
      <Button className="w-full gap-2" disabled={!ready} onClick={onNext}>Continue <ArrowRight size={18} /></Button>
    </div>
  );
}

function Voice(props: {
  draft: Partial<AgentSetupDraftData>;
  micSupported: boolean;
  busy: string | null;
  setBusy: (value: string | null) => void;
  savePatch: (patch: Partial<AgentSetupDraftData>) => Promise<void>;
  onNext: () => void;
}) {
  const [raw, setRaw] = useState(props.draft.voiceRaw ?? "");

  async function generate() {
    props.setBusy("voice");
    const response = await fetch("/api/setup/generate-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_text: raw, market: props.draft.market ?? "your market" })
    });
    const json = await response.json();
    props.setBusy(null);
    if (response.ok) {
      await props.savePatch({
        voiceRaw: raw,
        bio: json.voice.bio,
        headline: json.voice.headline,
        subHeadline: json.voice.sub_headline,
        voiceNotes: json.voice.voice_notes
      });
    }
  }

  function record() {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) return;
    const recognition = new Speech();
    recognition.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      setRaw((current) => `${current} ${event.results[0]?.[0]?.transcript ?? ""}`.trim());
    };
    recognition.start();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-5xl leading-none">What makes you different from every other agent in your market?</h1>
      <div className="relative">
        <textarea
          className="min-h-44 w-full rounded-2xl border-warm-border bg-white p-4 pr-14 leading-7"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder="e.g. I've lived in East Austin for 12 years, my listings sell 18% above asking, I work with first-time buyers a lot..."
        />
        {props.micSupported ? (
          <button className="absolute right-3 top-3 rounded-full border border-warm-border bg-white p-3" onClick={record} aria-label="Record voice memo">
            <Mic size={18} />
          </button>
        ) : null}
      </div>
      <Button className="w-full gap-2" disabled={raw.length < 20 || props.busy === "voice"} onClick={generate}>
        <Wand2 size={18} /> {props.busy === "voice" ? "Drafting..." : "Generate my page voice"}
      </Button>
      {props.draft.bio ? (
        <div className="grid gap-3">
          <EditableCard title="Bio" value={props.draft.bio} onChange={(bio) => props.savePatch({ bio })} />
          <EditableCard title="Headline" value={props.draft.headline ?? ""} onChange={(headline) => props.savePatch({ headline })} />
          <EditableCard title="Sub-headline" value={props.draft.subHeadline ?? ""} onChange={(subHeadline) => props.savePatch({ subHeadline })} />
          <Button className="w-full gap-2" onClick={props.onNext}>Continue <ArrowRight size={18} /></Button>
        </div>
      ) : null}
    </div>
  );
}

function Listings({
  listings,
  saveListings,
  busy,
  setBusy,
  onNext
}: {
  listings: WizardListing[];
  saveListings: (listings: WizardListing[]) => Promise<void>;
  busy: string | null;
  setBusy: (value: string | null) => void;
  onNext: () => void;
}) {
  const complete = listings.filter((listing) => listing.address && listing.price && listing.beds != null && listing.baths != null && listing.agent_note).length >= 3;
  async function patch(index: number, patchValue: WizardListing) {
    const next = listings.map((listing, itemIndex) => (itemIndex === index ? { ...listing, ...patchValue } : listing));
    await saveListings(next);
  }

  async function extract(index: number, url: string) {
    setBusy(`listing-${index}`);
    const response = await fetch("/api/setup/extract-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const json = await response.json();
    setBusy(null);
    if (response.ok) {
      await patch(index, {
        sourceUrl: url,
        videoUrl: json.listing.videoUrl,
        videoSource: json.listing.videoSource,
        extractMessage: json.listing.message
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-5xl leading-none">Add 3 of your recent listings.</h1>
        <p className="mt-4 text-warm-muted">Paste a link or fill in manually. The buyer feed preview fills in as you go.</p>
      </div>
      <div className="space-y-4">
        {listings.slice(0, 3).map((listing, index) => (
          <ListingEditor key={index} index={index} listing={listing} patch={patch} extract={extract} busy={busy === `listing-${index}`} />
        ))}
      </div>
      <Button className="w-full gap-2" disabled={!complete} onClick={onNext}>Continue <ArrowRight size={18} /></Button>
    </div>
  );
}

function Neighborhoods({
  draft,
  listings,
  savePatch,
  onNext
}: {
  draft: Partial<AgentSetupDraftData>;
  listings: WizardListing[];
  savePatch: (patch: Partial<AgentSetupDraftData>) => Promise<void>;
  onNext: () => void;
}) {
  const [input, setInput] = useState("");
  const selected = draft.neighborhoods ?? [];
  const suggestions = Array.from(new Set([...listings.map((listing) => listing.neighborhood).filter(Boolean), "Downtown", "North Loop", "Lakefront", "Westside"] as string[]));

  async function add(value: string) {
    const clean = value.trim();
    if (!clean || selected.includes(clean) || selected.length >= 15) return;
    await savePatch({ neighborhoods: [...selected, clean] });
    setInput("");
  }

  async function remove(value: string) {
    await savePatch({ neighborhoods: selected.filter((item) => item !== value) });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-5xl leading-none">Which neighborhoods do you cover?</h1>
      <div className="flex flex-wrap gap-2">
        {selected.map((item) => (
          <button key={item} className="rounded-full bg-[var(--agent-accent)] px-4 py-2 text-sm font-semibold text-white" onClick={() => remove(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="h-14 flex-1 rounded-2xl border-warm-border bg-white px-4" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Add neighborhood" />
        <Button variant="secondary" onClick={() => add(input)}><Plus size={18} /></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.filter(Boolean).map((item) => (
          <button key={item} className="rounded-full border border-warm-border bg-white px-4 py-2 text-sm" onClick={() => add(item)}>
            {item}
          </button>
        ))}
      </div>
      <Button className="w-full gap-2" disabled={selected.length < 4} onClick={onNext}>Continue <ArrowRight size={18} /></Button>
    </div>
  );
}

function PhoneStep(props: {
  draft: Partial<AgentSetupDraftData>;
  savePatch: (patch: Partial<AgentSetupDraftData>) => Promise<void>;
  busy: string | null;
  setBusy: (value: string | null) => void;
  onNext: () => void;
}) {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);

  async function send() {
    props.setBusy("phone-send");
    const response = await fetch("/api/setup/phone/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: props.draft.phone })
    });
    props.setBusy(null);
    if (response.ok) setSent(true);
  }

  async function check() {
    props.setBusy("phone-check");
    const response = await fetch("/api/setup/phone/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    props.setBusy(null);
    if (response.ok) {
      await props.savePatch({ phoneVerified: true });
      props.onNext();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-5xl leading-none">Where should buyer notifications go?</h1>
        <p className="mt-4 text-warm-muted">We&apos;ll text you when a verified buyer requests a showing.</p>
      </div>
      <Field label="Phone" value={props.draft.phone ?? ""} onChange={(phone) => props.savePatch({ phone })} placeholder="+1 512 555 0141" />
      <Button className="w-full gap-2" disabled={!props.draft.phone || props.busy === "phone-send"} onClick={send}><Phone size={18} /> Send verification code</Button>
      {sent ? (
        <div className="space-y-3">
          <Field label="6-digit code" value={code} onChange={setCode} placeholder="123456" />
          <Button className="w-full" disabled={code.length < 4 || props.busy === "phone-check"} onClick={check}>Verify phone</Button>
          <p className="text-sm text-warm-muted">Local preview accepts 123456.</p>
        </div>
      ) : null}
    </div>
  );
}

function LinkStep(props: {
  draft: Partial<AgentSetupDraftData>;
  fullUrl: string;
  qr: string | null;
  busy: string | null;
  setBusy: (value: string | null) => void;
  slugAvailable: boolean | null;
  setSlugAvailable: (value: boolean | null) => void;
  savePatch: (patch: Partial<AgentSetupDraftData>) => Promise<void>;
  setError: (value: string | null) => void;
  onPublished: () => void;
}) {
  async function checkSlug(slug: string) {
    props.setSlugAvailable(null);
    const response = await fetch("/api/setup/check-slug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug })
    });
    const json = await response.json();
    props.setSlugAvailable(Boolean(json.available));
  }

  async function publish() {
    props.setBusy("publish");
    props.setError(null);
    const response = await fetch("/api/setup/complete", { method: "POST" });
    const json = await response.json();
    props.setBusy(null);
    if (!response.ok) {
      props.setError(json.error ?? "Unable to publish");
      return;
    }
    props.onPublished();
    window.setTimeout(() => {
      if (window.location.pathname !== "/setup/simulation") window.location.assign("/setup/simulation");
    }, 50);
  }

  const slug = props.draft.slug || slugFromName(props.draft.name);
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-5xl leading-none">Your page is live.</h1>
      <label className="block">
        <span className="text-sm font-semibold">Slug</span>
        <input
          className="mt-2 h-14 w-full rounded-2xl border-warm-border bg-white px-4"
          value={slug}
          onChange={(event) => {
            const next = event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
            props.savePatch({ slug: next });
            checkSlug(next);
          }}
        />
      </label>
      {props.slugAvailable === false ? <p className="text-sm text-red-700">That link is taken.</p> : null}
      <div className="rounded-2xl border border-warm-border bg-white p-4">
        <p className="flex items-center gap-2 text-sm text-warm-muted"><LinkIcon size={16} /> Shareable URL</p>
        <p className="mt-2 break-all font-semibold">{props.fullUrl}</p>
      </div>
      {props.qr ? <img className="mx-auto h-40 w-40 rounded-2xl border border-warm-border" src={props.qr} alt="QR code" /> : null}
      <div className="grid gap-2 sm:grid-cols-3">
        {["Instagram", "TikTok", "Linktree"].map((label) => (
          <button key={label} className="rounded-2xl border border-warm-border bg-white px-4 py-3 text-sm font-semibold" onClick={() => navigator.clipboard.writeText(props.fullUrl)}>
            Add to {label}
          </button>
        ))}
      </div>
      <Button className="w-full gap-2" disabled={props.slugAvailable === false || props.busy === "publish"} onClick={publish}>
        {props.busy === "publish" ? "Publishing..." : "Publish and continue"}
        <ArrowRight size={18} />
      </Button>
    </div>
  );
}

function Simulation({ draft, busy, setBusy }: { draft: Partial<AgentSetupDraftData>; busy: string | null; setBusy: (value: string | null) => void }) {
  async function sendSample() {
    setBusy("sample");
    await fetch("/api/setup/simulation-sms", { method: "POST" });
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-5xl leading-none">Here&apos;s what your first lead will look like.</h1>
      <div className="rounded-2xl border border-warm-border bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Sarah M.</p>
            <p className="text-sm text-warm-muted">Warm buyer • last active now</p>
          </div>
          <span className="rounded-full bg-[var(--agent-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--agent-accent)]">warm</span>
        </div>
        <p className="mt-5 font-serif text-2xl">Relocating buyer, 3BR, office, wants a clear short list.</p>
        <div className="mt-4 rounded-2xl bg-[#FAFAF7] p-4 text-sm">
          Hi Sarah, it’s {draft.name?.split(" ")[0] || "me"}. I saw the office and commute notes, and I’d start with the first two homes in your feed before we widen the search.
        </div>
      </div>
      <Button className="w-full" variant="secondary" disabled={busy === "sample"} onClick={sendSample}>Send sample text to my phone</Button>
      <LinkButton className="w-full gap-2" href="/dashboard">Take me to my dashboard <ArrowRight size={18} /></LinkButton>
    </div>
  );
}

function ListingEditor(props: {
  index: number;
  listing: WizardListing;
  patch: (index: number, patch: WizardListing) => Promise<void>;
  extract: (index: number, url: string) => Promise<void>;
  busy: boolean;
}) {
  const [url, setUrl] = useState(props.listing.sourceUrl ?? "");
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-4">
      <p className="mb-3 text-sm font-semibold">Listing {props.index + 1}</p>
      <div className="flex gap-2">
        <input className="h-12 flex-1 rounded-2xl border-warm-border px-3" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Paste Instagram, TikTok, MLS, or mp4 link" />
        <Button variant="secondary" disabled={!url || props.busy} onClick={() => props.extract(props.index, url)}>Use</Button>
      </div>
      {props.listing.extractMessage ? <p className="mt-2 text-sm text-warm-muted">{props.listing.extractMessage}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SmallInput label="Address" value={props.listing.address ?? ""} onChange={(address) => props.patch(props.index, { address })} className="sm:col-span-2" />
        <SmallInput label="Price" value={props.listing.price ? String(props.listing.price) : ""} onChange={(price) => props.patch(props.index, { price: Number(price.replace(/\D/g, "")) || undefined })} />
        <SmallInput label="Neighborhood" value={props.listing.neighborhood ?? ""} onChange={(neighborhood) => props.patch(props.index, { neighborhood })} />
        <SmallInput label="Beds" value={props.listing.beds != null ? String(props.listing.beds) : ""} onChange={(beds) => props.patch(props.index, { beds: Number(beds) || undefined })} />
        <SmallInput label="Baths" value={props.listing.baths != null ? String(props.listing.baths) : ""} onChange={(baths) => props.patch(props.index, { baths: Number(baths) || undefined })} />
        <SmallInput label="Sqft" value={props.listing.sqft ? String(props.listing.sqft) : ""} onChange={(sqft) => props.patch(props.index, { sqft: Number(sqft) || null })} />
        <SmallInput label="Video URL" value={props.listing.videoUrl ?? ""} onChange={(videoUrl) => props.patch(props.index, { videoUrl, videoSource: videoUrl.endsWith(".mp4") ? "mp4" : props.listing.videoSource })} />
      </div>
      <ChipEditor title="Features" options={MUST_HAVES} selected={props.listing.features ?? []} onChange={(features) => props.patch(props.index, { features })} />
      <ChipEditor title="Deal-breaker flags" options={DEAL_BREAKERS} selected={props.listing.dealBreakerFlags ?? []} onChange={(dealBreakerFlags) => props.patch(props.index, { dealBreakerFlags })} />
      <textarea
        className="mt-4 min-h-20 w-full rounded-2xl border-warm-border p-3"
        value={props.listing.agent_note ?? ""}
        onChange={(event) => props.patch(props.index, { agent_note: event.target.value })}
        placeholder="Your take on this property"
      />
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={props.listing.isPocket ?? false} onChange={(event) => props.patch(props.index, { isPocket: event.target.checked })} />
        Off-market or pocket listing
      </label>
      {props.listing.price ? <p className="mt-3 text-sm text-warm-muted">Preview price: {formatCurrency(props.listing.price)}</p> : null}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void | Promise<void>; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input className="mt-2 h-14 w-full rounded-2xl border-warm-border bg-white px-4" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function SmallInput({ label, value, onChange, className }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={className}>
      <span className="text-xs font-semibold text-warm-muted">{label}</span>
      <input className="mt-1 h-11 w-full rounded-xl border-warm-border px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function EditableCard({ title, value, onChange }: { title: string; value: string; onChange: (value: string) => void | Promise<void> }) {
  return (
    <label className="block rounded-2xl border border-warm-border bg-white p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-warm-muted">{title}</span>
      <textarea className="mt-2 min-h-20 w-full border-0 bg-transparent p-0 text-sm leading-6 focus:ring-0" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ChipEditor<T extends readonly string[]>({ title, options, selected, onChange }: { title: string; options: T; selected: string[]; onChange: (values: string[]) => void }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold text-warm-muted">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-semibold",
                active ? "border-[var(--agent-accent)] bg-[var(--agent-accent-soft)]" : "border-warm-border bg-white"
              )}
              onClick={() => onChange(active ? selected.filter((item) => item !== option) : [...selected, option])}
            >
              {option.replaceAll("_", " ")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function slugFromName(name?: string) {
  return (name ?? "")
    .toLowerCase()
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[^a-z0-9-]/g, "");
}

declare global {
  interface Window {
    SpeechRecognition?: new () => { onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; start: () => void };
    webkitSpeechRecognition?: new () => { onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; start: () => void };
  }
}
