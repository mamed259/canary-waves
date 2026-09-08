type StrapiInstance = {
  log: {
    info: (message: string) => void;
  };
  documents: (uid: string) => {
    findMany: (params?: Record<string, unknown>) => Promise<unknown[]>;
    create: (params: { data: Record<string, unknown>; status?: string }) => Promise<unknown>;
  };
};

const PRIVACY_POLICY_BODY = `Privacy Policy

Effective Date: June the 1st 2025

At Canary Waves (“we,” “our,” or “us”), we are committed to protecting the privacy and security of your personal information.

## 1. Information We Collect
We collect limited personal and business-related information to operate effectively and provide you with high-quality services.

## 2. How We Use Your Information
We use the information we collect to respond to inquiries, provide and improve our services, and analyze usage trends.

## 3. Contact Us
If you have any questions about this Privacy Policy, please contact jack@canary-waves.com.`;

const TERMS_OF_USE_BODY = `Terms of Use

Effective Date: June the 1st 2025

Welcome to www.canary-waves.com. By accessing or using this Site, you agree to be bound by these Terms of Use.

## 1. Permitted Use
You agree to use the Site only for lawful purposes.

## 2. Contact Us
For questions about these Terms, please contact jack@canary-waves.com.`;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function createPageIfMissing(
  strapi: StrapiInstance,
  data: Record<string, unknown> & { slug: string },
) {
  const pages = await strapi.documents("api::page.page").findMany({
    filters: { slug: { $eq: data.slug } },
    status: "draft",
  });
  const existing = Array.isArray(pages) ? asRecord(pages[0]) : null;
  if (existing?.documentId) {
    strapi.log.info(`[seed] Skipped existing page: ${data.slug}`);
    return;
  }
  await strapi.documents("api::page.page").create({
    data,
    status: "published",
  });
  strapi.log.info(`[seed] Created page: ${data.slug}`);
}

export async function seedLegalPagesIfMissing(strapi: StrapiInstance) {
  await createPageIfMissing(strapi, {
    title: "Privacy Policy",
    slug: "privacy-policy",
    metaTitle: "Privacy Policy | Canary Waves",
    metaDescription:
      "Learn how Canary Waves collects, uses, stores, and protects personal information across our website and services.",
    seo: {
      metaTitle: "Privacy Policy | Canary Waves",
      metaDescription:
        "Learn how Canary Waves collects, uses, stores, and protects personal information across our website and services.",
      canonicalUrl: "https://canary-waves.com/privacy-policy",
    },
    sections: [
      {
        __component: "sections.legal-documents",
        privacyPolicy: PRIVACY_POLICY_BODY,
        termsOfUse: "",
      },
    ],
  });
  await createPageIfMissing(strapi, {
    title: "Terms of Use",
    slug: "terms-of-use",
    metaTitle: "Terms of Use | Canary Waves",
    metaDescription:
      "Read the Terms of Use for Canary Waves, including permitted use, liability limits, intellectual property, and governing law.",
    seo: {
      metaTitle: "Terms of Use | Canary Waves",
      metaDescription:
        "Read the Terms of Use for Canary Waves, including permitted use, liability limits, intellectual property, and governing law.",
      canonicalUrl: "https://canary-waves.com/terms-of-use",
    },
    sections: [
      {
        __component: "sections.legal-documents",
        privacyPolicy: "",
        termsOfUse: TERMS_OF_USE_BODY,
      },
    ],
  });
}
