/**
 * EFT (EVE Fitting Tool) format parser & serializer
 *
 * EFT format example:
 * [Hurricane, My Hurricane Fit]
 * Gyrostabilizer II
 * Gyrostabilizer II
 * Tracking Enhancer II
 * Nanofiber Internal Structure II
 * Damage Control II
 *
 * 50MN Microwarpdrive II
 * Large Shield Extender II
 * Adaptive Invulnerability Field II
 * Warp Disruptor II
 *
 * 720mm Howitzer Artillery II, Republic Fleet EMP M
 * 720mm Howitzer Artillery II, Republic Fleet EMP M
 * 720mm Howitzer Artillery II, Republic Fleet EMP M
 * 720mm Howitzer Artillery II, Republic Fleet EMP M
 * 720mm Howitzer Artillery II, Republic Fleet EMP M
 * 720mm Howitzer Artillery II, Republic Fleet EMP M
 *
 * Medium Core Defense Field Extender I
 * Medium Core Defense Field Extender I
 * Medium Core Defense Field Extender I
 *
 *
 * Warrior II x5
 * Hobgoblin II x5
 */

import { SlotType } from "@/types/eve";

// ─── Parsed types ────────────────────────────────────────────────────────────

export interface EFTLine {
  name: string;
  charge?: string;
  quantity?: number;
}

export interface ParsedEFT {
  shipName: string;
  fitName: string;
  lowSlots: EFTLine[];
  midSlots: EFTLine[];
  highSlots: EFTLine[];
  rigSlots: EFTLine[];
  subsystems: EFTLine[];
  drones: EFTLine[];
  cargo: EFTLine[];
}

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * Parse an EFT-format fitting string into structured data.
 * The EFT format uses blank lines to separate slot groups.
 * Order: low, mid, high, rigs, subsystems, drones, cargo
 * (some variations put high first — we handle both via the resolver callback)
 */
export function parseEFT(eftText: string): ParsedEFT {
  const lines = eftText.trim().split("\n");
  if (lines.length === 0) {
    throw new Error("Empty EFT text");
  }

  // Parse header: [Ship Name, Fit Name]
  const headerLine = lines[0].trim();
  const headerMatch = headerLine.match(/^\[(.+?),\s*(.+?)\]$/);
  if (!headerMatch) {
    throw new Error(`Invalid EFT header: "${headerLine}". Expected format: [Ship Name, Fit Name]`);
  }

  const shipName = headerMatch[1].trim();
  const fitName = headerMatch[2].trim();

  // Split remaining lines into sections by blank lines
  const sections: EFTLine[][] = [];
  let currentSection: EFTLine[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === "" || line === "[Empty Low slot]" ||
        line === "[Empty Mid slot]" ||
        line === "[Empty High slot]" ||
        line === "[Empty Rig slot]" ||
        line === "[Empty Subsystem slot]") {
      // Empty slot markers or blank lines act as section boundaries
      // But only create a new section on blank lines between non-empty content
      if (line === "") {
        if (currentSection.length > 0) {
          sections.push(currentSection);
          currentSection = [];
        }
        continue;
      }
      // Skip empty slot markers
      continue;
    }

    const parsed = parseEFTLine(line);
    if (parsed) {
      currentSection.push(parsed);
    }
  }

  // Don't forget the last section
  if (currentSection.length > 0) {
    sections.push(currentSection);
  }

  // Map sections to slots. EFT standard order:
  // Section 0: Low slots
  // Section 1: Mid slots
  // Section 2: High slots
  // Section 3: Rig slots
  // Section 4: Subsystems (T3 only)
  // Section 5: Drones
  // Section 6: Cargo
  // (sections may be missing if ship has no items in that category)
  return {
    shipName,
    fitName,
    lowSlots: sections[0] || [],
    midSlots: sections[1] || [],
    highSlots: sections[2] || [],
    rigSlots: sections[3] || [],
    subsystems: sections[4] || [],
    drones: sections[5] || [],
    cargo: sections[6] || [],
  };
}

/**
 * Parse a single EFT line.
 * Formats:
 *   "Module Name"
 *   "Module Name, Charge Name"
 *   "Item Name x5"              (drones/cargo with quantity)
 *   "Item Name x5, Charge"      (rare but valid)
 */
function parseEFTLine(line: string): EFTLine | null {
  if (!line || line.startsWith("[Empty")) return null;

  // Check for quantity suffix: "Item x5"
  const quantityMatch = line.match(/^(.+?)\s+x(\d+)$/);
  if (quantityMatch) {
    const namePart = quantityMatch[1].trim();
    const quantity = parseInt(quantityMatch[2], 10);

    // Name part might still have a charge: "Drone x5" or "Module, Charge x5"
    const chargeIdx = namePart.indexOf(",");
    if (chargeIdx !== -1) {
      return {
        name: namePart.slice(0, chargeIdx).trim(),
        charge: namePart.slice(chargeIdx + 1).trim(),
        quantity,
      };
    }
    return { name: namePart, quantity };
  }

  // Check for charge: "Module, Charge"
  const chargeIdx = line.indexOf(",");
  if (chargeIdx !== -1) {
    return {
      name: line.slice(0, chargeIdx).trim(),
      charge: line.slice(chargeIdx + 1).trim(),
    };
  }

  return { name: line.trim() };
}

// ─── Serializer ──────────────────────────────────────────────────────────────

export interface EFTSerializeOptions {
  shipName: string;
  fitName: string;
  highSlots: EFTLine[];
  midSlots: EFTLine[];
  lowSlots: EFTLine[];
  rigSlots: EFTLine[];
  subsystems?: EFTLine[];
  drones?: EFTLine[];
  cargo?: EFTLine[];
  highSlotCount?: number;
  midSlotCount?: number;
  lowSlotCount?: number;
  rigSlotCount?: number;
}

/**
 * Serialize a fitting to EFT format text.
 */
export function serializeEFT(opts: EFTSerializeOptions): string {
  const lines: string[] = [];

  // Header
  lines.push(`[${opts.shipName}, ${opts.fitName}]`);

  // Low slots
  appendSlotSection(lines, opts.lowSlots, opts.lowSlotCount, "Low");
  lines.push("");

  // Mid slots
  appendSlotSection(lines, opts.midSlots, opts.midSlotCount, "Mid");
  lines.push("");

  // High slots
  appendSlotSection(lines, opts.highSlots, opts.highSlotCount, "High");
  lines.push("");

  // Rig slots
  appendSlotSection(lines, opts.rigSlots, opts.rigSlotCount, "Rig");

  // Subsystems
  if (opts.subsystems && opts.subsystems.length > 0) {
    lines.push("");
    for (const sub of opts.subsystems) {
      lines.push(formatEFTLine(sub));
    }
  }

  // Drones
  if (opts.drones && opts.drones.length > 0) {
    lines.push("");
    lines.push("");
    for (const drone of opts.drones) {
      lines.push(formatEFTLine(drone));
    }
  }

  // Cargo
  if (opts.cargo && opts.cargo.length > 0) {
    lines.push("");
    for (const item of opts.cargo) {
      lines.push(formatEFTLine(item));
    }
  }

  return lines.join("\n");
}

function appendSlotSection(
  lines: string[],
  slots: EFTLine[],
  slotCount: number | undefined,
  slotLabel: string
): void {
  const count = slotCount ?? slots.length;
  for (let i = 0; i < count; i++) {
    if (i < slots.length) {
      lines.push(formatEFTLine(slots[i]));
    } else {
      lines.push(`[Empty ${slotLabel} slot]`);
    }
  }
}

function formatEFTLine(item: EFTLine): string {
  let line = item.name;
  if (item.charge) {
    line += `, ${item.charge}`;
  }
  if (item.quantity && item.quantity > 1) {
    line += ` x${item.quantity}`;
  }
  return line;
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Quick check if a string looks like EFT format.
 */
export function isEFTFormat(text: string): boolean {
  const trimmed = text.trim();
  return /^\[.+,\s*.+\]/.test(trimmed);
}

/**
 * Extract all unique item names from a parsed EFT (for bulk resolution).
 */
export function getUniqueItemNames(parsed: ParsedEFT): string[] {
  const names = new Set<string>();
  names.add(parsed.shipName);

  const allSlots = [
    ...parsed.lowSlots,
    ...parsed.midSlots,
    ...parsed.highSlots,
    ...parsed.rigSlots,
    ...parsed.subsystems,
    ...parsed.drones,
    ...parsed.cargo,
  ];

  for (const item of allSlots) {
    names.add(item.name);
    if (item.charge) {
      names.add(item.charge);
    }
  }

  return Array.from(names);
}
