"use client";

import { useFittingStore } from "@/store/fitting-store";
import {
  formatHP,
  formatDPS,
  formatRange,
  formatSpeed,
  formatTime,
  formatCap,
  resistToPercent,
} from "@/lib/utils";
import { DAMAGE_COLORS } from "@/lib/utils";
import { Shield, Crosshair, Navigation, Cpu, Gauge, Target } from "lucide-react";
import { SkillModeToggle } from "./SkillModeToggle";
import { SkillModeWatcher } from "./SkillModeWatcher";
import type { SkillDeltas } from "@/types/eve";

export function StatsPanel() {
  const stats = useFittingStore((s) => s.stats);
  const skillDeltas = useFittingStore((s) => s.skillDeltas);
  if (!stats) return null;

  return (
    <div className="space-y-4">
      <SkillModeWatcher />
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-foreground/40">
          Stats
        </span>
        <SkillModeToggle />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* Defense */}
        <StatCard title="Defense" icon={Shield}>
          <DefenseLayer label="Shield" layer={stats.shield} hpDelta={skillDeltas?.shield_hp} />
          <DefenseLayer label="Armor" layer={stats.armor} hpDelta={skillDeltas?.armor_hp} />
          <DefenseLayer label="Hull" layer={stats.hull} hpDelta={skillDeltas?.hull_hp} />
          <div className="mt-2 border-t border-border pt-2">
            <StatRow label="Total EHP" value={formatHP(stats.total_ehp)} bold />
          </div>
        </StatCard>

        {/* Offense */}
        <StatCard title="Offense" icon={Crosshair}>
          <StatRow label="Total DPS" value={formatDPS(stats.offense.total_dps)} bold />
          {stats.offense.turret_dps > 0 && (
            <StatRow label="Turret DPS" value={formatDPS(stats.offense.turret_dps)} />
          )}
          {stats.offense.missile_dps > 0 && (
            <StatRow label="Missile DPS" value={formatDPS(stats.offense.missile_dps)} />
          )}
          {stats.offense.drone_dps > 0 && (
            <StatRow label="Drone DPS" value={formatDPS(stats.offense.drone_dps)} />
          )}
          <StatRow label="Alpha" value={formatHP(stats.offense.alpha)} />
          {stats.offense.turret_optimal > 0 && (
            <StatRow label="Turret Optimal" value={formatRange(stats.offense.turret_optimal)} />
          )}
          {stats.offense.turret_falloff > 0 && (
            <StatRow label="Turret Falloff" value={`+ ${formatRange(stats.offense.turret_falloff)}`} />
          )}
          {stats.offense.missile_range > 0 && (
            <StatRow label="Missile Range" value={formatRange(stats.offense.missile_range)} />
          )}
        </StatCard>

        {/* Capacitor */}
        <StatCard title="Capacitor" icon={Gauge}>
          <StatRow
            label="Capacity"
            value={formatCap(stats.capacitor.capacity)}
            delta={skillDeltas?.cap_capacity}
            formatDelta={(d) => `${d >= 0 ? "+" : ""}${d.toFixed(0)} GJ`}
          />
          <StatRow
            label="Recharge"
            value={formatTime(stats.capacitor.recharge_rate)}
            delta={skillDeltas?.cap_recharge}
            formatDelta={(d) => `${d >= 0 ? "+" : ""}${d.toFixed(1)}s`}
            deltaIsReduction
          />
          <StatRow label="Peak Recharge" value={`${stats.capacitor.peak_recharge.toFixed(1)} GJ/s`} />
          <StatRow label="Drain" value={`${stats.capacitor.drain_per_second.toFixed(1)} GJ/s`} />
          <div className="mt-2 border-t border-border pt-2">
            {stats.capacitor.stable ? (
              <StatRow
                label="Stable"
                value={`${stats.capacitor.stable_percent ?? 100}%`}
                valueClass="text-success"
                bold
              />
            ) : (
              <StatRow
                label="Lasts"
                value={formatTime(stats.capacitor.lasts_seconds ?? 0)}
                valueClass="text-danger"
                bold
              />
            )}
          </div>
        </StatCard>

        {/* Navigation */}
        <StatCard title="Navigation" icon={Navigation}>
          <StatRow
            label="Max Velocity"
            value={formatSpeed(stats.navigation.max_velocity)}
            delta={skillDeltas?.max_velocity}
            formatDelta={(d) => `${d >= 0 ? "+" : ""}${d.toFixed(0)} m/s`}
          />
          <StatRow label="Warp Speed" value={`${stats.navigation.warp_speed.toFixed(1)} AU/s`} />
          <StatRow
            label="Align Time"
            value={formatTime(stats.navigation.align_time)}
            delta={skillDeltas?.align_time}
            formatDelta={(d) => `${d >= 0 ? "+" : ""}${d.toFixed(1)}s`}
            deltaIsReduction
          />
          <StatRow label="Signature" value={`${stats.navigation.signature_radius.toFixed(0)} m`} />
          <StatRow label="Mass" value={`${(stats.navigation.mass / 1_000_000).toFixed(1)} kt`} />
          <StatRow
            label="Inertia"
            value={stats.navigation.inertia_modifier.toFixed(3)}
            delta={skillDeltas?.inertia_modifier}
            formatDelta={(d) => `${d >= 0 ? "+" : ""}${d.toFixed(3)}`}
            deltaIsReduction
          />
        </StatCard>

        {/* Targeting */}
        <StatCard title="Targeting" icon={Target}>
          <StatRow
            label="Max Targets"
            value={String(stats.targeting.max_targets)}
            delta={skillDeltas?.max_targets}
            formatDelta={(d) => `${d >= 0 ? "+" : ""}${d}`}
          />
          <StatRow
            label="Target Range"
            value={formatRange(stats.targeting.max_target_range)}
            delta={skillDeltas?.max_target_range}
            formatDelta={(d) => `${d >= 0 ? "+" : ""}${formatRange(d)}`}
          />
          <StatRow
            label="Scan Resolution"
            value={`${stats.targeting.scan_resolution.toFixed(0)} mm`}
            delta={skillDeltas?.scan_resolution}
            formatDelta={(d) => `${d >= 0 ? "+" : ""}${d.toFixed(0)} mm`}
          />
          <StatRow label="Sensor" value={`${stats.targeting.sensor_type} (${stats.targeting.sensor_strength.toFixed(0)})`} />
        </StatCard>

        {/* Engineering */}
        <StatCard title="Engineering" icon={Cpu}>
          <ResourceRow
            label="CPU"
            used={stats.engineering.cpu_used}
            total={stats.engineering.cpu_total}
            unit="tf"
            totalDelta={skillDeltas?.cpu_total}
          />
          <ResourceRow
            label="Powergrid"
            used={stats.engineering.pg_used}
            total={stats.engineering.pg_total}
            unit="MW"
            totalDelta={skillDeltas?.pg_total}
          />
          <ResourceRow
            label="Calibration"
            used={stats.engineering.calibration_used}
            total={stats.engineering.calibration_total}
            unit=""
          />
          {stats.engineering.drone_bandwidth_total > 0 && (
            <ResourceRow
              label="Drone BW"
              used={stats.engineering.drone_bandwidth_used}
              total={stats.engineering.drone_bandwidth_total}
              unit="Mbit/s"
            />
          )}
          {stats.engineering.drone_capacity > 0 && (
            <ResourceRow
              label="Drone Bay"
              used={stats.engineering.drone_capacity_used}
              total={stats.engineering.drone_capacity}
              unit="m³"
            />
          )}
        </StatCard>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-2 border-b border-border pb-2">
        <Icon className="h-4 w-4 text-accent" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/60">{title}</h3>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DeltaBadge({
  delta,
  formatDelta,
  deltaIsReduction,
}: {
  delta: number;
  formatDelta: (d: number) => string;
  deltaIsReduction?: boolean;
}) {
  if (Math.abs(delta) < 0.001) return null;
  // For "reduction" stats (inertia, recharge, align), negative is good
  const isGood = deltaIsReduction ? delta < 0 : delta > 0;
  return (
    <span className={`ml-1 text-[9px] font-mono ${isGood ? "text-green-400" : "text-red-400"}`}>
      ({formatDelta(delta)})
    </span>
  );
}

function StatRow({
  label,
  value,
  bold,
  valueClass,
  delta,
  formatDelta,
  deltaIsReduction,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueClass?: string;
  delta?: number;
  formatDelta?: (d: number) => string;
  deltaIsReduction?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-foreground/50">{label}</span>
      <span className={`font-mono ${bold ? "font-semibold text-foreground" : "text-foreground/80"} ${valueClass ?? ""}`}>
        {value}
        {delta != null && formatDelta && (
          <DeltaBadge delta={delta} formatDelta={formatDelta} deltaIsReduction={deltaIsReduction} />
        )}
      </span>
    </div>
  );
}

function DefenseLayer({
  label,
  layer,
  hpDelta,
}: {
  label: string;
  layer: { hp: number; ehp: number; resist: { em: number; thermal: number; kinetic: number; explosive: number } };
  hpDelta?: number;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground/50">{label}</span>
        <span className="font-mono text-foreground/80">
          {formatHP(layer.hp)} HP
          {hpDelta != null && (
            <DeltaBadge delta={hpDelta} formatDelta={(d) => `${d >= 0 ? "+" : ""}${formatHP(d)}`} />
          )}
          {" / "}{formatHP(layer.ehp)} EHP
        </span>
      </div>
      <div className="flex gap-1">
        <ResistBar type="em" value={resistToPercent(layer.resist.em)} />
        <ResistBar type="thermal" value={resistToPercent(layer.resist.thermal)} />
        <ResistBar type="kinetic" value={resistToPercent(layer.resist.kinetic)} />
        <ResistBar type="explosive" value={resistToPercent(layer.resist.explosive)} />
      </div>
    </div>
  );
}

function ResistBar({ type, value }: { type: keyof typeof DAMAGE_COLORS; value: number }) {
  const color = DAMAGE_COLORS[type];
  return (
    <div className="flex-1" title={`${type}: ${value.toFixed(1)}%`}>
      <div className="h-1.5 w-full rounded-full bg-border">
        <div
          className={`h-full rounded-full ${color.bg}`}
          style={{ width: `${Math.min(value, 100)}%`, opacity: 0.7 }}
        />
      </div>
      <div className={`mt-0.5 text-center text-[9px] font-mono ${color.text}`}>
        {value.toFixed(0)}%
      </div>
    </div>
  );
}

function ResourceRow({
  label,
  used,
  total,
  unit,
  totalDelta,
}: {
  label: string;
  used: number;
  total: number;
  unit: string;
  totalDelta?: number;
}) {
  const over = used > total;
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground/50">{label}</span>
        <span className={`font-mono ${over ? "text-danger font-semibold" : "text-foreground/80"}`}>
          {used.toFixed(0)}/{total.toFixed(0)}{unit ? ` ${unit}` : ""}
          {totalDelta != null && (
            <DeltaBadge
              delta={totalDelta}
              formatDelta={(d) => `${d >= 0 ? "+" : ""}${d.toFixed(0)} ${unit}`}
            />
          )}
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-danger" : "bg-accent/60"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
