/**
 * Proactive Guide — smart follow-up chips derived from streamed AI summary (summary_delta aggregate).
 */
export type TradeBoost = {
  electrician?: boolean;
  plumber?: boolean;
  hvac?: boolean;
};

export type FollowUpCategory = "technical_compliance" | "administrative_paperwork";

export type FollowUpChip = {
  id: string;
  label: string;
  scoutPrompt: string;
  minutesSaved: number;
  tradeBoost?: TradeBoost;
  vertical?: "building" | "infrastructure" | "data_center";
  missionCritical?: boolean;
  /** Building codes / inspections vs HOA & clerk forms */
  category?: FollowUpCategory;
};

function norm(s: string): string {
  return s.toLowerCase();
}

function isAdminChip(c: FollowUpChip): boolean {
  return c.category === "administrative_paperwork";
}

/**
 * Heuristic chips from Contractor Action Plan / summary stream text plus original job description.
 * Returns 2–3 items, deduped by id.
 */
export function deriveProactiveFollowUps(aiText: string, jobDescription: string): FollowUpChip[] {
  const t = norm(`${aiText}\n${jobDescription}`);
  const out: FollowUpChip[] = [];
  const seen = new Set<string>();

  const push = (c: FollowUpChip) => {
    if (seen.has(c.id)) {
      return;
    }
    seen.add(c.id);
    const withCat: FollowUpChip = {
      ...c,
      category: c.category ?? "technical_compliance",
    };
    out.push(withCat);
  };

  if (/(nec|electrical|service\s+upgrade|panel|breaker|grounding|meter|disconnect|evse|\b200a\b)/.test(t)) {
    push({
      id: "permit-electrical",
      label: "Draft permit application",
      scoutPrompt:
        "Deep scout: electrical permit types, online portal, plan-check requirements, NEC edition on the street, " +
        "and explicit fee line items for this AHJ. Produce a clerk-ready submittal checklist.",
      minutesSaved: 45,
      tradeBoost: { electrician: true },
      category: "administrative_paperwork",
    });
  }

  if (/(hvac|heating|cooling|manual\s*j|load\s*calc|imc|mechanical\s+permit|refrigerant)/.test(t)) {
    push({
      id: "hvac-load",
      label: "Generate HVAC load calc",
      scoutPrompt:
        "Deep scout: adopted mechanical / energy code, Manual J class compliance expectations, mechanical permits, " +
        "and any local forms for residential or light commercial HVAC at this address.",
      minutesSaved: 50,
      tradeBoost: { hvac: true },
      category: "technical_compliance",
    });
  }

  if (/(thermal|infrared|heat\s*loss|envelope|insulation|blower\s*door|energy\s*audit)/.test(t)) {
    push({
      id: "thermal-audit",
      label: "Run thermal audit",
      scoutPrompt:
        "Deep scout: inspection priorities for thermal/envelope compliance, infrared audit norms this AHJ references, " +
        "and tie-ins to adopted energy code for this scope.",
      minutesSaved: 40,
      tradeBoost: { hvac: true },
      category: "technical_compliance",
    });
  }

  if (/(plumb|ipc|upc|drainage|water\s*line|sewer|backflow|grease)/.test(t)) {
    push({
      id: "plumbing-scout",
      label: "Plumbing code deep scout",
      scoutPrompt:
        "Deep scout: IPC/UPC adoption, plumbing permit fees, submittal exhibits, and inspector hot spots for drains, " +
        "venting, and domestic water at this site.",
      minutesSaved: 42,
      tradeBoost: { plumber: true },
      category: "technical_compliance",
    });
  }

  if (/(fast-41|title\s*41|permitting\s+council|federal\s+permit|infrastructure|data\s*center|tier\s*(iii|iv)|mission\s*critical)/.test(t)) {
    push({
      id: "critical-infra",
      label: "FAST-41 & critical facility scout",
      scoutPrompt:
        "Deep scout: federal FAST-41 or Permitting Council milestones that apply, redundancy / Tier-style expectations, " +
        "and liquid-cooling or mission-critical mechanical-electrical interfaces cited by trusted sources.",
      minutesSaved: 55,
      vertical: /data\s*center|colocation|tier/.test(t) ? "data_center" : "infrastructure",
      missionCritical: /tier|mission\s*critical|liquid|containment/.test(t),
      category: "technical_compliance",
    });
  }

  if (/(hoa|homeowner|covenant|architectural\s+review|\barc\b|design\s+review|association)/.test(t)) {
    push({
      id: "hoa-arc-pack",
      label: "HOA / ARC paperwork pack",
      scoutPrompt:
        "Deep scout: HOA or design-review submission requirements for this parcel — paint, fence, EVSE, generator, " +
        "or equipment pads; notarization, neighbor notices, and parallel timelines vs city permit.",
      minutesSaved: 40,
      category: "administrative_paperwork",
    });
  }

  if (out.length < 2) {
    push({
      id: "pad-checklist",
      label: "AHJ inspection checklist",
      scoutPrompt:
        "Contractor-focused inspection checklist grounded in this digest: common fail items, required labels/tests, " +
        "and final inspection call-outs for this jurisdiction.",
      minutesSaved: 35,
      category: "technical_compliance",
    });
  }
  if (out.length < 2) {
    push({
      id: "pad-fees",
      label: "Fee & turnaround scout",
      scoutPrompt:
        "Deep scout: current permit fee schedule links, expeditor norms, turnaround times, and weekend inspection rules for this jurisdiction.",
      minutesSaved: 38,
      category: "administrative_paperwork",
    });
  }

  return out.slice(0, 3);
}

type FollowUpActionsProps = {
  suggestions: FollowUpChip[];
  disabled: boolean;
  onSelect: (chip: FollowUpChip) => void;
};

export function FollowUpActions({ suggestions, disabled, onSelect }: FollowUpActionsProps) {
  if (!suggestions.length) {
    return null;
  }

  const technical = suggestions.filter((c) => !isAdminChip(c));
  const admin = suggestions.filter(isAdminChip);

  return (
    <div className="rg-proactive-guide" aria-label="Proactive guide follow-ups">
      <div className="rg-proactive-guide__head">
        <strong className="rg-proactive-guide__title">Proactive Guide</strong>
        <span className="rg-proactive-guide__sub">Smart suggestions from your action plan — tap to run a focused scout</span>
      </div>

      {technical.length > 0 ? (
        <div className="rg-followup-section" role="group" aria-label="Technical compliance">
          <div className="rg-followup-section__label">Technical compliance</div>
          <div className="rg-action-chips">
            {technical.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="rg-action-chip rg-action-chip--technical"
                disabled={disabled}
                onClick={() => onSelect(chip)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {admin.length > 0 ? (
        <div className="rg-followup-section rg-followup-section--admin" role="group" aria-label="Administrative paperwork">
          <div className="rg-followup-section__label">Administrative paperwork</div>
          <div className="rg-action-chips">
            {admin.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="rg-action-chip rg-action-chip--admin"
                disabled={disabled}
                onClick={() => onSelect(chip)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
