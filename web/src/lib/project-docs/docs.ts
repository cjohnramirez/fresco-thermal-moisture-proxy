import path from "node:path"

export type ProjectDocSlug =
  | "readme"
  | "api"
  | "data-contract"
  | "frontend-dashboard"
  | "growbag-temp-project"
  | "rain-gauge-project"

export const PROJECT_DOCS: Array<{
  slug: ProjectDocSlug
  title: string
  path: string
}> = [
  { slug: "readme", title: "README", path: "README.md" },
  { slug: "api", title: "API Reference", path: "docs/api.md" },
  { slug: "data-contract", title: "Data Contract", path: "docs/data-contract.md" },
  {
    slug: "frontend-dashboard",
    title: "Frontend Dashboard",
    path: "docs/frontend-dashboard.md",
  },
  {
    slug: "growbag-temp-project",
    title: "Grow Bag Temperature",
    path: "docs/growbag-temp-project.md",
  },
  {
    slug: "rain-gauge-project",
    title: "Rain Gauge Project",
    path: "docs/rain-gauge-project.md",
  },
]

export function projectDocForSlug(slug: string) {
  return PROJECT_DOCS.find((doc) => doc.slug === slug) ?? null
}

export function projectDocPath(slug: string) {
  const doc = projectDocForSlug(slug)
  if (!doc) {
    return null
  }

  return path.resolve(process.cwd(), "..", doc.path)
}
