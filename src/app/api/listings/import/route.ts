import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaffUser } from "@/lib/session";
import { ListingTypeEnum, slugify } from "@/lib/listings";
import { parseCsv } from "@/lib/csv";

// Columns: title,type,area,price,currency,agentPhone,imageUrl,photographedAt

const Row = z.object({
  title: z.string().min(3),
  type: ListingTypeEnum,
  area: z.string().min(2),
  price: z.coerce.number().positive(),
  currency: z.string().default("NGN"),
  agentPhone: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  photographedAt: z.coerce.date().optional(),
});

// POST /api/listings/import { csv } — always Draft, human approves later.
export async function POST(req: Request) {
  const u = await getStaffUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  if (!u.agencyId) return NextResponse.json({ ok: false }, { status: 403 });
  const { csv } = (await req.json().catch(() => ({}))) as { csv?: string };
  if (!csv || typeof csv !== "string")
    return NextResponse.json({ ok: false, error: "csv required" }, { status: 400 });

  const rows = parseCsv(csv).filter((r) => r.some((v) => v));
  const header = (rows.shift() ?? []).map((h) => h.toLowerCase());
  const idx = (n: string) => header.indexOf(n);
  const created: string[] = [];
  const errors: { row: number; error: string }[] = [];

  const agents = await prisma.agent.findMany({ where: { agencyId: u.agencyId } });
  const byPhone = new Map(agents.map((a) => [a.phone, a.id]));

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const get = (n: string) => {
      const j = idx(n);
      return j >= 0 ? r[j] ?? "" : "";
    };
    const parsed = Row.safeParse({
      title: get("title"),
      type: get("type") || "rent",
      area: get("area"),
      price: get("price"),
      currency: get("currency") || "NGN",
      agentPhone: get("agentphone") || get("agent_phone") || undefined,
      imageUrl: get("imageurl") || get("image_url") || "",
      photographedAt: get("photographedat") || get("photographed_at") || undefined,
    });
    if (!parsed.success) {
      errors.push({ row: i + 2, error: parsed.error.issues[0]?.message ?? "invalid" });
      continue;
    }
    const d = parsed.data;
    const l = await prisma.listing.create({
      data: {
        agencyId: u.agencyId!,
        agentId: (d.agentPhone && byPhone.get(d.agentPhone)) || undefined,
        title: d.title,
        type: d.type as never,
        area: d.area,
        price: d.price,
        currency: d.currency,
        status: "Draft" as never,
        imageUrls: d.imageUrl ? [d.imageUrl] : [],
        photographedAt: d.photographedAt,
        features: {},
        slug: slugify(d.title, d.area),
        lastConfirmedAt: new Date(),
      },
    });
    created.push(l.id);
  }
  await audit({ actor: u.id, entity: "listing", entityId: u.agencyId!, action: "csv-import", diff: { created: created.length, errors: errors.length } });
  return NextResponse.json({ ok: true, created, errors }, { status: 201 });
}
