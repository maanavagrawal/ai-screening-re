import type { Agent, EventRecord, Lead, Listing, ShowingRequest } from "@/lib/types";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type AgentRow = Agent & { created_at: string };
type AgentInsert = Partial<AgentRow> & Pick<AgentRow, "slug" | "name" | "market">;

type DomainRow = {
  id: string;
  agent_id: string;
  domain: string;
  type: "path" | "subdomain" | "custom";
  verified: boolean;
  ssl_status: string | null;
  created_at: string;
};
type DomainInsert = Partial<DomainRow> & Pick<DomainRow, "agent_id" | "domain" | "type">;

type ListingRow = Listing & { created_at: string };
type ListingInsert = Partial<ListingRow> & Pick<ListingRow, "agent_id" | "address" | "price" | "beds" | "baths">;

type LeadInsert = Partial<Lead> & Pick<Lead, "agent_id" | "session_id" | "phone" | "email" | "preferences">;

type MatchReasonRow = {
  id: string;
  lead_id: string;
  listing_id: string;
  reason: string;
  generated_at: string;
};
type MatchReasonInsert = Partial<MatchReasonRow> & Pick<MatchReasonRow, "lead_id" | "listing_id" | "reason">;

type ShowingRequestInsert = Partial<ShowingRequest> & Pick<ShowingRequest, "lead_id" | "listing_id">;
type EventInsert = Omit<EventRecord, "id" | "created_at">;

export type Database = {
  public: {
    Tables: {
      agents: RowTable<AgentRow, AgentInsert>;
      domains: RowTable<DomainRow, DomainInsert>;
      listings: RowTable<ListingRow, ListingInsert>;
      leads: RowTable<Lead, LeadInsert>;
      lead_match_reasons: RowTable<MatchReasonRow, MatchReasonInsert>;
      showing_requests: RowTable<ShowingRequest, ShowingRequestInsert>;
      events: RowTable<EventRecord, EventInsert>;
    };
    Views: { [_ in never]: never };
    Functions: {
      onboard_agent: {
        Args: { payload: Json };
        Returns: AgentRow;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
