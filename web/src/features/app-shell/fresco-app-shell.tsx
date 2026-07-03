"use client"

import * as React from "react"
import {
  ActivityIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  CloudRainIcon,
  DatabaseIcon,
  FlaskConicalIcon,
  GaugeIcon,
  RefreshCwIcon,
  ThermometerIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  LogWateringDialog,
  LogWeightDialog,
} from "@/features/dashboard/components/irrigation-dialogs"
import { AnalyticsView } from "@/features/dashboard/views/analytics-view"
import { DashboardView } from "@/features/dashboard/views/dashboard-view"
import { MonitorView } from "@/features/dashboard/views/monitor-view"
import { useFrescoDashboard } from "@/features/dashboard/hooks/use-fresco-dashboard"
import { CloudBadge } from "@/features/dashboard/shell/cloud-badge"
import { ExportMenu } from "@/features/dashboard/shell/export-menu"
import { ModeToggle } from "@/features/dashboard/shell/mode-toggle"
import type { View } from "@/features/dashboard/lib/dashboard-types"
import { ProjectDocsView } from "@/features/project-docs/views/project-docs-view"
import { useProjectDocs } from "@/features/project-docs/hooks/use-project-docs"
import { RainAnalyticsView } from "@/features/rain-gauge/views/rain-analytics-view"
import { RainDashboardView } from "@/features/rain-gauge/views/rain-dashboard-view"
import { RainGaugeStatusBadge } from "@/features/rain-gauge/components/rain-gauge-status-badge"
import { RainMonitorView } from "@/features/rain-gauge/views/rain-monitor-view"
import { useRainGaugeDashboard } from "@/features/rain-gauge/hooks/use-rain-gauge-dashboard"

type DashboardKind = "temperature" | "rain-gauge"
type Surface = "dashboard" | "docs"

const dashboards = [
  {
    id: "temperature",
    label: "Temperature",
    description: "Grow Bag",
    icon: ThermometerIcon,
  },
  {
    id: "rain-gauge",
    label: "Rain Gauge",
    description: "Tipping Bucket",
    icon: CloudRainIcon,
  },
] satisfies Array<{
  id: DashboardKind
  label: string
  description: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}>

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: GaugeIcon },
  { id: "monitor", label: "Monitor", icon: DatabaseIcon },
  { id: "analytics", label: "Analytics", icon: ActivityIcon },
] satisfies Array<{
  id: View
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}>

function DashboardSwitcher({
  activeDashboard,
  onSelect,
}: {
  activeDashboard: DashboardKind
  onSelect: (dashboard: DashboardKind) => void
}) {
  const activeDashboardMeta =
    dashboards.find((dashboard) => dashboard.id === activeDashboard) ??
    dashboards[0]
  const ActiveDashboardIcon = activeDashboardMeta.icon

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex size-8 items-center justify-center rounded-lg border bg-background">
              <ActiveDashboardIcon aria-hidden="true" />
            </div>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                Fresco Greenovations
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {activeDashboardMeta.label}
              </span>
            </div>
            <ChevronDownIcon aria-hidden="true" className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Dashboards</DropdownMenuLabel>
              {dashboards.map((dashboard) => (
                <DropdownMenuItem
                  key={dashboard.id}
                  onClick={() => onSelect(dashboard.id)}
                >
                  <dashboard.icon aria-hidden="true" />
                  <div className="grid min-w-0 flex-1">
                    <span className="truncate">{dashboard.label}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {dashboard.description}
                    </span>
                  </div>
                  {dashboard.id === activeDashboard && (
                    <CheckIcon aria-hidden="true" className="ml-auto" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function MainNavigation({
  activeView,
  surface,
  onSelect,
}: {
  activeView: View
  surface: Surface
  onSelect: (view: View) => void
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Views</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={surface === "dashboard" && activeView === item.id}
                tooltip={item.label}
                onClick={() => onSelect(item.id)}
              >
                <item.icon aria-hidden="true" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function ProjectDocumentation({
  docs,
  surface,
  onOpenDoc,
}: {
  docs: ReturnType<typeof useProjectDocs>
  surface: Surface
  onOpenDoc: (slug: ReturnType<typeof useProjectDocs>["activeSlug"]) => void
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Project Documentation</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={surface === "docs"}
              tooltip="Project Docs"
              onClick={() => onOpenDoc(docs.activeSlug)}
            >
              <BookOpenIcon aria-hidden="true" />
              <span>Project Docs</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function SessionSummary({
  activeDashboard,
  rain,
  temperature,
}: {
  activeDashboard: DashboardKind
  rain: ReturnType<typeof useRainGaugeDashboard>
  temperature: ReturnType<typeof useFrescoDashboard>
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Session</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="flex flex-col gap-2 px-2 text-xs text-muted-foreground">
          {activeDashboard === "temperature" ? (
            <>
              <div className="break-all">{temperature.sessionId}</div>
              <Separator />
              <div>{temperature.readings.length} channel readings</div>
              <div>{temperature.irrigationEvents.length} watering events</div>
            </>
          ) : (
            <>
              <div className="break-all">{rain.session.id}</div>
              <Separator />
              <div>{rain.readings.length} local readings</div>
              <div>{rain.calibrationTrials.length} calibration trials</div>
            </>
          )}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function FrescoAppShell() {
  const temperature = useFrescoDashboard()
  const rain = useRainGaugeDashboard()
  const docs = useProjectDocs()
  const [activeDashboard, setActiveDashboard] =
    React.useState<DashboardKind>("temperature")
  const [surface, setSurface] = React.useState<Surface>("dashboard")
  const [activeView, setActiveViewState] = React.useState<View>("dashboard")
  const [wateringDialogOpen, setWateringDialogOpen] = React.useState(false)
  const [wateringDialogKey, setWateringDialogKey] = React.useState(0)
  const [weightDialogOpen, setWeightDialogOpen] = React.useState(false)

  const openWateringDialog = React.useCallback(() => {
    setWateringDialogKey(Date.now())
    setWateringDialogOpen(true)
  }, [])

  const selectDashboard = React.useCallback((dashboard: DashboardKind) => {
    setActiveDashboard(dashboard)
    setSurface("dashboard")
  }, [])

  const openProjectDoc = React.useCallback(
    (slug: ReturnType<typeof useProjectDocs>["activeSlug"]) => {
      setSurface("docs")
      docs.setActiveSlug(slug)
    },
    [docs]
  )

  const setActiveView = React.useCallback(
    (view: View) => {
      setSurface("dashboard")
      setActiveViewState(view)
      if (activeDashboard === "temperature") {
        temperature.setActiveView(view)
      }
    },
    [activeDashboard, temperature]
  )

  const title =
    surface === "docs"
      ? "Project Docs"
      : activeDashboard === "temperature"
        ? "Temperature Dashboard"
        : "Rain Gauge Dashboard"

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <DashboardSwitcher
            activeDashboard={activeDashboard}
            onSelect={selectDashboard}
          />
        </SidebarHeader>
        <SidebarContent>
          <MainNavigation
            activeView={activeView}
            surface={surface}
            onSelect={setActiveView}
          />
          <ProjectDocumentation
            docs={docs}
            surface={surface}
            onOpenDoc={openProjectDoc}
          />
          <SessionSummary
            activeDashboard={activeDashboard}
            rain={rain}
            temperature={temperature}
          />
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center justify-between px-2 py-1">
            <ModeToggle />
            {activeDashboard === "temperature" && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="New temperature session"
                      onClick={temperature.resetSession}
                    />
                  }
                >
                  <FlaskConicalIcon />
                </TooltipTrigger>
                <TooltipContent>New Temperature Session</TooltipContent>
              </Tooltip>
            )}
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="flex min-h-14 flex-col items-stretch gap-2 border-b px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <h1 className="truncate text-base font-semibold">{title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {surface === "dashboard" && activeDashboard === "temperature" && (
              <>
                <CloudBadge state={temperature.cloudState} />
                <ExportMenu
                  cloudState={temperature.cloudState}
                  eventsError={temperature.eventsError}
                  irrigationEvents={temperature.irrigationEvents}
                  loadingState={temperature.loadingState}
                  readings={temperature.readings}
                  sessionId={temperature.sessionId}
                  weekAnalysis={temperature.weekAnalysis}
                />
                <Button
                  type="button"
                  onClick={temperature.refreshFromSupabase}
                  disabled={temperature.loadingState.cloudRefreshing}
                >
                  {temperature.loadingState.cloudRefreshing ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <RefreshCwIcon data-icon="inline-start" />
                  )}
                  {temperature.loadingState.cloudRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
              </>
            )}
            {surface === "dashboard" && activeDashboard === "rain-gauge" && (
              <RainGaugeStatusBadge state={rain.connectionState} />
            )}
          </div>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="min-w-0 overflow-x-hidden p-3 sm:p-4">
            {surface === "docs" ? (
              <ProjectDocsView docs={docs} />
            ) : activeDashboard === "temperature" ? (
              <>
                {activeView === "dashboard" && (
                  <DashboardView
                    chartRange={temperature.chartRange}
                    cloudState={temperature.cloudState}
                    health={temperature.health}
                    latest={temperature.latest}
                    loadingState={temperature.loadingState}
                    onChartRangeChange={temperature.setChartRange}
                    onLogWatering={openWateringDialog}
                    onLogWeight={() => setWeightDialogOpen(true)}
                    spread={temperature.spread}
                    summary={temperature.summary}
                    tempData={temperature.tempData}
                    wateringStatus={temperature.wateringStatus}
                  />
                )}
                {activeView === "monitor" && (
                  <MonitorView
                    archiveIrrigationEvent={temperature.archiveIrrigationEvent}
                    cloudState={temperature.cloudState}
                    includeArchived={temperature.includeArchived}
                    irrigationEvents={temperature.irrigationEvents}
                    loadingState={temperature.loadingState}
                    loadSample={temperature.loadSample}
                    onLogWatering={openWateringDialog}
                    onLogWeight={() => setWeightDialogOpen(true)}
                    pagination={temperature.pagination}
                    readingQuery={temperature.readingQuery}
                    readings={temperature.readings}
                    refreshFromSupabase={temperature.refreshFromSupabase}
                    setIncludeArchived={temperature.setIncludeArchived}
                    updateIrrigationEvent={temperature.updateIrrigationEvent}
                    updateReadingQuery={temperature.updateReadingQuery}
                    wateringStatus={temperature.wateringStatus}
                  />
                )}
                {activeView === "analytics" && (
                  <AnalyticsView
                    chartRange={temperature.chartRange}
                    loadingState={temperature.loadingState}
                    onChartRangeChange={temperature.setChartRange}
                    runWeekAnalysis={temperature.runWeekAnalysis}
                    setWeekRange={temperature.setWeekRange}
                    summary={temperature.summary}
                    weekAnalysis={temperature.weekAnalysis}
                    weekAnalysisState={temperature.weekAnalysisState}
                    weekRange={temperature.weekRange}
                  />
                )}
              </>
            ) : (
              <>
                {activeView === "dashboard" && (
                  <RainDashboardView rain={rain} />
                )}
                {activeView === "monitor" && (
                  <RainMonitorView rain={rain} />
                )}
                {activeView === "analytics" && (
                  <RainAnalyticsView rain={rain} />
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SidebarInset>

      <LogWateringDialog
        key={wateringDialogKey}
        open={wateringDialogOpen}
        onOpenChange={setWateringDialogOpen}
        onSubmit={temperature.createIrrigationEvent}
      />
      <LogWeightDialog
        event={temperature.wateringStatus.event}
        open={weightDialogOpen}
        onOpenChange={setWeightDialogOpen}
        onSubmit={temperature.updateIrrigationEvent}
      />
    </SidebarProvider>
  )
}
