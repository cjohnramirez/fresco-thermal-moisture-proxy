import { NextResponse } from "next/server"

import {
  createIrrigationEventSchema,
  normalizeIrrigationEventRow,
  toSupabaseIrrigationPayload,
  type SupabaseIrrigationEventRow,
} from "@/lib/experiment/irrigation"
import { createSupabaseServerClient, supabaseNotConfiguredResponse } from "@/lib/supabase/server"

const eventSelect =
  "id,bag_id,watered_at,water_l,water_temp_c,pre_mass_kg,post_mass_kg,drained_mass_kg,drained_at,note,created_at,archived_at"

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient()

  if (!supabase) {
    return supabaseNotConfiguredResponse()
  }

  const url = new URL(request.url)
  const bagId = url.searchParams.get("bagId") ?? "bag-1"
  const includeArchived = url.searchParams.get("includeArchived") === "true"

  let query = supabase
    .from("irrigation_events")
    .select(eventSelect)
    .eq("bag_id", bagId)
    .order("watered_at", { ascending: false })

  if (!includeArchived) {
    query = query.is("archived_at", null)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { ok: false, code: "supabase_error", message: error.message },
      { status: 502 }
    )
  }

  return NextResponse.json({
    ok: true,
    events: ((data ?? []) as SupabaseIrrigationEventRow[]).map(
      normalizeIrrigationEventRow
    ),
  })
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()

  if (!supabase) {
    return supabaseNotConfiguredResponse()
  }

  const raw = await request.json().catch(() => null)
  const parsed = createIrrigationEventSchema.safeParse(raw)

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid event.",
        issues: parsed.error.issues,
      },
      { status: 400 }
    )
  }

  const open = await supabase
    .from("irrigation_events")
    .select("id")
    .eq("bag_id", parsed.data.bagId)
    .is("drained_mass_kg", null)
    .is("archived_at", null)
    .limit(1)

  if (open.error) {
    return NextResponse.json(
      { ok: false, code: "supabase_error", message: open.error.message },
      { status: 502 }
    )
  }

  if ((open.data ?? []).length > 0) {
    return NextResponse.json(
      {
        ok: false,
        code: "open_event_exists",
        message: "Log the +1 h weight before starting another watering.",
      },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from("irrigation_events")
    .insert(toSupabaseIrrigationPayload(parsed.data))
    .select(eventSelect)
    .single()

  if (error) {
    return NextResponse.json(
      { ok: false, code: "supabase_error", message: error.message },
      { status: 502 }
    )
  }

  return NextResponse.json({
    ok: true,
    event: normalizeIrrigationEventRow(data as SupabaseIrrigationEventRow),
  })
}
