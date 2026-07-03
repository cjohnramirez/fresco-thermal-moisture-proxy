import { NextResponse } from "next/server"

import { PROJECT_DOCS } from "@/lib/project-docs/docs"

export async function GET() {
  return NextResponse.json({ ok: true, docs: PROJECT_DOCS })
}
