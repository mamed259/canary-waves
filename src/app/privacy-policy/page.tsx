import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SectionRenderer from "@/components/SectionRenderer";
import { getPageBySlug } from "@/lib/strapi";
import { FALLBACK_PRIVACY_POLICY } from "@/content/legal-fallback";
import type { PageSection } from "@/lib/page-content";

export const revalidate = 60;

const FALLBACK_SECTIONS: PageSection[] = [
  {
    type: "legal-documents",
    privacyPolicy: FALLBACK_PRIVACY_POLICY,
    termsOfUse: "",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("privacy-policy");
  const title = page.seo?.metaTitle || page.title || "Privacy Policy | Canary Waves";
  const description =
    page.seo?.metaDescription ||
    "Learn how Canary Waves collects, uses, stores, and protects personal information across our website and services.";
  return {
    title,
    description,
    alternates: {
      canonical: page.seo?.canonicalUrl || "https://canary-waves.com/privacy-policy",
    },
  };
}

export default async function PrivacyPolicyPage() {
  const page = await getPageBySlug("privacy-policy");
  const sections =
    page.slug === "privacy-policy" && page.sections.length ? page.sections : FALLBACK_SECTIONS;

  return (
    <>
      <Navbar />
      <main className="site-main">
        <SectionRenderer sections={sections} />
      </main>
      <Footer />
    </>
  );
}
