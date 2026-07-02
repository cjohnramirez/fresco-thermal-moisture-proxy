"use client"

import * as React from "react"
import {
  ActivityIcon,
  DatabaseIcon,
  FlaskConicalIcon,
  GaugeIcon,
  RefreshCwIcon,
} from "lucide-react"

import { CloudBadge } from "@/components/dashboard/cloud-badge"
import type { View } from "@/components/dashboard/dashboard-types"
import { ExportMenu } from "@/components/dashboard/export-menu"
import {
  LogWateringDialog,
  LogWeightDialog,
} from "@/components/dashboard/irrigation-dialogs"
import { ModeToggle } from "@/components/dashboard/mode-toggle"
import { useFrescoDashboard } from "@/components/dashboard/use-fresco-dashboard"
import { AnalyticsView } from "@/components/dashboard/views/analytics-view"
import { DashboardView } from "@/components/dashboard/views/dashboard-view"
import { MonitorView } from "@/components/dashboard/views/monitor-view"
import { Button } from "@/components/ui/button"
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
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: GaugeIcon },
  { id: "monitor", label: "Monitor", icon: DatabaseIcon },
  { id: "analytics", label: "Analytics", icon: ActivityIcon },
] satisfies Array<{
  id: View
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}>

export function FrescoDashboard() {
  const dashboard = useFrescoDashboard()
  const [wateringDialogOpen, setWateringDialogOpen] = React.useState(false)
  const [weightDialogOpen, setWeightDialogOpen] = React.useState(false)

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex size-8 items-center justify-center rounded-lg border bg-background">
              <FlaskConicalIcon aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                Fresco Greenovations
              </div>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Views</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={dashboard.activeView === item.id}
                      onClick={() => dashboard.setActiveView(item.id)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Session</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="flex flex-col gap-2 px-2 text-xs text-muted-foreground">
                <div className="break-all">
                  {dashboard.sessionId}
                </div>
                <Separator />
                <div>{dashboard.readings.length} channel readings</div>
                <div>{dashboard.irrigationEvents.length} watering events</div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center justify-between px-2 py-1">
            <ModeToggle />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="New session"
                    onClick={dashboard.resetSession}
                  />
                }
              >
                <FlaskConicalIcon />
              </TooltipTrigger>
              <TooltipContent>New Session</TooltipContent>
            </Tooltip>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex min-h-14 flex-col items-stretch gap-2 border-b px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <h1 className="truncate text-base font-semibold">
              Temperature Dashboard
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CloudBadge state={dashboard.cloudState} />
            <ExportMenu
              irrigationEvents={dashboard.irrigationEvents}
              readings={dashboard.readings}
              sessionId={dashboard.sessionId}
              weekAnalysis={dashboard.weekAnalysis}
            />
            <Button
              type="button"
              onClick={dashboard.refreshFromSupabase}
              disabled={dashboard.cloudState.status === "loading"}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Refresh
            </Button>
          </div>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <main className="p-4">
            {dashboard.activeView === "dashboard" && (
              <DashboardView
                chartRange={dashboard.chartRange}
                cloudState={dashboard.cloudState}
                health={dashboard.health}
                latest={dashboard.latest}
                onChartRangeChange={dashboard.setChartRange}
                onLogWatering={() => setWateringDialogOpen(true)}
                onLogWeight={() => setWeightDialogOpen(true)}
                spread={dashboard.spread}
                summary={dashboard.summary}
                tempData={dashboard.tempData}
                wateringStatus={dashboard.wateringStatus}
              />
            )}
            {dashboard.activeView === "monitor" && (
              <MonitorView
                archiveIrrigationEvent={dashboard.archiveIrrigationEvent}
                cloudState={dashboard.cloudState}
                includeArchived={dashboard.includeArchived}
                irrigationEvents={dashboard.irrigationEvents}
                loadSample={dashboard.loadSample}
                onLogWatering={() => setWateringDialogOpen(true)}
                onLogWeight={() => setWeightDialogOpen(true)}
                pagination={dashboard.pagination}
                readingQuery={dashboard.readingQuery}
                readings={dashboard.readings}
                refreshFromSupabase={dashboard.refreshFromSupabase}
                setIncludeArchived={dashboard.setIncludeArchived}
                updateIrrigationEvent={dashboard.updateIrrigationEvent}
                updateReadingQuery={dashboard.updateReadingQuery}
                wateringStatus={dashboard.wateringStatus}
              />
            )}
            {dashboard.activeView === "analytics" && (
              <AnalyticsView
                chartRange={dashboard.chartRange}
                onChartRangeChange={dashboard.setChartRange}
                runWeekAnalysis={dashboard.runWeekAnalysis}
                setWeekRange={dashboard.setWeekRange}
                summary={dashboard.summary}
                weekAnalysis={dashboard.weekAnalysis}
                weekAnalysisState={dashboard.weekAnalysisState}
                weekRange={dashboard.weekRange}
              />
            )}
          </main>
        </ScrollArea>
      </SidebarInset>
      <LogWateringDialog
        open={wateringDialogOpen}
        onOpenChange={setWateringDialogOpen}
        onSubmit={dashboard.createIrrigationEvent}
      />
      <LogWeightDialog
        event={dashboard.wateringStatus.event}
        open={weightDialogOpen}
        onOpenChange={setWeightDialogOpen}
        onSubmit={dashboard.updateIrrigationEvent}
      />
    </SidebarProvider>
  )
}
