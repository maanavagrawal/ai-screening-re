"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useId, useMemo, useRef, useState, type FocusEvent } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import QRCode from "qrcode";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Check,
  Link as LinkIcon,
  Mic,
  Phone,
  Plus,
  Search,
  Tag,
  Trash2,
  Wand2
} from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { SetupPreview } from "@/components/setup/setup-preview";
import { DEAL_BREAKERS, MUST_HAVES } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/formatting";
import { clearedListingEnrichment } from "@/lib/listing-enrichment";
import type { AgentSetupDraftData, ListingPayload, SelectedArea } from "@/lib/types";
import type { AddressSuggestion, PropertyLookupResult } from "@/lib/property/lookup";

const steps = ["welcome", "basics", "voice", "listings", "neighborhoods", "phone", "link", "simulation"] as const;
type Step = (typeof steps)[number];

type WizardListing = Partial<ListingPayload> & {
  sourceText?: string;
  extractDetailsMessage?: string;
  propertyLookupMessage?: string;
  propertyLookupFailed?: boolean;
};

export function SetupWizard({
  step,
  initialDraft
}: {
  step: Step;
  initialDraft: Partial<AgentSetupDraftData>;
}) {
  const router = useRouter();
  const initialListings = compactWizardListings(initialDraft.listings as WizardListing[] | undefined);
  const [draft, setDraft] = useState<Partial<AgentSetupDraftData>>({
    accentColor: "#C97B5C",
    ...initialDraft,
    listings: initialListings as ListingPayload[]
  });
  const [listings, setListings] = useState<WizardListing[]>(
    initialListings
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [micSupported, setMicSupported] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [origin, setOrigin] = useState(process.env.NEXT_PUBLIC_APP_URL || "https://yourapp.com");

  const stepIndex = Math.max(0, steps.indexOf(step));
  const fullUrl = `${origin.replace(/\/$/, "")}/${draft.slug || slugFromName(draft.name) || "your-link"}`;

  useEffect(() => {
    setClientReady(true);
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
      <span className="sr-only" data-testid="setup-ready">{clientReady ? "ready" : "loading"}</span>
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
              neighborhoods={draft.neighborhoods ?? []}
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
        {["Tell us about your market", "Add your listings", "Connect your phone for instant lead alerts", "Get your shareable link"].map((item) => (
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
  const [marketInput, setMarketInput] = useState(draft.market ?? "");
  const [marketSuggestions, setMarketSuggestions] = useState<SelectedArea[]>([]);
  const [marketSuggestionsOpen, setMarketSuggestionsOpen] = useState(false);
  const [marketSuggestionsBusy, setMarketSuggestionsBusy] = useState(false);
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

  useEffect(() => {
    setMarketInput(draft.market ?? "");
  }, [draft.market]);

  useEffect(() => {
    if (!marketSuggestionsOpen) return;
    const query = marketInput.trim();
    if (query.length < 2) {
      setMarketSuggestions([]);
      setMarketSuggestionsBusy(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setMarketSuggestionsBusy(true);
      try {
        const response = await fetch("/api/setup/location-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, scope: "market" }),
          signal: controller.signal
        });
        const json = (await response.json().catch(() => null)) as { suggestions?: SelectedArea[] } | null;
        if (!controller.signal.aborted) {
          setMarketSuggestions(response.ok ? (json?.suggestions ?? []) : []);
        }
      } catch {
        if (!controller.signal.aborted) setMarketSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setMarketSuggestionsBusy(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [marketInput, marketSuggestionsOpen]);

  async function commitMarket(value: string) {
    const clean = value.trim();
    if (clean === (draft.market ?? "")) return;
    await savePatch({ market: clean });
  }

  async function selectMarket(suggestion: SelectedArea) {
    const nextMarket = marketLabelFromSuggestion(suggestion);
    setMarketInput(nextMarket);
    setMarketSuggestions([]);
    setMarketSuggestionsOpen(false);
    await commitMarket(nextMarket);
  }

  async function continueBasics() {
    await commitMarket(marketInput);
    onNext();
  }

  const ready = Boolean(draft.name && marketInput.trim() && draft.headshotUrl);
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-5xl leading-none">Basics first.</h1>
      <Field label="Full name" value={draft.name ?? ""} onChange={(name) => savePatch({ name, slug: draft.slug || slugFromName(name) })} />
      <div className="block">
        <span className="text-sm font-semibold">Market</span>
        <div className="mt-2">
          <SetupLocationCombobox
            value={marketInput}
            suggestions={marketSuggestions}
            suggestionsOpen={marketSuggestionsOpen}
            suggestionsBusy={marketSuggestionsBusy}
            ariaLabel="Market"
            placeholder="Start typing your city"
            loadingLabel="Finding cities..."
            onChange={(value) => {
              setMarketInput(value);
              setMarketSuggestionsOpen(value.trim().length >= 2);
            }}
            onFocus={() => setMarketSuggestionsOpen(marketInput.trim().length >= 2)}
            onBlur={() => {
              window.setTimeout(() => setMarketSuggestionsOpen(false), 120);
              void commitMarket(marketInput);
            }}
            onEnterFirstSuggestion={() => {
              if (marketSuggestions[0]) void selectMarket(marketSuggestions[0]);
              else void commitMarket(marketInput);
            }}
            onSelect={(suggestion) => void selectMarket(suggestion)}
          />
        </div>
      </div>
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
      <Button className="w-full gap-2" disabled={!ready} onClick={() => void continueBasics()}>Continue <ArrowRight size={18} /></Button>
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
  neighborhoods,
  saveListings,
  busy,
  setBusy,
  onNext
}: {
  listings: WizardListing[];
  neighborhoods: string[];
  saveListings: (listings: WizardListing[]) => Promise<void>;
  busy: string | null;
  setBusy: (value: string | null) => void;
  onNext: () => void;
}) {
  const [listingKeys, setListingKeys] = useState<string[]>(() => listings.map(createListingClientKey));
  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(
    () => new Set(listings.map((listing, index) => (listingComplete(listing) ? null : index)).filter((index): index is number => index != null))
  );
  const listingsRef = useRef(listings);
  const listingKeysRef = useRef(listingKeys);
  const completeCount = listings.filter(listingComplete).length;
  const complete = completeCount >= 1;

  useEffect(() => {
    listingsRef.current = listings;
    setListingKeys((current) => {
      let next = current;
      if (current.length > listings.length) next = current.slice(0, listings.length);
      if (current.length < listings.length) next = [...current, ...Array.from({ length: listings.length - current.length }, createListingClientKey)];
      listingKeysRef.current = next;
      return next;
    });
  }, [listings]);

  async function patch(clientKey: string, patchValue: WizardListing) {
    const index = listingKeysRef.current.indexOf(clientKey);
    if (index === -1) return;
    const currentListings = listingsRef.current;
    if (!currentListings[index]) return;
    const next = currentListings.map((listing, itemIndex) => (itemIndex === index ? { ...listing, ...patchValue } : listing));
    listingsRef.current = next;
    await saveListings(next);
  }

  async function addListing() {
    const next = [...listingsRef.current, {}];
    const nextKeys = [...listingKeysRef.current, createListingClientKey()];
    listingsRef.current = next;
    listingKeysRef.current = nextKeys;
    setListingKeys(nextKeys);
    setExpandedIndexes((current) => new Set([...current, next.length - 1]));
    await saveListings(next);
  }

  async function removeListing(index: number) {
    const next = listingsRef.current.filter((_, itemIndex) => itemIndex !== index);
    const nextKeys = listingKeysRef.current.filter((_, itemIndex) => itemIndex !== index);
    listingsRef.current = next;
    listingKeysRef.current = nextKeys;
    setListingKeys(nextKeys);
    setExpandedIndexes((current) => {
      const shifted = new Set<number>();
      current.forEach((itemIndex) => {
        if (itemIndex < index) shifted.add(itemIndex);
        if (itemIndex > index) shifted.add(itemIndex - 1);
      });
      return shifted;
    });
    await saveListings(next);
  }

  function toggleListing(index: number) {
    setExpandedIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function extractDetails(clientKey: string, text: string) {
    setBusy(`listing-details-${clientKey}`);
    const response = await fetch("/api/setup/extract-listing-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, neighborhoods })
    });
    const json = await response.json();
    setBusy(null);
    if (response.ok) {
      const details = json.details as Partial<ListingPayload> & {
        dealBreakerFlags?: string[];
        confidence?: number;
      };
      const nextPatch: WizardListing = {
        extractDetailsMessage: details.confidence && details.confidence >= 0.75 ? "Filled the key fields. Give it a quick scan." : "Filled what I could find. Add anything missing below."
      };
      if (details.address) nextPatch.address = details.address;
      if (details.price) nextPatch.price = details.price;
      if (details.beds != null) nextPatch.beds = details.beds;
      if (details.baths != null) nextPatch.baths = details.baths;
      if (details.sqft) nextPatch.sqft = details.sqft;
      if (details.neighborhood) nextPatch.neighborhood = details.neighborhood;
      if (details.property_type) nextPatch.property_type = details.property_type;
      if (details.features?.length) nextPatch.features = details.features;
      if (details.dealBreakerFlags?.length) nextPatch.dealBreakerFlags = details.dealBreakerFlags;
      if (details.description) nextPatch.description = details.description;
      if (details.agent_note) nextPatch.agent_note = details.agent_note;
      await patch(clientKey, nextPatch);
    } else {
      await patch(clientKey, { extractDetailsMessage: json.error ?? "Could not read those details." });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-5xl leading-none">Add listings.</h1>
        <p className="mt-4 text-warm-muted">Start with an address. We&apos;ll pull public facts first, then you can edit anything that needs a human read.</p>
      </div>
      {listings.length ? (
        <div className="space-y-4">
          {listings.map((listing, index) => (
            <ListingEditor
              key={listingKeys[index] ?? `listing-${index}`}
              clientKey={listingKeys[index] ?? ""}
              index={index}
              listing={listing}
              expanded={expandedIndexes.has(index)}
              onToggle={() => toggleListing(index)}
              onRemove={() => void removeListing(index)}
              patch={patch}
              extractDetails={extractDetails}
              detailsBusy={busy === `listing-details-${listingKeys[index]}`}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-warm-border bg-white/70 p-5">
          <p className="font-serif text-2xl">Start with the first address.</p>
          <p className="mt-2 text-sm leading-6 text-warm-muted">
            Add one listing now, or keep adding more as you go. Each card can collapse after the important fields are in.
          </p>
          <Button className="mt-4 gap-2" onClick={() => void addListing()}>
            <Plus size={18} />
            Add listing
          </Button>
        </div>
      )}
      {listings.length ? (
        <Button className="w-full gap-2" variant="secondary" onClick={() => void addListing()}>
          <Plus size={18} />
          Add another listing
        </Button>
      ) : null}
      <div className="space-y-2">
        <Button className="w-full gap-2" disabled={!complete} onClick={onNext}>Continue <ArrowRight size={18} /></Button>
        {!complete ? <p className="text-center text-sm text-warm-muted">Add at least one complete listing to continue.</p> : null}
      </div>
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
  const [suggestions, setSuggestions] = useState<SelectedArea[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const selected = useMemo(() => draft.neighborhoods ?? [], [draft.neighborhoods]);
  const quickPicks = useMemo(
    () => Array.from(new Set([...listings.map((listing) => listing.neighborhood).filter(Boolean), "Downtown", "North Loop", "Lakefront", "Westside"] as string[])),
    [listings]
  );

  useEffect(() => {
    if (!suggestionsOpen) return;
    const query = input.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSuggestionsBusy(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSuggestionsBusy(true);
      try {
        const response = await fetch("/api/setup/location-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            market: draft.market ?? "",
            neighborhoods: selected
          }),
          signal: controller.signal
        });
        const json = (await response.json().catch(() => null)) as { suggestions?: SelectedArea[] } | null;
        if (!controller.signal.aborted) {
          setSuggestions(response.ok ? (json?.suggestions ?? []) : []);
        }
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSuggestionsBusy(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [draft.market, input, selected, suggestionsOpen]);

  async function add(value: string) {
    const clean = value.trim();
    if (!clean || selected.some((item) => normalizeLocationLabel(item) === normalizeLocationLabel(clean)) || selected.length >= 15) return;
    await savePatch({ neighborhoods: [...selected, clean] });
    setInput("");
    setSuggestions([]);
    setSuggestionsOpen(false);
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
        <SetupLocationCombobox
          value={input}
          suggestions={suggestions}
          suggestionsOpen={suggestionsOpen}
          suggestionsBusy={suggestionsBusy}
          onChange={(value) => {
            setInput(value);
            setSuggestionsOpen(value.trim().length >= 2);
          }}
          onFocus={() => setSuggestionsOpen(input.trim().length >= 2)}
          onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 120)}
          onEnterFirstSuggestion={() => {
            if (suggestions[0]) void add(suggestions[0].label);
            else void add(input);
          }}
          onSelect={(suggestion) => void add(suggestion.label)}
        />
        <Button variant="secondary" onClick={() => add(input)} aria-label="Add typed neighborhood"><Plus size={18} /></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {quickPicks.filter(Boolean).map((item) => (
          <button key={item} className="rounded-full border border-warm-border bg-white px-4 py-2 text-sm" onClick={() => add(item)}>
            {item}
          </button>
        ))}
      </div>
      <Button className="w-full gap-2" disabled={selected.length < 1} onClick={onNext}>Continue <ArrowRight size={18} /></Button>
    </div>
  );
}

function SetupLocationCombobox({
  value,
  suggestions,
  suggestionsOpen,
  suggestionsBusy,
  ariaLabel = "Add neighborhood",
  placeholder = "Add city or neighborhood",
  loadingLabel = "Finding areas...",
  onChange,
  onFocus,
  onBlur,
  onEnterFirstSuggestion,
  onSelect
}: {
  value: string;
  suggestions: SelectedArea[];
  suggestionsOpen: boolean;
  suggestionsBusy: boolean;
  ariaLabel?: string;
  placeholder?: string;
  loadingLabel?: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onEnterFirstSuggestion: () => void;
  onSelect: (suggestion: SelectedArea) => void;
}) {
  const inputId = useId();
  const listboxId = `${inputId}-suggestions`;
  const showDropdown = suggestionsOpen && (suggestionsBusy || suggestions.length > 0);
  const hasGoogleSuggestions = suggestions.some((suggestion) => suggestion.source === "google_places");

  return (
    <div className="relative flex-1">
      <input
        id={inputId}
        className="h-14 w-full rounded-2xl border-warm-border bg-white px-4"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onEnterFirstSuggestion();
          }
        }}
        role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          placeholder={placeholder}
        />
      {showDropdown ? (
        <div
          id={listboxId}
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-warm-border bg-white text-sm shadow-soft"
          role="listbox"
        >
          {suggestionsBusy && !suggestions.length ? (
            <p className="px-4 py-3 text-warm-muted">{loadingLabel}</p>
          ) : null}
          {suggestions.map((suggestion) => (
            <button
              key={setupLocationKey(suggestion)}
              className="block w-full border-b border-warm-border px-4 py-3 text-left last:border-b-0 hover:bg-[#FAFAF7]"
              type="button"
              role="option"
              aria-selected="false"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(suggestion)}
            >
              <span className="block font-semibold">{suggestion.label}</span>
              {suggestion.parentLabel ? (
                <span className="mt-1 block text-xs text-warm-muted">{suggestion.parentLabel}</span>
              ) : null}
            </button>
          ))}
          {hasGoogleSuggestions ? (
            <p className="bg-[#FAFAF7] px-4 py-2 text-right text-[11px] font-semibold text-warm-muted">Powered by Google</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function setupLocationKey(area: SelectedArea) {
  return area.placeId?.trim() || [area.source, area.type, normalizeLocationLabel(area.label), normalizeLocationLabel(area.parentLabel ?? "")].join(":");
}

function normalizeLocationLabel(value: string) {
  return value.trim().toLowerCase();
}

function marketLabelFromSuggestion(suggestion: SelectedArea) {
  if (!suggestion.parentLabel || suggestion.label.includes(suggestion.parentLabel)) return suggestion.label;
  return `${suggestion.label}, ${suggestion.parentLabel}`;
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
  const [message, setMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function send() {
    props.setBusy("phone-send");
    setMessage(null);
    setDevCode(null);
    const response = await fetch("/api/setup/phone/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: props.draft.phone })
    });
    props.setBusy(null);
    const body = (await response.json().catch(() => null)) as { error?: string; devCode?: string } | null;
    if (response.ok) {
      setSent(true);
      setDevCode(body?.devCode ?? null);
      setMessage("Code sent. Enter it below to verify this number.");
    } else {
      setSent(false);
      setMessage(body?.error ?? "We could not send that verification code. Please try again.");
    }
  }

  async function check() {
    props.setBusy("phone-check");
    setMessage(null);
    const response = await fetch("/api/setup/phone/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    props.setBusy(null);
    if (response.ok) {
      await props.savePatch({ phoneVerified: true });
      props.onNext();
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error ?? "That code did not work. Please check it and try again.");
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
      {message ? (
        <p className={cn("rounded-2xl border px-4 py-3 text-sm", sent ? "border-warm-border bg-white text-warm-muted" : "border-red-200 bg-red-50 text-red-800")}>
          {message}
        </p>
      ) : null}
      {sent ? (
        <div className="space-y-3">
          <Field label="6-digit code" value={code} onChange={setCode} placeholder="123456" />
          <Button className="w-full" disabled={code.length < 4 || props.busy === "phone-check"} onClick={check}>Verify phone</Button>
          {devCode ? <p className="text-sm text-warm-muted">Local preview accepts {devCode}.</p> : null}
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
        {[
          ["Instagram bio", `${props.fullUrl}?src=instagram_bio`],
          ["TikTok bio", `${props.fullUrl}?src=tiktok_bio`],
          ["Linktree button", `${props.fullUrl}?src=linktree`]
        ].map(([label, url]) => (
          <button
            key={label}
            className="flex min-h-14 items-center justify-between gap-3 rounded-full border border-warm-border bg-white px-4 py-2 text-left text-sm font-semibold shadow-soft"
            onClick={() => navigator.clipboard.writeText(url)}
          >
            <span className="inline-flex items-center gap-2">
              <Tag size={15} className="text-[var(--agent-accent)]" />
              {label}
            </span>
            <span className="rounded-full bg-[var(--agent-accent-soft)] px-3 py-1 text-xs text-[var(--agent-accent)]">copy</span>
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
  clientKey: string;
  index: number;
  listing: WizardListing;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  patch: (clientKey: string, patch: WizardListing) => Promise<void>;
  extractDetails: (clientKey: string, text: string) => Promise<void>;
  detailsBusy: boolean;
}) {
  const [sourceText, setSourceText] = useState(props.listing.sourceText ?? "");
  const [addressInput, setAddressInput] = useState(props.listing.address ?? "");
  const contentId = useId();
  const lastSyncedAddress = useRef(props.listing.address ?? "");
  const [propertyBusy, setPropertyBusy] = useState(false);
  const [propertyResult, setPropertyResult] = useState<PropertyLookupResult | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const [detailsUnlocked, setDetailsUnlocked] = useState(() => listingDetailsUnlocked(props.listing));
  const [textFallbackOpen, setTextFallbackOpen] = useState(
    () => Boolean(props.listing.sourceText || props.listing.extractDetailsMessage || props.listing.propertyLookupFailed)
  );
  const skipNextAddressBlurCommit = useRef(false);
  const selectedAddressPlaceId = useRef<string | null>(null);
  const clearedDuringAddressEdit = useRef(false);

  useEffect(() => {
    const nextAddress = props.listing.address ?? "";
    if (nextAddress === lastSyncedAddress.current) return;
    lastSyncedAddress.current = nextAddress;
    setAddressInput(nextAddress);
  }, [props.listing.address]);

  useEffect(() => {
    if (listingDetailsUnlocked(props.listing)) setDetailsUnlocked(true);
  }, [props.listing]);

  useEffect(() => {
    if (props.listing.propertyLookupFailed) setTextFallbackOpen(true);
  }, [props.listing.propertyLookupFailed]);

  useEffect(() => {
    if (!suggestionsOpen) return;
    const query = addressInput.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setSuggestionsBusy(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSuggestionsBusy(true);
      try {
        const response = await fetch("/api/listing-address-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: controller.signal
        });
        const json = (await response.json().catch(() => null)) as { suggestions?: AddressSuggestion[] } | null;
        if (!controller.signal.aborted) {
          setAddressSuggestions(response.ok ? (json?.suggestions ?? []) : []);
        }
      } catch {
        if (!controller.signal.aborted) setAddressSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSuggestionsBusy(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [addressInput, suggestionsOpen]);

  async function lookupAndApplyProperty(address = addressInput, placeId = selectedAddressPlaceId.current) {
    const cleanAddress = address.trim();
    if (!cleanAddress) return;
    setDetailsUnlocked(true);
    setPropertyBusy(true);
    setPropertyResult(null);
    const addressChanged = await commitAddress(cleanAddress);
    try {
      const response = await fetch("/api/listing-property-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: cleanAddress, placeId: placeId || undefined })
      });
      const json = (await response.json().catch(() => null)) as { result?: PropertyLookupResult; error?: string } | null;
      if (response.ok && json?.result) {
        setPropertyResult(json.result);
        if (json.result.propertyDataSource === "manual" || !hasStructuredPropertyFacts(json.result)) setTextFallbackOpen(true);
        await applyPropertyFacts(json.result, cleanAddress, addressChanged);
      } else {
        setTextFallbackOpen(true);
        await props.patch(props.clientKey, {
          ...(addressChanged ? clearedAddressSpecificListingFields() : {}),
          ...(addressChanged ? clearedListingEnrichment() : {}),
          address: cleanAddress,
          propertyLookupMessage: json?.error ?? "Could not look up property facts.",
          propertyLookupFailed: true
        });
      }
    } catch {
      setTextFallbackOpen(true);
      await props.patch(props.clientKey, {
        ...(addressChanged ? clearedAddressSpecificListingFields() : {}),
        ...(addressChanged ? clearedListingEnrichment() : {}),
        address: cleanAddress,
        propertyLookupMessage: "Could not look up property facts.",
        propertyLookupFailed: true
      });
    } finally {
      setPropertyBusy(false);
    }
  }

  function updateAddress(address: string) {
    selectedAddressPlaceId.current = null;
    setAddressInput(address);
    setPropertyResult(null);
    setAddressSuggestions([]);
    setSuggestionsOpen(address.trim().length >= 3);
    setDetailsUnlocked((current) => current && listingDetailsUnlocked(props.listing));
    if (shouldClearAddressSpecificListingFields(address, lastSyncedAddress.current, props.listing) && !clearedDuringAddressEdit.current) {
      clearedDuringAddressEdit.current = true;
      void props.patch(props.clientKey, {
        address,
        ...clearedAddressSpecificListingFields(),
        ...clearedListingEnrichment(),
        propertyLookupMessage: undefined,
        propertyLookupFailed: false
      });
    }
  }

  async function commitAddress(address: string) {
    const cleanAddress = address.trim();
    if (cleanAddress === lastSyncedAddress.current) {
      clearedDuringAddressEdit.current = false;
      return false;
    }
    lastSyncedAddress.current = cleanAddress;
    clearedDuringAddressEdit.current = false;
    await props.patch(props.clientKey, {
      address: cleanAddress,
      ...clearedAddressSpecificListingFields(),
      ...clearedListingEnrichment(),
      propertyLookupMessage: undefined,
      propertyLookupFailed: false
    });
    return true;
  }

  async function selectAddressSuggestion(suggestion: AddressSuggestion) {
    selectedAddressPlaceId.current = suggestion.placeId ?? null;
    setAddressInput(suggestion.label);
    setSuggestionsOpen(false);
    setAddressSuggestions([]);
    setDetailsUnlocked(true);
    await lookupAndApplyProperty(suggestion.label, suggestion.placeId ?? null);
  }

  async function applyPropertyFacts(result: PropertyLookupResult, fallbackAddress = addressInput, addressChanged = false) {
    const facts = result.propertyFacts ?? {};
    const lookupFailed = result.propertyDataSource === "manual" || !hasStructuredPropertyFacts(result);
    const existingListing: WizardListing = addressChanged ? {} : props.listing;
    const neighborhood =
      result.normalizedAddress?.city && (!lookupFailed || addressChanged)
        ? result.normalizedAddress.city
        : existingListing.neighborhood;
    await props.patch(props.clientKey, {
      ...(addressChanged ? clearedAddressSpecificListingFields() : {}),
      attomId: result.attomId ?? null,
      propertyDataSource: result.propertyDataSource,
      propertyEnrichedAt: result.propertyEnrichedAt,
      propertyMatchConfidence: result.propertyMatchConfidence,
      normalizedAddress: result.normalizedAddress,
      propertyFacts: result.propertyFacts,
      propertyOverrideFields: [],
      propertyLookupMessage: result.message,
      propertyLookupFailed: lookupFailed,
      address: result.normalizedAddress?.label ?? fallbackAddress,
      neighborhood: neighborhood || undefined,
      beds: facts.beds ?? existingListing.beds ?? undefined,
      baths: facts.baths ?? existingListing.baths ?? undefined,
      sqft: facts.sqft ?? existingListing.sqft ?? null,
      property_type: propertyTypeValue(facts.propertyType) || existingListing.property_type || undefined
    });
  }

  async function fillFromText() {
    setDetailsUnlocked(true);
    await props.extractDetails(props.clientKey, sourceText);
  }

  function handleAddressBlur(event: FocusEvent<HTMLInputElement>) {
    const nextTarget = event.relatedTarget;
    const leavingForLookup =
      nextTarget instanceof HTMLElement &&
      nextTarget.dataset.setupLookupButton === String(props.index);
    window.setTimeout(() => setSuggestionsOpen(false), 120);
    if (leavingForLookup || skipNextAddressBlurCommit.current) {
      skipNextAddressBlurCommit.current = false;
      return;
    }
    void commitAddress(addressInput);
  }

  const showDetails = detailsUnlocked || listingDetailsUnlocked(props.listing);
  const cardStatus = listingComplete(props.listing) ? "Complete" : showDetails ? "Needs details" : "Address first";
  const showLookupStatus = Boolean(propertyResult || props.listing.propertyLookupMessage);
  const lookupFactLine = propertyResult
    ? propertyFactLine(propertyResult)
    : propertyFactLine({ propertyFacts: props.listing.propertyFacts });
  const lookupNeedsManual =
    propertyResult?.propertyDataSource === "manual" ||
    (showLookupStatus && !lookupFactLine) ||
    Boolean(props.listing.propertyLookupFailed);
  const showTextFallback = textFallbackOpen || lookupNeedsManual || Boolean(props.listing.extractDetailsMessage);

  return (
    <div className="overflow-hidden rounded-2xl border border-warm-border bg-white">
      <div className="flex items-start gap-2 border-b border-warm-border px-4 py-4">
        <button
          type="button"
          className="agent-focus flex min-w-0 flex-1 items-start justify-between gap-3 rounded-xl text-left"
          aria-label={`${props.expanded ? "Collapse" : "Expand"} listing ${props.index + 1}`}
          aria-expanded={props.expanded}
          aria-controls={contentId}
          onClick={props.onToggle}
        >
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-warm-muted">Listing {props.index + 1}</span>
            <span className="mt-1 block truncate font-serif text-2xl">{props.listing.address || "Start with the address"}</span>
            <span className="mt-1 block text-sm text-warm-muted">{listingSummary(props.listing)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className={cn(
              "rounded-full px-3 py-2 text-xs font-semibold",
              listingComplete(props.listing)
                ? "bg-[var(--agent-accent-soft)] text-[var(--agent-accent)]"
                : "bg-[#FAFAF7] text-warm-muted"
            )}>
              {cardStatus}
            </span>
            {props.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </button>
        <button
          type="button"
          className="agent-focus inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-warm-border bg-white text-warm-muted hover:text-warm-text"
          aria-label={`Remove listing ${props.index + 1}`}
          onClick={props.onRemove}
        >
          <Trash2 size={17} />
        </button>
      </div>
      <div id={contentId} hidden={!props.expanded} className="space-y-5 p-4">
        <section aria-label={`Listing ${props.index + 1} property facts`}>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <SetupAddressSuggestionInput
              value={addressInput}
              suggestions={addressSuggestions}
              suggestionsOpen={suggestionsOpen}
              suggestionsBusy={suggestionsBusy}
              onChange={updateAddress}
              onFocus={() => setSuggestionsOpen(addressInput.trim().length >= 3)}
              onBlur={handleAddressBlur}
              onEnterFirstSuggestion={() => {
                if (addressSuggestions[0]) void selectAddressSuggestion(addressSuggestions[0]);
              }}
              onSelect={(suggestion) => void selectAddressSuggestion(suggestion)}
            />
            <Button
              className="gap-2 self-end"
              variant="secondary"
              disabled={!addressInput.trim() || propertyBusy}
              data-setup-lookup-button={props.index}
              onPointerDown={() => {
                skipNextAddressBlurCommit.current = true;
              }}
              onClick={() => void lookupAndApplyProperty()}
            >
              <Search size={16} />
              {propertyBusy ? "Looking..." : "Lookup facts"}
            </Button>
          </div>
          {showLookupStatus ? (
            <div
              className={cn(
                "mt-3 flex items-start gap-3 rounded-xl border px-3 py-3 text-sm",
                lookupNeedsManual ? "border-[#E5D8CF] bg-[#FFF9F5]" : "border-warm-border bg-[#FAFAF7]"
              )}
            >
              <span
                className={cn(
                  "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                  lookupNeedsManual ? "bg-[#C97B5C]" : "bg-[var(--agent-accent)]"
                )}
              />
              <div className="min-w-0">
                <p className="font-semibold">{lookupNeedsManual ? "Details needed" : "Property facts added"}</p>
                <p className="mt-1 text-warm-muted">
                  {lookupNeedsManual
                    ? "Enter the basics below, or paste remarks to autofill."
                    : lookupFactLine || "Review the fields below."}
                </p>
              </div>
            </div>
          ) : null}
          {!showTextFallback ? (
            <Button className="mt-3 px-0" variant="ghost" onClick={() => setTextFallbackOpen(true)}>
              Paste remarks instead
            </Button>
          ) : null}
        </section>

        {showTextFallback ? (
          <section className="rounded-xl border border-warm-border bg-[#FAFAF7] p-3" aria-label={`Listing ${props.index + 1} autofill from text`}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-warm-muted">
              <Wand2 size={14} />
              <span>Autofill from text</span>
            </div>
            <textarea
              className="mt-3 min-h-20 w-full rounded-xl border-warm-border bg-white p-3 text-sm leading-6"
              value={sourceText}
              onChange={(event) => {
                setSourceText(event.target.value);
                props.patch(props.clientKey, { sourceText: event.target.value });
              }}
              placeholder="Paste remarks or a caption with price, beds, baths, sqft, neighborhood..."
            />
            <Button
              className="mt-3 w-full"
              variant="secondary"
              disabled={sourceText.trim().length < 20 || props.detailsBusy}
              onClick={() => void fillFromText()}
            >
              {props.detailsBusy ? "Reading..." : "Fill fields from text"}
            </Button>
            {props.listing.extractDetailsMessage ? <p className="mt-2 text-sm text-warm-muted">{props.listing.extractDetailsMessage}</p> : null}
          </section>
        ) : null}

        {showDetails ? (
          <section className="border-t border-warm-border pt-5" aria-label={`Listing ${props.index + 1} details`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-warm-muted">Confirm listing details</p>
              {props.listing.price ? <p className="shrink-0 text-sm font-semibold text-warm-muted">{formatCurrency(props.listing.price)}</p> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SmallInput label="Price" value={props.listing.price ? String(props.listing.price) : ""} onChange={(price) => props.patch(props.clientKey, { price: Number(price.replace(/\D/g, "")) || undefined })} />
              <SmallInput label="Neighborhood" value={props.listing.neighborhood ?? ""} onChange={(neighborhood) => props.patch(props.clientKey, { neighborhood })} />
              <SmallInput label="Beds" value={props.listing.beds != null ? String(props.listing.beds) : ""} onChange={(beds) => props.patch(props.clientKey, { beds: Number(beds) || undefined })} />
              <SmallInput label="Baths" value={props.listing.baths != null ? String(props.listing.baths) : ""} onChange={(baths) => props.patch(props.clientKey, { baths: Number(baths) || undefined })} />
              <SmallInput label="Sqft" value={props.listing.sqft ? String(props.listing.sqft) : ""} onChange={(sqft) => props.patch(props.clientKey, { sqft: Number(sqft) || null })} />
              <SmallInput
                label="Video URL"
                value={props.listing.videoUrl ?? ""}
                onChange={(videoUrl) => {
                  const cleanVideoUrl = videoUrl.trim();
                  void props.patch(props.clientKey, {
                    videoUrl: cleanVideoUrl || null,
                    videoSource: inferListingVideoSource(cleanVideoUrl)
                  });
                }}
              />
              <SmallInput label="Property type" value={props.listing.property_type ?? ""} onChange={(property_type) => props.patch(props.clientKey, { property_type })} className="sm:col-span-2" />
            </div>
            <ChipEditor title="Features" options={MUST_HAVES} selected={props.listing.features ?? []} onChange={(features) => props.patch(props.clientKey, { features })} />
            <ChipEditor title="Deal-breaker flags" options={DEAL_BREAKERS} selected={props.listing.dealBreakerFlags ?? []} onChange={(dealBreakerFlags) => props.patch(props.clientKey, { dealBreakerFlags })} />
            <textarea
              className="mt-4 min-h-20 w-full rounded-2xl border-warm-border p-3"
              value={props.listing.agent_note ?? ""}
              onChange={(event) => props.patch(props.clientKey, { agent_note: event.target.value })}
              placeholder="Your take on this property"
            />
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={props.listing.isPocket ?? false} onChange={(event) => props.patch(props.clientKey, { isPocket: event.target.checked })} />
              Off-market or pocket listing
            </label>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function SetupAddressSuggestionInput({
  value,
  suggestions,
  suggestionsOpen,
  suggestionsBusy,
  onChange,
  onFocus,
  onBlur,
  onEnterFirstSuggestion,
  onSelect
}: {
  value: string;
  suggestions: AddressSuggestion[];
  suggestionsOpen: boolean;
  suggestionsBusy: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  onEnterFirstSuggestion: () => void;
  onSelect: (suggestion: AddressSuggestion) => void;
}) {
  const inputId = useId();
  const listboxId = `${inputId}-suggestions`;
  const showDropdown = suggestionsOpen && (suggestionsBusy || suggestions.length > 0);
  const hasGoogleSuggestions = suggestions.some((suggestion) => suggestion.source === "google_places");

  return (
    <div className="relative block">
      <label className="text-xs font-semibold text-warm-muted" htmlFor={inputId}>Property address</label>
      <input
        id={inputId}
        className="mt-1 h-12 w-full rounded-xl border-warm-border px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key === "Enter" && suggestionsOpen && suggestions.length > 0) {
            event.preventDefault();
            onEnterFirstSuggestion();
          }
        }}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-label="Address"
        placeholder="Start typing an address"
      />
      {showDropdown ? (
        <div
          id={listboxId}
          className="z-30 mt-2 overflow-hidden rounded-xl border border-warm-border bg-white text-sm shadow-soft sm:absolute sm:left-0 sm:right-0 sm:top-full"
          role="listbox"
        >
          {suggestionsBusy && !suggestions.length ? (
            <p className="px-3 py-3 text-warm-muted">Finding addresses...</p>
          ) : null}
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.source}:${suggestion.placeId ?? suggestion.label}`}
              className="block w-full border-b border-warm-border px-3 py-3 text-left last:border-b-0 hover:bg-[#FAFAF7]"
              type="button"
              role="option"
              aria-selected="false"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(suggestion)}
            >
              <span className="block font-semibold">{suggestion.label}</span>
              {suggestion.secondaryLabel && !suggestion.label.includes(suggestion.secondaryLabel) ? (
                <span className="mt-1 block text-xs text-warm-muted">{suggestion.secondaryLabel}</span>
              ) : null}
            </button>
          ))}
          {hasGoogleSuggestions ? (
            <p className="bg-[#FAFAF7] px-3 py-2 text-right text-[11px] font-semibold text-warm-muted">Powered by Google</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function listingDetailsUnlocked(listing: WizardListing) {
  return Boolean(
    listing.price ||
      listing.neighborhood ||
      listing.beds != null ||
      listing.baths != null ||
      listing.sqft ||
      listing.property_type ||
      listing.videoUrl ||
      listing.features?.length ||
      listing.dealBreakerFlags?.length ||
      listing.agent_note ||
      listing.propertyLookupMessage ||
      listing.propertyDataSource ||
      listing.normalizedAddress
  );
}

function compactWizardListings(listings: WizardListing[] | undefined) {
  return (listings ?? []).filter((listing) =>
    Boolean(
      listing.address ||
        listing.sourceText ||
        listing.extractDetailsMessage ||
        listing.propertyLookupMessage ||
        listing.propertyLookupFailed ||
        listingDetailsUnlocked(listing)
    )
  );
}

function createListingClientKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `listing-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function listingComplete(listing: WizardListing) {
  return Boolean(listing.address && listing.price && listing.beds != null && listing.baths != null);
}

function shouldClearAddressSpecificListingFields(nextAddress: string, lastSyncedAddress: string, listing: WizardListing) {
  const cleanNextAddress = nextAddress.trim();
  const cleanLastAddress = lastSyncedAddress.trim();
  if (!cleanLastAddress || cleanNextAddress === cleanLastAddress) return false;
  return Boolean(
    listing.price ||
      listing.neighborhood ||
      listing.beds != null ||
      listing.baths != null ||
      listing.sqft != null ||
      listing.property_type ||
      listing.attomId ||
      listing.normalizedAddress ||
      listing.propertyFacts ||
      listing.propertyLookupMessage ||
      listing.propertyLookupFailed
  );
}

function clearedAddressSpecificListingFields(): WizardListing {
  return {
    price: undefined,
    neighborhood: undefined,
    beds: undefined,
    baths: undefined,
    sqft: null,
    property_type: undefined
  };
}

function listingSummary(listing: WizardListing) {
  const facts = [
    listing.price ? formatCurrency(listing.price) : null,
    listing.beds != null && listing.baths != null ? `${listing.beds} bed / ${listing.baths} bath` : null,
    listing.neighborhood || null
  ].filter(Boolean);
  return facts.length ? facts.join(" • ") : "Address first, details next";
}

function propertyFactLine(result: Pick<PropertyLookupResult, "propertyFacts">) {
  const facts = result.propertyFacts ?? {};
  return [
    facts.beds ? `${facts.beds} beds` : null,
    facts.baths ? `${facts.baths} baths` : null,
    facts.sqft ? `${facts.sqft.toLocaleString()} sqft` : null,
    facts.yearBuilt ? `Built ${facts.yearBuilt}` : null,
    facts.propertyType ?? null
  ]
    .filter(Boolean)
    .join(" • ") || null;
}

function hasStructuredPropertyFacts(result: Pick<PropertyLookupResult, "propertyFacts">) {
  return Boolean(propertyFactLine(result));
}

function propertyTypeValue(value?: string | null) {
  const clean = value?.toLowerCase() ?? "";
  if (clean.includes("condo")) return "condo";
  if (clean.includes("town")) return "townhouse";
  if (clean.includes("multi")) return "multi_family";
  if (clean.includes("single") || clean.includes("residential")) return "house";
  return null;
}

function inferListingVideoSource(url: string): ListingPayload["videoSource"] {
  const clean = url.toLowerCase();
  if (!clean) return null;
  if (clean.endsWith(".mp4")) return "mp4";
  if (clean.includes("instagram.com")) return "instagram";
  if (clean.includes("tiktok.com")) return "tiktok";
  return null;
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
