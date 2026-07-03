"use client"

import * as React from "react"

import type { ReadingQuery } from "@/features/dashboard/lib/dashboard-types"

import { DEFAULT_READING_QUERY } from "./dashboard-constants"

export function useReadingQuery() {
  const [readingQuery, setReadingQuery] =
    React.useState<ReadingQuery>(DEFAULT_READING_QUERY)

  const resetReadingQuery = React.useCallback(() => {
    setReadingQuery(DEFAULT_READING_QUERY)
  }, [])

  const updateReadingQuery = React.useCallback((patch: Partial<ReadingQuery>) => {
    setReadingQuery((current) => ({
      ...current,
      ...patch,
      page:
        patch.channel !== undefined ||
        patch.status !== undefined ||
        patch.pageSize !== undefined
          ? 1
          : patch.page ?? current.page,
    }))
  }, [])

  return {
    readingQuery,
    resetReadingQuery,
    updateReadingQuery,
  }
}
