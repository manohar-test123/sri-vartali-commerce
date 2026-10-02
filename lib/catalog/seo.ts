/**
 * SEO auto-defaults (spec §15G): generate sensible metadata from the
 * product itself; explicit overrides win when the owner fills them in.
 *
 * Pure functions — shared by the CMS preview today and the public
 * product page's generateMetadata in Phase 4 so both agree byte-for-byte.
 */

const SITE_SUFFIX = " · Sri Vartali";
const MAX_TITLE = 60;
const MAX_DESCRIPTION = 160;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  // Trim to the limit minus the ellipsis, then cut on a word boundary so
  // the snippet never ends mid-word.
  const room = max - 1;
  const cut = text.slice(0, room);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > room * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function seoTitleDefault(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") return `Product${SITE_SUFFIX}`;
  const budget = MAX_TITLE - SITE_SUFFIX.length;
  return `${truncate(trimmed, budget)}${SITE_SUFFIX}`;
}

export function seoDescriptionDefault(
  name: string,
  shortDescription?: string | null,
): string {
  const fromShort = (shortDescription ?? "").trim();
  const source = fromShort !== "" ? fromShort : name.trim();
  if (source === "") return "Handpicked Indian ethnic wear from Sri Vartali.";
  return truncate(source, MAX_DESCRIPTION);
}

/** The values actually in effect: owner override when present, else default. */
export function effectiveSeo(input: {
  name: string;
  shortDescription?: string | null;
  seoTitleOverride?: string | null;
  seoDescriptionOverride?: string | null;
}): { title: string; description: string } {
  return {
    title: input.seoTitleOverride?.trim() || seoTitleDefault(input.name),
    description:
      input.seoDescriptionOverride?.trim() ||
      seoDescriptionDefault(input.name, input.shortDescription),
  };
}
