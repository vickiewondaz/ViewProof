import { z } from "zod";

export const ListingTypeEnum = z.enum(["rent", "sale", "land", "commercial", "other"]);
export const ListingStatusEnum = z.enum([
  "Draft",
  "Active",
  "NeedsReview",
  "StalePaused",
  "Unavailable",
  "Archived",
]);

export const ListingCreate = z.object({
  title: z.string().min(3).max(120),
  type: ListingTypeEnum,
  area: z.string().min(2).max(120),
  price: z.coerce.number().positive(),
  currency: z.string().default("NGN"),
  agentId: z.string().optional(),
  imageUrls: z.array(z.string().url()).default([]),
  photographedAt: z.coerce.date().optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  accessRef: z.string().max(120).optional(),
  internalNotes: z.string().max(5000).optional(),
  status: ListingStatusEnum.default("Draft"),
});

export const ListingUpdate = ListingCreate.partial().extend({
  lastConfirmedAt: z.coerce.date().optional(),
});

export type ListingCreateInput = z.infer<typeof ListingCreate>;

export function slugify(...parts: string[]) {
  const base = parts
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${base || "listing"}-${rand}`;
}

// Active gate (PRD 7.2 + Thinking §13): photo <30d + ≥1 image + agent assigned.
export function activeGate(input: {
  imageUrls: string[];
  photographedAt?: Date;
  agentId?: string;
}): string[] {
  const missing: string[] = [];
  if (!input.agentId) missing.push("assigned agent");
  if (!input.imageUrls.length) missing.push("at least one image or explicit image status");
  if (!input.photographedAt) missing.push("photographed-on date");
  else {
    const ageDays =
      (Date.now() - input.photographedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > 30) missing.push("photo newer than 30 days");
  }
  return missing;
}
