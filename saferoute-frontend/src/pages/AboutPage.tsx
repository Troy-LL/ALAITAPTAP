import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  BrainCircuit,
  Clock,
  Code,
  Database,
  Layers,
  Lightbulb,
  Map,
  MapPin,
  Palette,
  Server,
  Smartphone,
  Store,
  Sun,
  Target,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { BrandName } from "@/components/BrandName"

const TECH_STACK: { icon: LucideIcon; name: string; desc: string }[] = [
  { icon: Server, name: "FastAPI", desc: "Python REST API backend" },
  { icon: BrainCircuit, name: "scikit-learn", desc: "Safety score ML model" },
  { icon: MapPin, name: "OpenRouteService", desc: "Real walking directions" },
  { icon: Code, name: "React + Vite", desc: "Frontend SPA" },
  { icon: Map, name: "Leaflet.js", desc: "Interactive dark map" },
  { icon: Smartphone, name: "Twilio SMS", desc: "Emergency buddy alerts" },
  { icon: Database, name: "PostgreSQL", desc: "Incident & spot data" },
  { icon: Palette, name: "CartoDB Dark", desc: "Dark map tile layer" },
]

const SOLUTION_ITEMS: {
  icon: LucideIcon
  title: string
  description: string
}[] = [
  {
    icon: AlertTriangle,
    title: "Crime incident density",
    description: "Weighted by recency and severity.",
  },
  {
    icon: Sun,
    title: "Street lighting",
    description: "Bright corridors score higher at night.",
  },
  {
    icon: Store,
    title: "Safe waypoints",
    description: "Routes favor police stations, convenience stores, and similar anchors.",
  },
  {
    icon: Users,
    title: "Foot traffic",
    description: "Populated streets contribute to a higher safety score.",
  },
  {
    icon: Clock,
    title: "Time-of-day adjustment",
    description: "Scores shift dynamically based on when you walk.",
  },
]

const cardClass =
  "rounded-2xl border border-border bg-card shadow-sm gap-0 py-0 [&_[data-slot=card-header]]:border-b [&_[data-slot=card-header]]:border-border [&_[data-slot=card-header]]:pb-4 [&_[data-slot=card-header]]:pt-6"

export default function AboutPage() {
  return (
    <div className="min-h-screen px-4 py-24">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-4 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            About{" "}
            <BrandName className="inline font-bold text-4xl md:text-5xl" />
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary" className="text-xs font-medium md:text-sm">
              Pedestrian safety for Metro Manila
            </Badge>
          </div>
        </header>

        <Separator />

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-2xl font-bold">
              <Target
                className="size-7 shrink-0 text-primary"
                aria-hidden
              />
              The Problem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6 text-muted-foreground">
            <p>
              Metro Manila ranks among the most dangerous cities in Southeast Asia for
              pedestrians. Snatching, mugging, and harassment remain common, especially at
              night. Traditional navigation apps optimize for speed and distance, not for
              how safe a walk feels on the ground.
            </p>
            <p>
              Women, students, and workers traveling alone still lack a dedicated way to plan
              which streets to use, which areas to avoid after dark, and how to reach help if
              something goes wrong.
            </p>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-2xl font-bold">
              <Lightbulb
                className="size-7 shrink-0 text-primary"
                aria-hidden
              />
              Our Solution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pb-6 text-muted-foreground">
            <p>
              ALAITAPTAP is an AI-assisted pedestrian safety navigator that ranks walking
              routes using a composite{" "}
              <span className="font-medium text-foreground">Safety Score</span> built from:
            </p>
            <ul className="space-y-4">
              {SOLUTION_ITEMS.map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{title}</p>
                    <p className="text-sm leading-relaxed">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h2 className="font-display flex items-center justify-center gap-2 text-center text-2xl font-bold md:justify-start md:text-left">
            <Layers className="size-7 shrink-0 text-primary" aria-hidden />
            How We Built It
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {TECH_STACK.map(({ icon: Icon, name, desc }) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-4"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{name}</p>
                  <p className="text-xs leading-snug text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="font-display text-2xl font-bold">
              Safety Score Algorithm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6 text-muted-foreground">
            <p>Each route is scored from 0–100 using a weighted formula:</p>
            <pre className="overflow-x-auto rounded-xl bg-muted p-4 font-mono text-sm text-foreground">
              {`SafetyScore = 100
  - crime_count × 4.0     (recent incidents)
  + lit_ratio × 15        (well-lit streets)
  + safe_spot_count × 3.0 (nearby safe spots)
  + foot_traffic × 10     (busy corridors)
  - night_penalty         (12–5am deduction)`}
            </pre>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-2xl font-bold">
              <AlertTriangle
                className="size-7 shrink-0 text-amber-600 dark:text-amber-500"
                aria-hidden
              />
              Disclaimer
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6 text-muted-foreground">
            <p>
              This prototype uses <span className="font-medium text-foreground">synthetic demo data</span>{" "}
              for demonstration. In production it would integrate with official PNP crime
              blotter APIs, MMDA feeds, and validated crowdsourced reports. ALAITAPTAP is not a
              substitute for situational awareness or personal judgment. Stay alert and trust
              your instincts.
            </p>
          </CardContent>
        </Card>

        <Separator />

        <footer className="text-center text-sm text-muted-foreground">
          ALAITAPTAP · ASEAN Innovation Challenge 2025 · Open source
        </footer>
      </div>
    </div>
  )
}
