import type { Core } from "@strapi/strapi";

const PAGE_UID = "api::page.page";
const SITE_ORIGIN = (process.env.FRONTEND_URL || "https://canary-waves.com").replace(/\/+$/, "");
const BRAND = "Canary Waves";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function applyPageDefaults(data: Record<string, unknown>) {
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const currentSlug = typeof data.slug === "string" ? data.slug.trim() : "";
  const slug = currentSlug || (title ? slugify(title) : "");
  if (slug && !currentSlug) {
    data.slug = slug;
  }

  const seo = asRecord(data.seo) ?? {};
  const { id: _id, documentId: _documentId, ...seoRest } = seo;
  const metaTitle =
    (typeof data.metaTitle === "string" && data.metaTitle.trim()) ||
    (typeof seoRest.metaTitle === "string" && seoRest.metaTitle.trim()) ||
    (title ? `${title} | ${BRAND}` : BRAND);
  const metaDescription =
    (typeof data.metaDescription === "string" && data.metaDescription.trim()) ||
    (typeof seoRest.metaDescription === "string" && seoRest.metaDescription.trim()) ||
    (title
      ? `${title} from ${BRAND}. Read the full page for details and related policies.`
      : `${BRAND} website page.`);
  const canonicalUrl =
    (typeof seoRest.canonicalUrl === "string" && seoRest.canonicalUrl.trim()) ||
    (slug ? `${SITE_ORIGIN}/${slug}` : SITE_ORIGIN);

  data.metaTitle = String(metaTitle).slice(0, 120);
  data.metaDescription = String(metaDescription).slice(0, 320);
  data.seo = {
    ...seoRest,
    metaTitle: data.metaTitle,
    metaDescription: data.metaDescription,
    canonicalUrl,
  };
}

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.documents.use(async (ctx, next) => {
      const request = ctx as { uid?: string; params?: { data?: unknown } };
      if (request.uid !== PAGE_UID) {
        return next();
      }
      const data = asRecord(request.params?.data);
      if (data) applyPageDefaults(data);
      return next();
    });
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const { seedHomePageIfMissing } = await import("./bootstrap/seed-home-page");
    const { ensureFormSubmissionPermissions } = await import(
      "./bootstrap/ensure-form-submission-permissions"
    );
    const { ensurePagePermissions } = await import("./bootstrap/ensure-page-permissions");
    const { seedLegalPagesIfMissing } = await import("./bootstrap/seed-legal-pages");

    try {
      await seedHomePageIfMissing(strapi as Parameters<typeof seedHomePageIfMissing>[0]);
    } catch (error) {
      strapi.log.warn(`[seed] Home page seed skipped: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await ensurePagePermissions(strapi as Parameters<typeof ensurePagePermissions>[0]);
    } catch (error) {
      strapi.log.warn(
        `[permissions] Page public find skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      await seedLegalPagesIfMissing(strapi as Parameters<typeof seedLegalPagesIfMissing>[0]);
    } catch (error) {
      strapi.log.warn(`[seed] Legal pages skipped: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await ensureFormSubmissionPermissions(strapi as Parameters<typeof ensureFormSubmissionPermissions>[0]);
    } catch (error) {
      strapi.log.warn(
        `[permissions] Form submission public create skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
};
