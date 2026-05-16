import { z } from "zod";

export const QuestionIdSchema = z.enum([
  "timeline",
  "free_text",
  "current_situation",
  "financing",
  "preapproval_upload",
  "financing_help",
  "budget",
  "bedrooms",
  "bathrooms",
  "property_type",
  "neighborhoods",
  "must_haves",
  "deal_breakers",
  "first_time_buyer",
  "anything_else",
  "done"
]);

export const MustHaveSchema = z.enum([
  "yard",
  "garage",
  "pool",
  "home_office",
  "updated_kitchen",
  "open_floor_plan",
  "walkable",
  "quiet_street",
  "new_construction"
]);

export const DealBreakerSchema = z.enum([
  "hoa",
  "fixer_upper",
  "busy_street",
  "long_commute",
  "shared_walls"
]);

export const TimelineSchema = z.object({
  preset: z.enum(["30_days", "60_days", "90_days", "6_months", "just_exploring", "custom"]),
  target_date: z.string().nullable().optional()
});

export const FreeTextExtractionSchema = z.object({
  beds: z.number().int().min(0).nullable(),
  baths: z.number().min(0).nullable(),
  budget_min: z.number().int().min(0).nullable(),
  budget_max: z.number().int().min(0).nullable(),
  neighborhoods: z.array(z.string()),
  must_haves: z.array(MustHaveSchema),
  deal_breakers: z.array(DealBreakerSchema),
  family_context: z.string().nullable(),
  work_context: z.string().nullable(),
  timeline_hint: z.string().nullable(),
  financing_hint: z.string().nullable(),
  confidence: z.object({
    beds: z.number().min(0).max(1),
    baths: z.number().min(0).max(1),
    budget_min: z.number().min(0).max(1),
    budget_max: z.number().min(0).max(1),
    neighborhoods: z.number().min(0).max(1),
    must_haves: z.number().min(0).max(1),
    deal_breakers: z.number().min(0).max(1),
    family_context: z.number().min(0).max(1),
    work_context: z.number().min(0).max(1),
    timeline_hint: z.number().min(0).max(1),
    financing_hint: z.number().min(0).max(1)
  })
});

export const SelectedAreaSchema = z.object({
  label: z.string().min(1),
  placeId: z.string().nullable().optional(),
  source: z.enum(["google_places", "manual", "agent_suggestion"]),
  type: z.enum(["city", "neighborhood", "postal_code", "school_district", "region", "custom"]),
  parentLabel: z.string().nullable().optional(),
  bounds: z
    .object({
      north: z.number(),
      south: z.number(),
      east: z.number(),
      west: z.number()
    })
    .nullable()
    .optional(),
  coarseCenter: z
    .object({
      latitude: z.number(),
      longitude: z.number()
    })
    .nullable()
    .optional()
});

export const IntakeAnswersSchema = z.object({
  answered_question_ids: z.array(QuestionIdSchema).default([]),
  timeline: TimelineSchema.optional(),
  free_text_raw: z.string().optional(),
  extraction: FreeTextExtractionSchema.optional(),
  accepted_extraction: FreeTextExtractionSchema.partial().optional(),
  current_situation: z
    .object({
      status: z.enum(["renting", "own_plan_to_sell", "own_keeping", "family_or_other"]),
      lease_end_date: z.string().nullable().optional()
    })
    .optional(),
  financing: z.enum(["pre_approved", "in_process", "cash_buyer", "not_started"]).optional(),
  preapproval_url: z.string().url().optional(),
  financing_help: z.enum(["yes_connect_lender", "no"]).optional(),
  budget_min: z.number().int().min(0).optional(),
  budget_max: z.number().int().min(0).optional(),
  bedrooms: z.enum(["1", "2", "3", "4", "5_plus"]).optional(),
  bathrooms: z.enum(["1", "2", "3", "4_plus"]).optional(),
  property_type: z.array(z.enum(["house", "condo", "townhouse", "multi_family"])).optional(),
  neighborhoods: z.array(z.string()).optional(),
  selected_areas: z.array(SelectedAreaSchema).optional(),
  open_to_suggestions: z.boolean().optional(),
  must_haves: z.array(MustHaveSchema).optional(),
  deal_breakers: z.array(DealBreakerSchema).optional(),
  first_time_buyer: z.boolean().optional(),
  anything_else: z.string().optional(),
  tier_hint: z.enum(["captured", "browsing"]).optional(),
  source: z.string().optional()
});

export const IntakeNextQuestionDecisionSchema = z.object({
  next_question_id: QuestionIdSchema,
  reason: z.string().optional()
});

export const AgentBriefSchema = z.object({
  one_line_summary: z.string().max(120),
  why_serious: z.array(z.string()).min(0).max(4),
  watch_outs: z.array(z.string()).min(0).max(3),
  suggested_opener: z.string(),
  priority: z.enum(["hot", "warm", "browsing"])
});

export const PerListingMatchReasonSchema = z.object({
  listing_id: z.string(),
  match_reason: z.string()
});

export const PerListingMatchReasonsSchema = z.object({
  reasons: z.array(PerListingMatchReasonSchema)
});

export const WhatsNewResponseSchema = z.object({
  summary: z.string()
});

export const VoiceGenerationSchema = z.object({
  bio: z.string(),
  headline: z.string(),
  sub_headline: z.string(),
  voice_notes: z.string()
});

export const ReplyTemplateSchema = z.object({
  scenario: z.enum(["instagram_dm", "missed_call", "open_house", "zillow_lead"]),
  template_text: z.string()
});

export const ReplyTemplatesSchema = z.object({
  templates: z.array(ReplyTemplateSchema).min(4).max(4)
});

export const RegenerateOpenerSchema = z.object({
  suggested_opener: z.string()
});

export type QuestionId = z.infer<typeof QuestionIdSchema>;
export type IntakeAnswers = z.infer<typeof IntakeAnswersSchema>;
export type FreeTextExtractionResult = z.infer<typeof FreeTextExtractionSchema>;
export type IntakeNextQuestionDecision = z.infer<typeof IntakeNextQuestionDecisionSchema>;
export type AgentBrief = z.infer<typeof AgentBriefSchema>;
export type VoiceGeneration = z.infer<typeof VoiceGenerationSchema>;
export type ReplyTemplates = z.infer<typeof ReplyTemplatesSchema>;
