import { readFile } from "node:fs/promises"

import { NextResponse } from "next/server"

import { projectDocForSlug, projectDocPath } from "@/lib/project-docs/docs"

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params
  const doc = projectDocForSlug(slug)
  const filePath = projectDocPath(slug)

  if (!doc || !filePath) {
    return NextResponse.json(
      {
        ok: false,
        code: "not_found",
        message: "This project document is not available.",
      },
      { status: 404 }
    )
  }

  try {
    const content = await readFile(filePath, "utf8")
    return NextResponse.json({ ok: true, doc, content })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "read_error",
        message:
          error instanceof Error
            ? error.message
            : "The project document could not be read.",
      },
      { status: 500 }
    )
  }
}
