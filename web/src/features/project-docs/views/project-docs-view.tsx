"use client"

import { FileTextIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Markdown } from "@/components/ui/markdown"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { useProjectDocs } from "@/features/project-docs/hooks/use-project-docs"
import type { ProjectDocSlug } from "@/lib/project-docs/docs"

export function ProjectDocsView({
  docs,
}: {
  docs: ReturnType<typeof useProjectDocs>
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <FileTextIcon aria-hidden="true" />
                Project Docs
              </CardTitle>
              <p className="text-sm text-muted-foreground break-words">
                View allowlisted repository Markdown files inside the dashboard.
              </p>
            </div>
            <Select
              value={docs.activeSlug}
              onValueChange={(value) =>
                docs.setActiveSlug(value as ProjectDocSlug)
              }
            >
              <SelectTrigger aria-label="Project document" className="w-full sm:w-64">
                <SelectValue placeholder="Select Document" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {docs.docs.map((doc) => (
                    <SelectItem key={doc.slug} value={doc.slug}>
                      {doc.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {docs.error && (
        <Alert variant="destructive">
          <AlertTitle>Document Error</AlertTitle>
          <AlertDescription>{docs.error}</AlertDescription>
        </Alert>
      )}

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>{docs.activeDoc?.title ?? "Project Document"}</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.loading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <ScrollArea className="h-[calc(100dvh-14rem)] min-h-[28rem] pr-4">
              <Markdown className="project-docs-markdown">
                {docs.content}
              </Markdown>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
