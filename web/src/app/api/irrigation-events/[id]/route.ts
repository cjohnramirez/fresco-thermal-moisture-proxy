import { NextResponse } from "next/server"

import {
  normalizeIrrigationEventRow,
  toSupabaseIrrigationPayload,
  updateIrrigationEventSchema,
  type SupabaseIrrigationEventRow,
} from "@/lib/experiment/irrigation"
import { createSupabaseServerClient, supabaseNotConfiguredResponse } from "@/lib/supabase/server"

const eventSelect =
  "id,bag_id,watered_at,water_l,water_temp_c,pre_mass_kg,post_mass_kg,drained_mass_kg,drained_at,note,created_at,archived_at"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const supabase = createSupabaseServerClient()

  if (!supabase) {
    return supabaseNotConfiguredResponse()
  }

  const { id } = await context.params
  const raw = await request.json().catch(() => null)
  const parsed = updateIrrigationEventSchema.safeParse(raw)

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid event update.",
        issues: parsed.error.issues,
      },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("irrigation_events")
    .update(toSupabaseIrrigationPayload(parsed.data))
    .eq("id", id)
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

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = createSupabaseServerClient()

  if (!supabase) {
    return supabaseNotConfiguredResponse()
  }

  const { id } = await context.params
  const { data, error } = await supabase
    .from("irrigation_events")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
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
