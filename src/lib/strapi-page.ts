import {
  type CmsText,
  type ContactSectionContent,
  type FAQItemContent,
  type FAQSectionContent,
  type HeroSectionContent,
  type ImpactSectionContent,
  type LegalDocumentsSectionContent,
  type PageContent,
  type PageSection,
  type PlatformSectionContent,
  type SignalItemContent,
  type SignalTag,
  type SignalsSectionContent,
  type StatItemContent,
  type StrapiRichTextNode,
  type TeamMemberContent,
  type TeamSectionContent,
  type WhyCardContent,
  type WhyUsSectionContent,
  type WorkflowSectionContent,
  type WorkflowStepContent,
  defaultHomePage,
} from '@/lib/page-content';

type JsonRecord = Record<string, unknown>;

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL?.replace(/\/$/, '') ?? '';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;
const isProduction = process.env.NODE_ENV === 'production';
const rawFailOnError = (process.env.STRAPI_FAIL_ON_ERROR ?? '').toLowerCase();
const STRAPI_FAIL_ON_ERROR = ['1', 'true', 'yes', 'on'].includes(rawFailOnError);
const defaultStatus = isProduction ? 'published' : 'draft';
const rawStatus = (process.env.STRAPI_CONTENT_STATUS ?? defaultStatus).toLowerCase();
const STRAPI_CONTENT_STATUS = rawStatus === 'draft' || rawStatus === 'published' ? rawStatus : defaultStatus;
const defaultRevalidate = isProduction ? 300 : 0;
const rawRevalidate = process.env.STRAPI_REVALIDATE ?? String(defaultRevalidate);
const normalizedRevalidate = rawRevalidate.trim().match(/^(\d+)\s*s?$/i)?.[1] ?? rawRevalidate;
const parsedRevalidate = Number(normalizedRevalidate);
const STRAPI_REVALIDATE_SECONDS = Number.isFinite(parsedRevalidate) ? parsedRevalidate : defaultRevalidate;
const defaultFetchTimeoutMs = isProduction ? 4000 : 2500;
const rawFetchTimeoutMs = process.env.STRAPI_FETCH_TIMEOUT_MS ?? String(defaultFetchTimeoutMs);
const parsedFetchTimeoutMs = Number(rawFetchTimeoutMs);
const STRAPI_FETCH_TIMEOUT_MS =
  Number.isFinite(parsedFetchTimeoutMs) && parsedFetchTimeoutMs >= 0
    ? parsedFetchTimeoutMs
    : defaultFetchTimeoutMs;

const COMPONENT_TYPE_MAP: Record<string, PageSection['type']> = {
  'sections.hero': 'hero',
  'sections.platform': 'platform',
  'sections.signals': 'signals',
  'sections.workflow': 'workflow',
  'sections.why-us': 'why-us',
  'sections.impact': 'impact',
  'sections.team': 'team',
  'sections.contact': 'contact',
  'sections.faq': 'faq',
  'sections.legal-documents': 'legal-documents',
};

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function getString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/%$/, '');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isRichTextNode(value: unknown): value is StrapiRichTextNode {
  const row = asRecord(value);
  if (!row) return false;
  return typeof row.type === 'string' || typeof row.text === 'string' || Array.isArray(row.children);
}

function isRichTextArray(value: unknown): value is StrapiRichTextNode[] {
  return Array.isArray(value) && value.some((item) => isRichTextNode(item));
}

function extractRichText(value: unknown): string | null {
  if (!value) return null;
  const direct = getString(value);
  if (direct) return direct;

  if (Array.isArray(value)) {
    const lines = value
      .map((item) => extractRichText(item))
      .filter((item): item is string => Boolean(item));
    if (!lines.length) return null;
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() || null;
  }

  const record = asRecord(value);
  if (!record) return null;

  const nodeText = getString(record.text) ?? getString(record.value);
  if (nodeText) return nodeText;

  if (Array.isArray(record.children)) {
    const childrenText = record.children
      .map((child) => extractRichText(child))
      .filter((item): item is string => Boolean(item))
      .join('');
    if (childrenText.trim()) return childrenText.trim();
  }

  return extractRichText(record.content) ?? extractRichText(record.blocks) ?? extractRichText(record.body) ?? null;
}

function getCmsText(value: unknown): CmsText | null {
  const plain = getString(value);
  if (plain) return plain;
  if (isRichTextArray(value)) return value;
  const row = asRecord(value);
  if (!row) return null;
  return getCmsText(row.content) ?? getCmsText(row.blocks) ?? getCmsText(row.body) ?? null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      const row = asRecord(item);
      if (!row) return '';
      return getString(row.text) ?? extractRichText(row) ?? '';
    })
    .filter(Boolean);
}

function normalizeEntry(data: unknown): JsonRecord | null {
  const record = asRecord(data);
  if (!record) return null;
  const attrs = asRecord(record.attributes);
  if (attrs) return { ...attrs, id: record.id };
  return record;
}

function toRecordArray(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeEntry(item)).filter((item): item is JsonRecord => Boolean(item));
}

function toAbsoluteMediaUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (!STRAPI_URL) return url;
  return `${STRAPI_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function parseMedia(value: unknown): { url: string; alt: string } | null {
  if (!value) return null;
  const direct = getString(value);
  if (direct) return { url: toAbsoluteMediaUrl(direct), alt: 'Section image' };
  if (Array.isArray(value)) return parseMedia(value[0]);
  const record = asRecord(value);
  if (!record) return null;
  if ('data' in record) return parseMedia(record.data);
  if ('attributes' in record) return parseMedia(record.attributes);
  const url = getString(record.url);
  if (!url) return null;
  return {
    url: toAbsoluteMediaUrl(url),
    alt: getString(record.alternativeText) ?? getString(record.alt) ?? getString(record.name) ?? 'Section image',
  };
}

function parseSignalTag(value: unknown): SignalTag {
  const tag = getString(value);
  if (tag === 'amber' || tag === 'teal') return tag;
  return 'red';
}

function createStrapiFetchOptions() {
  const options: RequestInit & { next?: { revalidate: number } } = {
    headers: STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : undefined,
  };

  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' && STRAPI_FETCH_TIMEOUT_MS > 0) {
    options.signal = AbortSignal.timeout(STRAPI_FETCH_TIMEOUT_MS);
  }

  if (STRAPI_REVALIDATE_SECONDS > 0) {
    options.next = { revalidate: STRAPI_REVALIDATE_SECONDS };
  } else {
    options.cache = 'no-store';
  }

  return options;
}

function getPageQueryParams(slug: string): URLSearchParams {
  const params = new URLSearchParams();
  params.append('filters[slug][$eq]', slug);
  params.append('status', STRAPI_CONTENT_STATUS);
  params.append('populate[seo][populate]', 'ogImage');
  params.append('populate[sections][populate]', '*');
  return params;
}

function parseHero(raw: JsonRecord, fallback: HeroSectionContent): HeroSectionContent {
  const media = parseMedia(raw.image);
  const proofItems = toStringArray(raw.proofItems ?? raw.notes);
  return {
    type: 'hero',
    label: getString(raw.label) ?? getString(raw.brand) ?? fallback.label,
    heading: getString(raw.heading) ?? fallback.heading,
    subheading: getString(raw.subheading) ?? fallback.subheading,
    primaryCtaLabel: getString(raw.primaryCtaLabel) ?? fallback.primaryCtaLabel,
    secondaryCtaLabel: getString(raw.secondaryCtaLabel) ?? fallback.secondaryCtaLabel,
    proofItems: proofItems.length ? proofItems : fallback.proofItems,
    imageUrl: media?.url ?? fallback.imageUrl,
    imageAlt: media?.alt ?? fallback.imageAlt,
  };
}

function parsePlatform(raw: JsonRecord, fallback: PlatformSectionContent): PlatformSectionContent {
  const pillars = toStringArray(raw.pillars);
  return {
    type: 'platform',
    eyebrow: getString(raw.eyebrow) ?? fallback.eyebrow,
    title: getString(raw.title) ?? fallback.title,
    body: getCmsText(raw.body) ?? getCmsText(raw.description) ?? fallback.body,
    pillars: pillars.length ? pillars : fallback.pillars,
    calloutQuote: getString(raw.calloutQuote) ?? fallback.calloutQuote,
    calloutAttribution: getString(raw.calloutAttribution) ?? fallback.calloutAttribution,
  };
}

function parseSignalItems(rawItems: unknown, fallback: SignalItemContent[]): SignalItemContent[] {
  const parsed = toRecordArray(rawItems)
    .map((row, index) => {
      const media = parseMedia(row.image);
      const title = getString(row.title);
      const summary = getCmsText(row.summary);
      if (!title || !summary) return null;
      const fb = fallback[index] ?? fallback[0];
      return {
        tag: parseSignalTag(row.tag),
        title,
        kicker: getString(row.kicker) ?? getString(row.subtitle) ?? fb?.kicker ?? '',
        summary,
        imageUrl: media?.url ?? fb?.imageUrl ?? '/images/feature-1.avif',
        imageAlt: media?.alt ?? getString(row.imageAlt) ?? title,
        reverseLayout: row.reverseLayout === true,
      } satisfies SignalItemContent;
    })
    .filter((item): item is SignalItemContent => Boolean(item));
  return parsed.length ? parsed : fallback;
}

function parseSignals(raw: JsonRecord, fallback: SignalsSectionContent): SignalsSectionContent {
  return {
    type: 'signals',
    eyebrow: getString(raw.eyebrow) ?? fallback.eyebrow,
    title: getString(raw.title) ?? fallback.title,
    items: parseSignalItems(raw.items, fallback.items),
  };
}

function parseWorkflowSteps(rawItems: unknown, fallback: WorkflowStepContent[]): WorkflowStepContent[] {
  const parsed = toRecordArray(rawItems)
    .map((row, index) => {
      const title = getString(row.title);
      const description = getCmsText(row.description);
      if (!title || !description) return null;
      return {
        step: getString(row.step) ?? String(index + 1).padStart(2, '0'),
        title,
        description,
      };
    })
    .filter((item): item is WorkflowStepContent => Boolean(item));
  return parsed.length ? parsed : fallback;
}

function parseWorkflow(raw: JsonRecord, fallback: WorkflowSectionContent): WorkflowSectionContent {
  return {
    type: 'workflow',
    eyebrow: getString(raw.eyebrow) ?? fallback.eyebrow,
    title: getString(raw.title) ?? fallback.title,
    ctaLabel: getString(raw.ctaLabel) ?? fallback.ctaLabel,
    steps: parseWorkflowSteps(raw.steps, fallback.steps),
  };
}

function parseWhyCards(rawItems: unknown, fallback: WhyCardContent[]): WhyCardContent[] {
  const parsed = toRecordArray(rawItems)
    .map((row, index) => {
      const media = parseMedia(row.image);
      const title = getString(row.title);
      const description = getCmsText(row.description);
      if (!title || !description) return null;
      const fb = fallback[index] ?? fallback[0];
      return {
        title,
        description,
        imageUrl: media?.url ?? fb?.imageUrl ?? '/images/whyus-1.avif',
        imageAlt: media?.alt ?? getString(row.imageAlt) ?? title,
      };
    })
    .filter((item): item is WhyCardContent => Boolean(item));
  return parsed.length ? parsed : fallback;
}

function parseStats(rawItems: unknown, fallback: StatItemContent[]): StatItemContent[] {
  const parsed = toRecordArray(rawItems)
    .map((row, index) => {
      const label = getString(row.label);
      if (!label) return null;
      return {
        value: getNumber(row.value) ?? fallback[index]?.value ?? 0,
        suffix: getString(row.suffix) ?? fallback[index]?.suffix ?? '%',
        label,
      };
    })
    .filter((item): item is StatItemContent => Boolean(item));
  return parsed.length ? parsed : fallback;
}

function parseWhyUs(raw: JsonRecord, fallback: WhyUsSectionContent): WhyUsSectionContent {
  return {
    type: 'why-us',
    eyebrow: getString(raw.eyebrow) ?? fallback.eyebrow,
    title: getString(raw.title) ?? fallback.title,
    cards: parseWhyCards(raw.cards ?? raw.items, fallback.cards),
  };
}

function parseImpact(raw: JsonRecord, fallback: ImpactSectionContent): ImpactSectionContent {
  return {
    type: 'impact',
    title: getString(raw.title) ?? fallback.title,
    description: getCmsText(raw.description) ?? getCmsText(raw.copy) ?? fallback.description,
    caption: getCmsText(raw.caption) ?? getCmsText(raw.statsNote) ?? fallback.caption,
    stats: parseStats(raw.stats ?? raw.items ?? raw.metrics, fallback.stats),
  };
}

function parseTeamMembers(rawItems: unknown, fallback: TeamMemberContent[]): TeamMemberContent[] {
  const parsed = toRecordArray(rawItems)
    .map((row, index) => {
      const media = parseMedia(row.image);
      const name = getString(row.name);
      const role = getString(row.role);
      if (!name || !role) return null;
      const fb = fallback[index] ?? fallback[0];
      return {
        name,
        role,
        bio: getCmsText(row.bio) ?? fb?.bio ?? '',
        imageUrl: media?.url ?? fb?.imageUrl ?? '/images/jack-kellner.avif',
        imageAlt: media?.alt ?? getString(row.imageAlt) ?? name,
      };
    })
    .filter((item): item is TeamMemberContent => Boolean(item));
  return parsed.length ? parsed : fallback;
}

function parseTeam(raw: JsonRecord, fallback: TeamSectionContent): TeamSectionContent {
  return {
    type: 'team',
    eyebrow: getString(raw.eyebrow) ?? fallback.eyebrow,
    title: getString(raw.title) ?? fallback.title,
    description: getCmsText(raw.description) ?? fallback.description,
    members: parseTeamMembers(raw.members, fallback.members),
  };
}

function parseContact(raw: JsonRecord, fallback: ContactSectionContent): ContactSectionContent {
  const bullets = toStringArray(raw.bullets);
  return {
    type: 'contact',
    eyebrow: getString(raw.eyebrow) ?? fallback.eyebrow,
    title: getString(raw.title) ?? fallback.title,
    description: getCmsText(raw.description) ?? fallback.description,
    bullets: bullets.length ? bullets : fallback.bullets,
  };
}

function parseFaqItems(rawItems: unknown, fallback: FAQItemContent[]): FAQItemContent[] {
  const parsed = toRecordArray(rawItems)
    .map((row) => {
      const question = getString(row.question);
      const answer = getCmsText(row.answer);
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((item): item is FAQItemContent => Boolean(item));
  return parsed.length ? parsed : fallback;
}

function parseFaq(raw: JsonRecord, fallback: FAQSectionContent): FAQSectionContent {
  return {
    type: 'faq',
    eyebrow: getString(raw.eyebrow) ?? fallback.eyebrow,
    title: getString(raw.title) ?? fallback.title,
    items: parseFaqItems(raw.items, fallback.items),
  };
}

function parseLegalDocuments(raw: JsonRecord): LegalDocumentsSectionContent {
  return {
    type: 'legal-documents',
    privacyPolicy: extractRichText(raw.privacyPolicy) ?? '',
    termsOfUse: extractRichText(raw.termsOfUse) ?? '',
  };
}

function parseSection(raw: JsonRecord, fallbacks: PageSection[]): PageSection | null {
  const component = getString(raw.__component);
  const type = component ? COMPONENT_TYPE_MAP[component] : null;
  if (!type) return null;

  if (type === 'legal-documents') {
    return parseLegalDocuments(raw);
  }

  const fallback = fallbacks.find((section) => section.type === type);
  if (!fallback) return null;

  switch (type) {
    case 'hero':
      return parseHero(raw, fallback as HeroSectionContent);
    case 'platform':
      return parsePlatform(raw, fallback as PlatformSectionContent);
    case 'signals':
      return parseSignals(raw, fallback as SignalsSectionContent);
    case 'workflow':
      return parseWorkflow(raw, fallback as WorkflowSectionContent);
    case 'why-us':
      return parseWhyUs(raw, fallback as WhyUsSectionContent);
    case 'impact':
      return parseImpact(raw, fallback as ImpactSectionContent);
    case 'team':
      return parseTeam(raw, fallback as TeamSectionContent);
    case 'contact':
      return parseContact(raw, fallback as ContactSectionContent);
    case 'faq':
      return parseFaq(raw, fallback as FAQSectionContent);
    case 'legal-documents':
      return parseLegalDocuments(raw);
    default:
      return null;
  }
}

function parsePage(raw: JsonRecord | null, requestedSlug = 'home'): PageContent {
  if (!raw) return defaultHomePage;

  const sectionsRaw = raw.sections;
  const sectionRows = Array.isArray(sectionsRaw) ? sectionsRaw : [];
  const fallbacks = defaultHomePage.sections;

  const sections = sectionRows
    .map((row) => parseSection(normalizeEntry(row) ?? {}, fallbacks))
    .filter((section): section is PageSection => Boolean(section));

  const seo = asRecord(raw.seo);
  return {
    title: getString(raw.title) ?? defaultHomePage.title,
    slug: getString(raw.slug) ?? requestedSlug,
    seo: {
      metaTitle: getString(seo?.metaTitle) ?? undefined,
      metaDescription: getString(seo?.metaDescription) ?? undefined,
      canonicalUrl: getString(seo?.canonicalUrl) ?? undefined,
    },
    sections:
      sections.length
        ? sections
        : requestedSlug === 'home'
          ? defaultHomePage.sections
          : [],
  };
}

function emptyPage(slug: string): PageContent {
  return {
    title: slug,
    slug,
    sections: [],
  };
}

export async function getPageBySlug(slug: string): Promise<PageContent> {
  if (!STRAPI_URL) {
    return slug === 'home' ? defaultHomePage : emptyPage(slug);
  }

  try {
    const params = getPageQueryParams(slug);
    const response = await fetch(`${STRAPI_URL}/api/pages?${params.toString()}`, createStrapiFetchOptions());

    if (!response.ok) {
      const body = await response.text();
      const message = `HTTP ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 220)}` : ''}`;
      if (STRAPI_FAIL_ON_ERROR) throw new Error(`Strapi page fetch failed: ${message}`);
      console.warn(`Strapi page fetch warning: ${message}`);
      return slug === 'home' ? defaultHomePage : emptyPage(slug);
    }

    const payload = (await response.json()) as JsonRecord;
    const dataArray = Array.isArray(payload.data) ? payload.data : [];
    const pageData = normalizeEntry(dataArray[0]);

    if (!pageData) {
      console.warn(`Strapi page "${slug}" not found.`);
      return slug === 'home' ? defaultHomePage : emptyPage(slug);
    }

    return parsePage(pageData, slug);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (STRAPI_FAIL_ON_ERROR) throw new Error(`Strapi page fetch failed: ${message}`);
    console.warn(`Strapi page fetch warning: ${message}`);
    return slug === 'home' ? defaultHomePage : emptyPage(slug);
  }
}
