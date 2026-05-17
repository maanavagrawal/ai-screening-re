"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useId, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Clipboard,
  Command,
  Copy,
  Home,
  Inbox,
  Link as LinkIcon,
  ListVideo,
  Pencil,
  Save,
  Search,
  Settings,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { humanEvent } from "@/lib/dashboard/activity-labels";
import { agentBaseUrl } from "@/lib/dashboard/client-utils";
import type { LeadFilter, LeadSort } from "@/lib/dashboard/data";
import type { DistributionData } from "@/lib/dashboard/distribution";
import type { DropoffAnalytics } from "@/lib/dashboard/dropoff";
import { preferenceSummary } from "@/lib/dashboard/preference-summary";
import { cn, formatCurrency } from "@/lib/formatting";
import { isSellerLead, sellerDetails } from "@/lib/lead-intent";
import { clearedListingEnrichment } from "@/lib/listing-enrichment";
import type { Agent, DashboardLead, Listing, ListingPayload, NotificationPreferences } from "@/lib/types";
import type { AddressSuggestion, PropertyLookupResult } from "@/lib/property/lookup";

type Section = "leads" | "listings" | "distribution" | "settings";

export function DashboardShell({
  initialAgent,
  initialLeads,
  initialListings,
  distribution,
  qr,
  baseUrl,
  section
}: {
  initialAgent: Agent;
  initialLeads: DashboardLead[];
  initialListings: Listing[];
  distribution: DistributionData;
  qr: string;
  baseUrl: string;
  section: Section;
}) {
  const [agent, setAgent] = useState(initialAgent);
  const [leads, setLeads] = useState(initialLeads);
  const [listings, setListings] = useState(initialListings);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(initialLeads[0]?.id ?? null);
  const [filter, setFilter] = useState<LeadFilter>("all");
  const [sort, setSort] = useState<LeadSort>("priority");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const toastTimer = useRef<number | null>(null);

  const activeLead = leads.find((lead) => lead.id === activeLeadId) ?? null;
  const accent = agent.accent_color || "#C97B5C";
  const url = agentBaseUrl(agent, baseUrl);

  useEffect(() => {
    setHydrated(true);
    document.documentElement.style.setProperty("--agent-accent", accent);
    document.documentElement.style.setProperty("--agent-accent-soft", `${accent}22`);
  }, [accent]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (section !== "leads") return;
      const index = leads.findIndex((lead) => lead.id === activeLeadId);
      if (event.key === "j") setActiveLeadId(leads[Math.min(leads.length - 1, Math.max(0, index + 1))]?.id ?? null);
      if (event.key === "k") setActiveLeadId(leads[Math.max(0, index - 1)]?.id ?? null);
      if (event.key === "Escape") setActiveLeadId(null);
      if (event.key === "e" && activeLead) copyOpener(activeLead);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // Keyboard handling intentionally follows the current visible inbox state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLead, activeLeadId, leads, section]);

  function showToast(message: string) {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 1800);
  }

  async function refreshLeads(nextFilter = filter, nextSort = sort, nextSearch = search) {
    const params = new URLSearchParams({ filter: nextFilter, sort: nextSort, search: nextSearch });
    const response = await fetch(`/api/dashboard/leads?${params}`);
    if (response.ok) {
      const json = await response.json();
      setLeads(json.leads);
      setActiveLeadId(json.leads[0]?.id ?? null);
    }
  }

  async function copy(text: string, message = "Copied") {
    await navigator.clipboard.writeText(text);
    showToast(message);
  }

  function copyOpener(lead: DashboardLead) {
    const opener = (lead.brief as { suggested_opener?: string } | null)?.suggested_opener ?? "";
    if (opener) copy(opener, "Opener copied");
  }

  async function markContacted(lead: DashboardLead) {
    showToast("Marked contacted");
    const response = await fetch(`/api/dashboard/leads/${lead.id}/contacted`, { method: "POST" });
    if (response.ok) {
      const json = await response.json();
      setLeads((items) => items.map((item) => (item.id === lead.id ? { ...item, ...json.lead } : item)));
    } else {
      showToast("Could not mark contacted");
    }
  }

  return (
    <main className="min-h-svh bg-[#FAFAF7]" style={{ "--agent-accent": accent } as React.CSSProperties}>
      <span data-testid="dashboard-ready" className="sr-only">
        {hydrated ? "ready" : "loading"}
      </span>
      <div className="sticky top-0 z-20 border-b border-warm-border bg-[#FAFAF7]/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {agent.headshot_url ? (
              <Image src={agent.headshot_url} alt={agent.name} width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
            ) : null}
            <div>
              <p className="text-sm font-semibold">{agent.name}</p>
              <button className="flex items-center gap-1 text-xs text-warm-muted" onClick={() => copy(url)}>
                {url.replace(/^https?:\/\//, "")} <Copy size={12} />
              </button>
            </div>
          </div>
          <button className="hidden items-center gap-2 rounded-xl border border-warm-border bg-white px-3 py-2 text-sm font-semibold sm:flex" onClick={() => setCommandOpen(true)}>
            <Command size={15} /> Command
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="border-b border-warm-border bg-white/45 p-3 lg:min-h-[calc(100svh-4rem)] lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-4 gap-2 lg:grid-cols-1">
            <NavItem href="/dashboard/leads" active={section === "leads"} icon={<Inbox size={18} />} label="Leads" />
            <NavItem href="/dashboard/listings" active={section === "listings"} icon={<ListVideo size={18} />} label="Listings" />
            <NavItem href="/dashboard/distribution" active={section === "distribution"} icon={<LinkIcon size={18} />} label="Distribution" />
            <NavItem href="/dashboard/settings" active={section === "settings"} icon={<Settings size={18} />} label="Settings" />
          </div>
        </nav>

        {section === "leads" ? (
          <LeadsSection
            leads={leads}
            listings={listings}
            activeLead={activeLead}
            activeLeadId={activeLeadId}
            setActiveLeadId={setActiveLeadId}
            filter={filter}
            setFilter={(value) => {
              setFilter(value);
              refreshLeads(value, sort, search);
            }}
            sort={sort}
            setSort={(value) => {
              setSort(value);
              refreshLeads(filter, value, search);
            }}
            search={search}
            setSearch={setSearch}
            refreshLeads={refreshLeads}
            copy={copy}
            copyOpener={copyOpener}
            markContacted={markContacted}
          />
        ) : null}
        {section === "listings" ? <ListingsSection listings={listings} setListings={setListings} /> : null}
        {section === "distribution" ? <DistributionSection agent={agent} distribution={distribution} qr={qr} baseUrl={baseUrl} copy={copy} /> : null}
        {section === "settings" ? <SettingsSection agent={agent} setAgent={setAgent} notify={showToast} /> : null}
      </div>

      {commandOpen ? <CommandPalette onClose={() => setCommandOpen(false)} copy={() => copy(url)} /> : null}
      {toast ? <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-warm-text px-4 py-2 text-sm font-semibold text-white shadow-soft">{toast}</div> : null}
    </main>
  );
}

function NavItem({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link className={cn("flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold lg:justify-start", active ? "bg-[var(--agent-accent-soft)] text-[var(--agent-accent)]" : "text-warm-muted hover:bg-white")} href={href}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

function LeadsSection(props: {
  leads: DashboardLead[];
  listings: Listing[];
  activeLead: DashboardLead | null;
  activeLeadId: string | null;
  setActiveLeadId: (id: string) => void;
  filter: LeadFilter;
  setFilter: (filter: LeadFilter) => void;
  sort: LeadSort;
  setSort: (sort: LeadSort) => void;
  search: string;
  setSearch: (search: string) => void;
  refreshLeads: () => void;
  copy: (text: string, message?: string) => void;
  copyOpener: (lead: DashboardLead) => void;
  markContacted: (lead: DashboardLead) => void;
}) {
  return (
    <section className="grid min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
      <div className="border-r border-warm-border">
        <header className="space-y-4 border-b border-warm-border p-4">
          <DropoffSummary />
          <div className="flex flex-wrap gap-2">
            {(["all", "hot", "warm", "browsing", "showings"] as LeadFilter[]).map((item) => (
              <button key={item} onClick={() => props.setFilter(item)} className={cn("rounded-full px-3 py-2 text-xs font-semibold capitalize", props.filter === item ? "bg-[var(--agent-accent)] text-white" : "border border-warm-border bg-white")}>
                {item}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-muted" />
              <input
                className="h-11 w-full rounded-xl border-warm-border bg-white pl-9 text-sm"
                value={props.search}
                onChange={(event) => props.setSearch(event.target.value)}
                onBlur={() => props.refreshLeads()}
                placeholder="Search leads"
              />
            </label>
            <select className="h-11 rounded-xl border-warm-border bg-white text-sm" value={props.sort} onChange={(event) => props.setSort(event.target.value as LeadSort)}>
              <option value="priority">Priority</option>
              <option value="newest">Newest</option>
              <option value="last_activity">Last activity</option>
            </select>
          </div>
        </header>
        <div className="divide-y divide-warm-border">
          {props.leads.length ? props.leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} active={lead.id === props.activeLeadId} onOpen={() => props.setActiveLeadId(lead.id)} onCopy={() => props.copyOpener(lead)} onContact={() => props.markContacted(lead)} />
          )) : <p className="p-8 text-center text-sm text-warm-muted">No leads yet. Your buyer link is ready when traffic arrives.</p>}
        </div>
      </div>
      <LeadPanel lead={props.activeLead} listings={props.listings} copy={props.copy} markContacted={props.markContacted} />
    </section>
  );
}

function DropoffSummary() {
  const [analytics, setAnalytics] = useState<DropoffAnalytics | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/dashboard/analytics/dropoff")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { analytics?: DropoffAnalytics } | null) => {
        if (mounted && body?.analytics) setAnalytics(body.analytics);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  if (!analytics) return null;
  const biggestDropoff = analytics.steps
    .slice(0, -1)
    .sort((a, b) => b.dropoffAfter - a.dropoffAfter)[0];

  return (
    <div className="rounded-2xl border border-warm-border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <BarChart3 size={16} />
          Intake analytics
        </p>
        <p className="text-xs text-warm-muted">{analytics.anonymousAbandoned} anonymous drop-offs</p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {analytics.steps.slice(0, 3).map((step) => (
          <div key={step.event_type} className="rounded-xl bg-[#FAFAF7] p-3">
            <p className="text-lg font-semibold">{step.count}</p>
            <p className="text-xs text-warm-muted">{step.label}</p>
          </div>
        ))}
      </div>
      {biggestDropoff && biggestDropoff.dropoffAfter > 0 ? (
        <p className="mt-3 text-xs text-warm-muted">
          Largest drop-off: {biggestDropoff.dropoffAfter} after {biggestDropoff.label.toLowerCase()}.
        </p>
      ) : null}
    </div>
  );
}

function LeadRow({ lead, active, onOpen, onCopy, onContact }: { lead: DashboardLead; active: boolean; onOpen: () => void; onCopy: () => void; onContact: () => void }) {
  const brief = lead.brief as { one_line_summary?: string; suggested_opener?: string } | null;
  const temp = lead.temperature ?? "browsing";
  const seller = isSellerLead(lead);
  return (
    <div className={cn("group flex w-full items-center hover:bg-white", active && "bg-white")}>
      <button className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left" onClick={onOpen} type="button">
        <span className={cn("h-2.5 w-2.5 rounded-full", temp === "hot" ? "bg-red-600" : temp === "warm" ? "bg-orange-500" : "bg-warm-muted")} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-semibold", !lead.last_contacted_at && "font-bold")}>
            {lead.first_name || "Unknown"} {seller ? <span className="text-[var(--agent-accent)]">seller</span> : null}
          </p>
          <p className="truncate text-sm text-warm-muted">{brief?.one_line_summary || lead.email}</p>
        </div>
        <p className="hidden text-xs text-warm-muted sm:block">{relative(lead.last_activity_at)}</p>
      </button>
      <span className="hidden gap-1 pr-4 group-hover:flex">
        <IconButton label="Copy opener" onClick={(event) => { event.stopPropagation(); onCopy(); }} icon={<Copy size={14} />} />
        <IconButton label="Mark contacted" onClick={(event) => { event.stopPropagation(); onContact(); }} icon={<Checkish />} />
      </span>
    </div>
  );
}

function LeadPanel({ lead, listings, copy, markContacted }: { lead: DashboardLead | null; listings: Listing[]; copy: (text: string, message?: string) => void; markContacted: (lead: DashboardLead) => void }) {
  const [tone, setTone] = useState("warmer");
  const [leadState, setLeadState] = useState<DashboardLead | null>(lead);
  useEffect(() => setLeadState(lead), [lead]);
  const currentLead = leadState;
  if (!currentLead) return <aside className="hidden p-8 text-sm text-warm-muted lg:block">Open a lead to see what to text and why.</aside>;

  const brief = currentLead.brief as { one_line_summary?: string; why_serious?: string[]; watch_outs?: string[]; suggested_opener?: string } | null;
  const seller = isSellerLead(currentLead);
  const sellerInfo = sellerDetails(currentLead.preferences);
  async function regenerate() {
    const leadForUpdate = leadState;
    if (!leadForUpdate) return;
    const response = await fetch(`/api/dashboard/leads/${leadForUpdate.id}/regenerate-opener`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tone_hint: tone })
    });
    const json = await response.json();
    if (response.ok) setLeadState({ ...leadForUpdate, brief: { ...((leadForUpdate.brief as object) ?? {}), suggested_opener: json.suggested_opener } });
  }

  const smsHref = `sms:${currentLead.phone}?body=${encodeURIComponent(brief?.suggested_opener ?? "")}`;
  return (
    <aside className="relative min-h-[calc(100svh-4rem)] bg-white/60">
      <div className="space-y-6 p-5 pb-28">
        <header className="space-y-2">
          <p className="text-sm text-warm-muted">{currentLead.first_name || "Unknown"} • last active {relative(currentLead.last_activity_at)}</p>
          <h2 className="font-serif text-3xl leading-tight">
            {brief?.one_line_summary || (seller ? "Seller inquiry received." : "Lead brief is being prepared.")}
          </h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {seller ? <Badge>seller</Badge> : null}
            <Badge>{currentLead.temperature ?? currentLead.tier}</Badge>
            {currentLead.phone_verified ? <Badge>verified phone</Badge> : null}
            <button className="rounded-full border border-warm-border px-3 py-1" onClick={() => copy(currentLead.phone)}>Copy phone</button>
            <button className="rounded-full border border-warm-border px-3 py-1" onClick={() => copy(currentLead.email)}>Copy email</button>
          </div>
        </header>
        {seller ? (
          <section className="rounded-2xl border border-warm-border bg-white p-4">
            <p className="mb-2 text-sm font-semibold">Seller details</p>
            <div className="space-y-2 text-sm text-warm-muted">
              <p>Property: {sellerInfo?.property_address || sellerInfo?.neighborhood || "Not specified"}</p>
              <p>Timeframe: {sellerInfo?.timeframe?.replaceAll("_", " ") || "Not specified"}</p>
              {sellerInfo?.notes ? <p>Notes: {sellerInfo.notes}</p> : null}
            </div>
          </section>
        ) : null}
        <BriefList title={seller ? "Seller signals" : "Why they're serious"} items={brief?.why_serious ?? []} />
        <BriefList title="Watch-outs" items={brief?.watch_outs ?? []} />
        {!seller ? <PreferenceSummarySection preferences={currentLead.preferences} /> : null}
        <section>
          <p className="mb-2 text-sm font-semibold">Send this</p>
          <div className="rounded-2xl border border-warm-border bg-[#FAFAF7] p-4 text-sm leading-6">{brief?.suggested_opener ?? "No opener yet."}</div>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" onClick={() => copy(brief?.suggested_opener ?? "", "Opener copied")}>Copy</Button>
            {!seller ? (
              <>
                <select className="rounded-xl border-warm-border bg-white text-sm" value={tone} onChange={(event) => setTone(event.target.value)}>
                  <option value="shorter">Shorter</option>
                  <option value="warmer">Warmer</option>
                  <option value="more_direct">More direct</option>
                </select>
                <Button variant="secondary" onClick={regenerate}>Regenerate</Button>
              </>
            ) : null}
          </div>
        </section>
        <BriefList title={`Why this is ${currentLead.temperature ?? "browsing"}`} items={currentLead.temperature_reasons ?? []} />
        {currentLead.free_text_raw ? (
          <section className="rounded-2xl border border-warm-border bg-white p-4">
            <p className="mb-2 text-sm font-semibold">Original note</p>
            <p className="text-sm italic leading-6 text-warm-muted">&quot;{currentLead.free_text_raw}&quot;</p>
          </section>
        ) : null}
        <section>
          <p className="mb-3 text-sm font-semibold">Activity</p>
          <div className="space-y-3">
            {currentLead.events.slice().reverse().map((event) => (
              <div key={event.id} className="rounded-2xl border border-warm-border bg-white p-3 text-sm">
                <p>{humanEvent(event, listings)}</p>
                <p className="mt-1 text-xs text-warm-muted">{new Date(event.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-warm-border bg-[#FAFAF7]/95 p-3 backdrop-blur lg:absolute">
        <div className="grid grid-cols-3 gap-2">
          <a className="rounded-2xl bg-[var(--agent-accent)] px-3 py-3 text-center text-sm font-semibold text-white" href={smsHref}>Text them</a>
          <button className="rounded-2xl border border-warm-border bg-white px-3 py-3 text-sm font-semibold" onClick={() => markContacted(currentLead)}>Contacted</button>
          <button className="rounded-2xl border border-warm-border bg-white px-3 py-3 text-sm font-semibold" onClick={() => fetch(`/api/dashboard/leads/${currentLead.id}/snooze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hours: 24 }) })}>Snooze</button>
        </div>
      </div>
    </aside>
  );
}

type DashboardListingDraft = {
  address: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  neighborhood: string;
  property_type: string;
  videoUrl: string;
  description: string;
  agent_note: string;
  features: string;
  dealBreakerFlags: string;
  isPocket: boolean;
  enrichment: Partial<ListingPayload>;
};

function emptyListingDraft(): DashboardListingDraft {
  return {
    address: "",
    price: "",
    beds: "",
    baths: "",
    sqft: "",
    neighborhood: "",
    property_type: "",
    videoUrl: "",
    description: "",
    agent_note: "",
    features: "",
    dealBreakerFlags: "",
    isPocket: false,
    enrichment: {}
  };
}

function clearedDashboardAddressFields(): Pick<
  DashboardListingDraft,
  "price" | "beds" | "baths" | "sqft" | "neighborhood" | "property_type"
> {
  return {
    price: "",
    beds: "",
    baths: "",
    sqft: "",
    neighborhood: "",
    property_type: ""
  };
}

function ListingsSection({ listings, setListings }: { listings: Listing[]; setListings: (items: Listing[]) => void }) {
  const [draft, setDraft] = useState<DashboardListingDraft>(() => emptyListingDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<DashboardListingDraft | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function add() {
    setSaving("add");
    setMessage(null);
    const response = await fetch("/api/dashboard/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listingPayloadFromDraft(draft))
    });
    const json = (await response.json().catch(() => null)) as { listing?: Listing; error?: string } | null;
    setSaving(null);
    if (response.ok && json?.listing) {
      setListings([json.listing, ...listings]);
      setDraft(emptyListingDraft());
      setMessage("Listing added.");
    } else {
      setMessage(json?.error ?? "Could not add listing.");
    }
  }

  function startEdit(listing: Listing) {
    setMessage(null);
    setConfirmDeleteId(null);
    setEditingId(listing.id);
    setEditingDraft(listingDraftFromListing(listing));
  }

  async function saveEdit() {
    if (!editingId || !editingDraft) return;
    setSaving(`edit:${editingId}`);
    setMessage(null);
    const response = await fetch(`/api/dashboard/listings/${encodeURIComponent(editingId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listingPayloadFromDraft(editingDraft))
    });
    const json = (await response.json().catch(() => null)) as { listing?: Listing; error?: string } | null;
    setSaving(null);
    if (response.ok && json?.listing) {
      const updatedListing = json.listing;
      setListings(listings.map((listing) => (listing.id === updatedListing.id ? updatedListing : listing)));
      setEditingId(null);
      setEditingDraft(null);
      setMessage("Listing updated.");
    } else {
      setMessage(json?.error ?? "Could not update listing.");
    }
  }

  async function remove(listingId: string) {
    setSaving(`delete:${listingId}`);
    setMessage(null);
    const response = await fetch(`/api/dashboard/listings/${encodeURIComponent(listingId)}`, {
      method: "DELETE"
    });
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    setSaving(null);
    if (response.ok) {
      setListings(listings.filter((listing) => listing.id !== listingId));
      if (editingId === listingId) {
        setEditingId(null);
        setEditingDraft(null);
      }
      setConfirmDeleteId(null);
      setMessage("Listing deleted.");
    } else {
      setMessage(json?.error ?? "Could not delete listing.");
    }
  }

  function updateEditingDraft(next: SetStateAction<DashboardListingDraft>) {
    setEditingDraft((current) => {
      if (!current) return current;
      return typeof next === "function" ? next(current) : next;
    });
  }

  return (
    <section className="p-5">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-serif text-4xl">Listings</h1>
      </div>
      {message ? <p className="mb-4 rounded-2xl border border-warm-border bg-white px-4 py-3 text-sm text-warm-muted">{message}</p> : null}
      <ListingForm
        title="Add listing"
        draft={draft}
        setDraft={setDraft}
        submitLabel="Add listing"
        busy={saving === "add"}
        onSubmit={add}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {listings.map((listing) => (
          <article key={listing.id} className="rounded-2xl border border-warm-border bg-white p-4">
            {editingId === listing.id && editingDraft ? (
              <ListingForm
                title="Edit listing"
                draft={editingDraft}
                setDraft={updateEditingDraft}
                submitLabel="Save listing"
                busy={saving === `edit:${listing.id}`}
                onSubmit={saveEdit}
                framed={false}
                onCancel={() => {
                  setEditingId(null);
                  setEditingDraft(null);
                  setMessage(null);
                }}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-2xl">{formatCurrency(listing.price)}</p>
                    <p className="mt-2 text-sm text-warm-muted">{listing.beds} beds • {listing.baths} baths • {listing.neighborhood}</p>
                    <p className="mt-1 text-sm">{listing.address}</p>
                  </div>
                  {listing.is_pocket ? <Badge>pocket</Badge> : null}
                </div>
                {listing.property_facts?.yearBuilt || listing.property_data_source ? (
                  <p className="mt-3 text-xs text-warm-muted">
                    {listing.property_data_source ? `${listing.property_data_source} facts` : "Property facts"}
                    {listing.property_facts?.yearBuilt ? ` • built ${listing.property_facts.yearBuilt}` : ""}
                  </p>
                ) : null}
                {listing.features?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {listing.features.map((feature) => <Badge key={feature}>{feature.replaceAll("_", " ")}</Badge>)}
                  </div>
                ) : null}
                {listing.description ? <p className="mt-3 text-sm text-warm-muted">{listing.description}</p> : null}
                {listing.agent_note ? <p className="mt-3 text-sm italic text-warm-muted">{listing.agent_note}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button className="gap-2 px-3 py-2" variant="secondary" onClick={() => startEdit(listing)}>
                    <Pencil size={15} />
                    Edit listing
                  </Button>
                  {confirmDeleteId === listing.id ? (
                    <>
                      <Button
                        className="gap-2 px-3 py-2"
                        variant="secondary"
                        disabled={saving === `delete:${listing.id}`}
                        onClick={() => remove(listing.id)}
                      >
                        <Trash2 size={15} />
                        {saving === `delete:${listing.id}` ? "Deleting..." : "Confirm delete"}
                      </Button>
                      <Button className="gap-2 px-3 py-2" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                        <X size={15} />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button className="gap-2 px-3 py-2" variant="ghost" onClick={() => setConfirmDeleteId(listing.id)}>
                      <Trash2 size={15} />
                      Delete listing
                    </Button>
                  )}
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ListingForm({
  title,
  draft,
  setDraft,
  submitLabel,
  busy,
  onSubmit,
  framed = true,
  onCancel
}: {
  title: string;
  draft: DashboardListingDraft;
  setDraft: Dispatch<SetStateAction<DashboardListingDraft>>;
  submitLabel: string;
  busy: boolean;
  onSubmit: () => void;
  framed?: boolean;
  onCancel?: () => void;
}) {
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupResult, setLookupResult] = useState<PropertyLookupResult | null>(null);
  const [lookupMessage, setLookupMessage] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const selectedAddressPlaceId = useRef<string | null>(null);

  useEffect(() => {
    if (draft.address.trim()) return;
    setLookupResult(null);
    setLookupMessage("");
    setAddressSuggestions([]);
    setSuggestionsOpen(false);
  }, [draft.address]);

  useEffect(() => {
    if (!suggestionsOpen) return;
    const query = draft.address.trim();
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
  }, [draft.address, suggestionsOpen]);

  async function lookupAndApply(address: string, placeId = selectedAddressPlaceId.current) {
    const cleanAddress = address.trim();
    if (!cleanAddress) return;
    setLookupBusy(true);
    setLookupMessage("");
    try {
      const response = await fetch("/api/listing-property-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: cleanAddress, placeId: placeId || undefined })
      });
      const json = (await response.json().catch(() => null)) as { result?: PropertyLookupResult; error?: string } | null;
      if (response.ok && json?.result) {
        setLookupResult(json.result);
        applyLookup(json.result);
        setLookupMessage(json.result.message);
      } else {
        setLookupMessage(json?.error ?? "Could not look up property facts.");
      }
    } catch {
      setLookupMessage("Could not look up property facts.");
    } finally {
      setLookupBusy(false);
    }
  }

  function updateAddress(address: string) {
    selectedAddressPlaceId.current = null;
    setDraft((current) => ({
      ...current,
      address,
      ...clearedDashboardAddressFields(),
      enrichment: clearedListingEnrichment()
    }));
    setLookupResult(null);
    setLookupMessage("");
    setAddressSuggestions([]);
    setSuggestionsOpen(address.trim().length >= 3);
  }

  function selectAddressSuggestion(suggestion: AddressSuggestion) {
    selectedAddressPlaceId.current = suggestion.placeId ?? null;
    setSuggestionsOpen(false);
    setAddressSuggestions([]);
    setDraft((current) => ({
      ...current,
      address: suggestion.label,
      ...clearedDashboardAddressFields(),
      enrichment: clearedListingEnrichment()
    }));
    void lookupAndApply(suggestion.label, suggestion.placeId ?? null);
  }

  function applyLookup(result: PropertyLookupResult) {
    const facts = result.propertyFacts ?? {};
    const hasProviderFacts = Boolean(facts.beds || facts.baths || facts.sqft || facts.propertyType);
    setDraft((current) => ({
      ...current,
      address: result.normalizedAddress?.label ?? current.address,
      neighborhood:
        result.normalizedAddress?.city && (hasProviderFacts || !current.neighborhood)
          ? result.normalizedAddress.city
          : current.neighborhood,
      beds: facts.beds ? String(facts.beds) : current.beds,
      baths: facts.baths ? String(facts.baths) : current.baths,
      sqft: facts.sqft ? String(facts.sqft) : current.sqft,
      property_type: propertyTypeValue(facts.propertyType) || current.property_type,
      enrichment: {
        attomId: result.attomId,
        propertyDataSource: result.propertyDataSource,
        propertyEnrichedAt: result.propertyEnrichedAt,
        propertyMatchConfidence: result.propertyMatchConfidence,
        normalizedAddress: result.normalizedAddress,
        propertyFacts: result.propertyFacts,
        propertyOverrideFields: []
      }
    }));
  }

  const detailsVisible = Boolean(
    draft.address.trim() ||
      draft.price ||
      draft.beds ||
      draft.baths ||
      draft.sqft ||
      draft.neighborhood ||
      draft.property_type ||
      draft.videoUrl ||
      draft.features ||
      draft.dealBreakerFlags ||
      draft.description ||
      draft.agent_note ||
      lookupMessage ||
      lookupResult ||
      onCancel
  );

  return (
    <div className={cn("space-y-4", framed ? "mb-6 rounded-2xl border border-warm-border bg-white p-4" : "mb-0 p-0")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-muted">{title}</p>
          <h2 className="mt-1 font-serif text-2xl">{onCancel ? title : "Start with the address"}</h2>
        </div>
        <span className="rounded-full bg-[#FAFAF7] px-3 py-2 text-xs font-semibold text-warm-muted">
          {detailsVisible ? "Details ready" : "Address first"}
        </span>
        {onCancel ? (
          <Button className="gap-2 px-3 py-2" variant="ghost" onClick={onCancel}>
            <X size={15} />
            Cancel
          </Button>
        ) : null}
      </div>

      <section className="rounded-2xl border border-warm-border bg-[#FAFAF7] p-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <AddressSuggestionInput
            value={draft.address}
            suggestions={addressSuggestions}
            suggestionsOpen={suggestionsOpen}
            suggestionsBusy={suggestionsBusy}
            onChange={updateAddress}
            onFocus={() => setSuggestionsOpen(draft.address.trim().length >= 3)}
            onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 120)}
            onEnterFirstSuggestion={() => {
              if (addressSuggestions[0]) selectAddressSuggestion(addressSuggestions[0]);
            }}
            onSelect={selectAddressSuggestion}
          />
          <Button className="gap-2 self-end" variant="secondary" disabled={!draft.address || lookupBusy} onClick={() => lookupAndApply(draft.address)}>
            <Search size={16} />
            {lookupBusy ? "Looking..." : "Lookup facts"}
          </Button>
        </div>
        {lookupMessage ? <p className="mt-2 text-sm text-warm-muted">{lookupMessage}</p> : null}
        {lookupResult ? (
          <div className="mt-3 rounded-xl border border-warm-border bg-white p-3 text-sm">
            <p className="font-semibold">{lookupResult.normalizedAddress?.label ?? draft.address}</p>
            <p className="mt-1 text-warm-muted">{propertyFactLine(lookupResult)}</p>
          </div>
        ) : null}
      </section>

      {detailsVisible ? (
        <>
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-warm-muted">Required details</p>
              {draft.price ? <p className="text-sm font-semibold text-warm-muted">{formatCurrency(Number(draft.price))}</p> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <DashboardListingInput label="Price" value={draft.price} onChange={(price) => setDraft((current) => ({ ...current, price: price.replace(/\D/g, "") }))} />
              <DashboardListingInput label="Beds" value={draft.beds} onChange={(beds) => setDraft((current) => ({ ...current, beds }))} />
              <DashboardListingInput label="Baths" value={draft.baths} onChange={(baths) => setDraft((current) => ({ ...current, baths }))} />
              <DashboardListingInput label="Sqft" value={draft.sqft} onChange={(sqft) => setDraft((current) => ({ ...current, sqft: sqft.replace(/\D/g, "") }))} />
              <DashboardListingInput label="Neighborhood" value={draft.neighborhood} onChange={(neighborhood) => setDraft((current) => ({ ...current, neighborhood }))} />
              <DashboardListingInput label="Property type" value={draft.property_type} onChange={(property_type) => setDraft((current) => ({ ...current, property_type }))} />
            </div>
          </section>

          <section className="border-t border-warm-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-warm-muted">Optional media and notes</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <DashboardListingInput className="sm:col-span-3" label="Video URL" value={draft.videoUrl} onChange={(videoUrl) => setDraft((current) => ({ ...current, videoUrl }))} />
              <DashboardListingInput className="sm:col-span-3" label="Features" value={draft.features} onChange={(features) => setDraft((current) => ({ ...current, features }))} placeholder="yard, home office, walkable" />
              <DashboardListingInput className="sm:col-span-3" label="Deal-breaker flags" value={draft.dealBreakerFlags} onChange={(dealBreakerFlags) => setDraft((current) => ({ ...current, dealBreakerFlags }))} placeholder="busy street, needs work" />
              <label className="block sm:col-span-3">
                <span className="text-xs font-semibold text-warm-muted">Description</span>
                <textarea className="mt-1 min-h-20 w-full rounded-xl border-warm-border text-sm" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <label className="block sm:col-span-3">
                <span className="text-xs font-semibold text-warm-muted">Agent note</span>
                <textarea className="mt-1 min-h-20 w-full rounded-xl border-warm-border text-sm" value={draft.agent_note} onChange={(event) => setDraft((current) => ({ ...current, agent_note: event.target.value }))} />
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-3">
                <input type="checkbox" checked={draft.isPocket} onChange={(event) => setDraft((current) => ({ ...current, isPocket: event.target.checked }))} />
                Off-market or pocket listing
              </label>
            </div>
          </section>
        </>
      ) : null}

      <Button className="w-full gap-2" disabled={!listingDraftIsComplete(draft) || busy} onClick={onSubmit}>
        <Save size={16} />
        {busy ? "Saving..." : submitLabel}
      </Button>
    </div>
  );
}

function AddressSuggestionInput({
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
  onBlur: () => void;
  onEnterFirstSuggestion: () => void;
  onSelect: (suggestion: AddressSuggestion) => void;
}) {
  const showDropdown = suggestionsOpen && (suggestionsBusy || suggestions.length > 0);
  const inputId = useId();
  const listboxId = `${inputId}-suggestions`;
  const hasGoogleSuggestions = suggestions.some((suggestion) => suggestion.source === "google_places");

  return (
    <div className="relative block">
      <label className="text-xs font-semibold text-warm-muted" htmlFor={inputId}>Address</label>
      <input
        id={inputId}
        className="mt-1 w-full rounded-xl border-warm-border text-sm"
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

function DashboardListingInput({ label, value, onChange, className, placeholder }: { label: string; value: string; onChange: (value: string) => void; className?: string; placeholder?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs font-semibold text-warm-muted">{label}</span>
      <input className="mt-1 w-full rounded-xl border-warm-border text-sm" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function listingPayloadFromDraft(draft: DashboardListingDraft): ListingPayload {
  const videoUrl = draft.videoUrl.trim();
  return {
    address: draft.address.trim(),
    price: Number(draft.price),
    beds: Number(draft.beds),
    baths: Number(draft.baths),
    sqft: draft.sqft ? Number(draft.sqft) : null,
    neighborhood: nullableText(draft.neighborhood),
    property_type: nullableText(draft.property_type),
    videoUrl: videoUrl || null,
    videoSource: videoUrl ? videoSourceFromUrl(videoUrl) : null,
    description: nullableText(draft.description),
    agent_note: nullableText(draft.agent_note),
    features: csvList(draft.features),
    dealBreakerFlags: csvList(draft.dealBreakerFlags),
    isPocket: draft.isPocket,
    ...draft.enrichment
  };
}

function listingDraftFromListing(listing: Listing): DashboardListingDraft {
  return {
    address: listing.address,
    price: String(listing.price),
    beds: String(listing.beds),
    baths: String(listing.baths),
    sqft: listing.sqft ? String(listing.sqft) : "",
    neighborhood: listing.neighborhood ?? "",
    property_type: listing.property_type ?? "",
    videoUrl: listing.video_url ?? "",
    description: listing.description ?? "",
    agent_note: listing.agent_note ?? "",
    features: (listing.features ?? []).join(", "),
    dealBreakerFlags: (listing.deal_breaker_flags ?? []).join(", "),
    isPocket: listing.is_pocket,
    enrichment: {
      attomId: listing.attom_id ?? null,
      propertyDataSource: listing.property_data_source ?? null,
      propertyEnrichedAt: listing.property_enriched_at ?? null,
      propertyMatchConfidence: listing.property_match_confidence ?? null,
      normalizedAddress: listing.normalized_address ?? null,
      propertyFacts: listing.property_facts ?? null,
      propertyOverrideFields: listing.property_override_fields ?? []
    }
  };
}

function listingDraftIsComplete(draft: DashboardListingDraft) {
  return Boolean(
    draft.address.trim() &&
    Number(draft.price) > 0 &&
    draft.beds.trim() &&
    Number(draft.beds) >= 0 &&
    draft.baths.trim() &&
    Number(draft.baths) >= 0
  );
}

function nullableText(value: string) {
  const clean = value.trim();
  return clean ? clean : null;
}

function csvList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function videoSourceFromUrl(url: string): Listing["video_source"] {
  const clean = url.toLowerCase();
  if (clean.endsWith(".mp4")) return "mp4";
  if (clean.includes("instagram.com")) return "instagram";
  if (clean.includes("tiktok.com")) return "tiktok";
  return null;
}

function propertyFactLine(result: PropertyLookupResult) {
  const facts = result.propertyFacts ?? {};
  return [
    facts.beds ? `${facts.beds} beds` : null,
    facts.baths ? `${facts.baths} baths` : null,
    facts.sqft ? `${facts.sqft.toLocaleString()} sqft` : null,
    facts.yearBuilt ? `Built ${facts.yearBuilt}` : null,
    facts.propertyType ?? null
  ]
    .filter(Boolean)
    .join(" • ") || "Fill the listing details manually, or paste remarks if the lookup missed facts.";
}

function propertyTypeValue(value?: string | null) {
  const clean = value?.toLowerCase() ?? "";
  if (clean.includes("condo")) return "condo";
  if (clean.includes("town")) return "townhouse";
  if (clean.includes("multi")) return "multi_family";
  if (clean.includes("single") || clean.includes("residential")) return "house";
  return null;
}

function DistributionSection({ agent, distribution, qr, baseUrl, copy }: { agent: Agent; distribution: DistributionData; qr: string; baseUrl: string; copy: (text: string, message?: string) => void }) {
  const url = agentBaseUrl(agent, baseUrl);
  const links = [
    ["Instagram bio", `${url}?src=instagram_bio`],
    ["TikTok bio", `${url}?src=tiktok_bio`],
    ["Email signature", `${url}?src=signature`],
    ["QR code", `${url}?src=qr_code`]
  ];
  return (
    <section className="space-y-6 p-5">
      <h1 className="font-serif text-4xl">Distribution</h1>
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="rounded-2xl border border-warm-border bg-white p-5">
          <p className="text-sm text-warm-muted">Universal link</p>
          <p className="mt-2 break-all text-lg font-semibold">{url}</p>
          <Button className="mt-4 gap-2" onClick={() => copy(url)}><Copy size={16} /> Copy link</Button>
        </div>
        <img className="rounded-2xl border border-warm-border bg-white p-3" src={qr} alt="QR code" />
      </div>
      <CardList title="UTM links" items={links.map(([label, text]) => ({ label, text }))} copy={copy} />
      <CardList title="Bio copy templates" items={distribution.bioTemplates.map((text, index) => ({ label: `Bio ${index + 1}`, text }))} copy={copy} />
      <CardList title="Reply templates" items={distribution.replyTemplates.map((item) => ({ label: item.scenario.replaceAll("_", " "), text: item.template_text }))} copy={copy} />
      <div className="rounded-2xl border border-warm-border bg-white p-5">
        <p className="font-semibold">Gmail auto-reply</p>
        <p className="mt-2 text-sm text-warm-muted">Coming soon. This will reuse the same link and voice templates.</p>
      </div>
      <div className="rounded-2xl border border-warm-border bg-white p-5">
        <p className="mb-4 font-semibold">Lead source breakdown</p>
        {distribution.attribution.length ? distribution.attribution.map((row) => (
          <div key={row.source} className="mb-3">
            <div className="flex justify-between text-sm"><span>{row.source}</span><span>{row.leads} leads ({row.hot} hot)</span></div>
            <div className="mt-1 h-2 rounded-full bg-warm-border"><div className="h-2 rounded-full bg-[var(--agent-accent)]" style={{ width: `${Math.min(100, row.leads * 10)}%` }} /></div>
          </div>
        )) : <p className="text-sm text-warm-muted">No source data yet.</p>}
      </div>
    </section>
  );
}

function SettingsSection({ agent, setAgent, notify }: { agent: Agent; setAgent: (agent: Agent) => void; notify: (message: string) => void }) {
  const [form, setForm] = useState(agent);
  const [generatingHeadline, setGeneratingHeadline] = useState(false);

  async function save(patch: Partial<Agent>, message = "Settings saved") {
    const response = await fetch("/api/dashboard/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    const json = await response.json();
    if (response.ok) {
      setAgent(json.agent);
      setForm(json.agent);
      notify(message);
    } else {
      notify(json.error ?? "Settings could not be saved");
    }
  }

  async function generateHeadline() {
    const bio = form.bio?.trim();
    if (!bio) {
      notify("Add a bio first");
      return;
    }

    setGeneratingHeadline(true);
    try {
      const response = await fetch("/api/dashboard/settings/headline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, market: form.market })
      });
      const json = await response.json();
      if (!response.ok || !json.headline) {
        notify(json.error ?? "Headline could not be generated");
        return;
      }

      setForm((current) => ({ ...current, headline: json.headline }));
      await save({ headline: json.headline }, "Headline generated");
    } finally {
      setGeneratingHeadline(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-5 p-5">
      <h1 className="font-serif text-4xl">Settings</h1>
      <div className="grid gap-4 rounded-2xl border border-warm-border bg-white p-5">
        <SettingsInput label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} onBlur={() => save({ name: form.name })} />
        <SettingsInput label="Market" value={form.market} onChange={(market) => setForm({ ...form, market })} onBlur={() => save({ market: form.market })} />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <SettingsInput label="Headline" value={form.headline ?? ""} onChange={(headline) => setForm({ ...form, headline })} onBlur={() => save({ headline: form.headline })} />
          <Button type="button" variant="secondary" className="w-full gap-2 sm:w-auto" disabled={generatingHeadline || !form.bio?.trim()} onClick={generateHeadline}>
            <Wand2 size={16} /> {generatingHeadline ? "Generating..." : "Generate"}
          </Button>
        </div>
        <SettingsArea label="Bio" value={form.bio ?? ""} onChange={(bio) => setForm({ ...form, bio })} onBlur={() => save({ bio: form.bio })} />
        <SettingsArea label="Voice notes" value={form.voice_notes ?? ""} onChange={(voice_notes) => setForm({ ...form, voice_notes })} onBlur={() => save({ voice_notes: form.voice_notes })} />
        <SettingsInput label="Phone" value={form.phone ?? ""} onChange={(phone) => setForm({ ...form, phone })} onBlur={() => save({ phone: form.phone })} />
        <SettingsInput label="Accent color" value={form.accent_color ?? "#C97B5C"} onChange={(accent_color) => setForm({ ...form, accent_color })} onBlur={() => save({ accent_color: form.accent_color })} />
        <SettingsInput label="Slug" value={form.slug} onChange={(slug) => setForm({ ...form, slug })} onBlur={() => save({ slug: form.slug })} />
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.paused ?? false} onChange={(event) => { const paused = event.target.checked; setForm({ ...form, paused }); save({ paused }); }} /> Pause page</label>
      </div>
      <div className="rounded-2xl border border-warm-border bg-white p-5">
        <p className="mb-3 font-semibold">Email notification preferences</p>
        {(["new_lead", "showing_requested", "hot_lead", "weekly_summary"] as Array<keyof NotificationPreferences>).map((key) => (
          <label key={key} className="mb-2 flex items-center justify-between text-sm">
            {key.replaceAll("_", " ")}
            <input type="checkbox" checked={Boolean(form.notification_preferences?.[key])} onChange={(event) => {
              const notification_preferences = { ...(form.notification_preferences ?? {}), [key]: event.target.checked } as NotificationPreferences;
              setForm({ ...form, notification_preferences });
              save({ notification_preferences });
            }} />
          </label>
        ))}
      </div>
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="font-semibold text-red-900">Danger zone</p>
        <p className="mt-2 text-sm text-red-800">Delete account is soft-delete only in a later admin flow.</p>
      </div>
    </section>
  );
}

function CommandPalette({ onClose, copy }: { onClose: () => void; copy: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/20 p-5" onClick={onClose}>
      <div className="mx-auto mt-24 max-w-lg rounded-2xl border border-warm-border bg-white p-3 shadow-soft" onClick={(event) => event.stopPropagation()}>
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold hover:bg-[#FAFAF7]" onClick={copy}><Copy size={16} /> Copy buyer link</button>
        <Link className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-[#FAFAF7]" href="/dashboard/leads"><Inbox size={16} /> Go to leads</Link>
        <Link className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-[#FAFAF7]" href="/dashboard/listings"><Home size={16} /> Manage listings</Link>
      </div>
    </div>
  );
}

function CardList({ title, items, copy }: { title: string; items: Array<{ label: string; text: string }>; copy: (text: string, message?: string) => void }) {
  return (
    <div className="rounded-2xl border border-warm-border bg-white p-5">
      <p className="mb-4 font-semibold">{title}</p>
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-warm-border bg-[#FAFAF7] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold capitalize">{item.label}</p>
              <button onClick={() => copy(item.text)}><Copy size={16} /></button>
            </div>
            <p className="mt-2 text-sm text-warm-muted">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <ul className="space-y-2 text-sm text-warm-muted">
        {items.map((item) => <li key={item}>• {item}</li>)}
      </ul>
    </section>
  );
}

function PreferenceSummarySection({ preferences }: { preferences: DashboardLead["preferences"] }) {
  const items = preferenceSummary(preferences);
  if (!items.length) return null;
  return (
    <section>
      <p className="mb-2 text-sm font-semibold">Preference summary</p>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-warm-border bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-warm-muted">{item.label}</p>
            <p className="mt-1 text-sm leading-6">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsInput({ label, value, onChange, onBlur }: { label: string; value: string; onChange: (value: string) => void; onBlur: () => void }) {
  return <label className="block text-sm font-semibold">{label}<input className="mt-2 h-11 w-full rounded-xl border-warm-border" value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} /></label>;
}

function SettingsArea({ label, value, onChange, onBlur }: { label: string; value: string; onChange: (value: string) => void; onBlur: () => void }) {
  return <label className="block text-sm font-semibold">{label}<textarea className="mt-2 min-h-24 w-full rounded-xl border-warm-border" value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} /></label>;
}

function IconButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: (event: React.MouseEvent) => void }) {
  return <button aria-label={label} className="rounded-full border border-warm-border bg-white p-2" onClick={onClick}>{icon}</button>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="mt-3 inline-flex rounded-full bg-[var(--agent-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--agent-accent)]">{children}</span>;
}

function Checkish() {
  return <Clipboard size={14} />;
}

function relative(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 2) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
