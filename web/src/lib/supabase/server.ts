import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return { key, url }
}

export function supabaseNotConfiguredResponse() {
  return NextResponse.json(
    {
      ok: false,
      code: "not_configured",
      message: "Supabase env vars are not configured.",
    },
    { status: 503 }
  )
}

export function createSupabaseServerClient() {
  const { key, url } = supabaseEnv()

  if (!url || !key) {
    return null
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
