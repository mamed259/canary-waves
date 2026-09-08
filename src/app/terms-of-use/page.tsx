import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SectionRenderer from "@/components/SectionRenderer";
import { getPageBySlug } from "@/lib/strapi";
import { FALLBACK_TERMS_OF_USE } from "@/content/legal-fallback";
import type { PageSection } from "@/lib/page-content";

export const revalidate = 60;

const FALLBACK_SECTIONS: PageSection[] = [
  {
    type: "legal-documents",
    privacyPolicy: "",
    termsOfUse: FALLBACK_TERMS_OF_USE,
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("terms-of-use");
  const title = page.seo?.metaTitle || page.title || "Terms of Use | Canary Waves";
  const description =
    page.seo?.metaDescription ||
    "Read the Terms of Use for Canary Waves, including permitted use, liability limits, intellectual property, and governing law.";
  return {
    title,
    description,
    alternates: {
      canonical: page.seo?.canonicalUrl || "https://canary-waves.com/terms-of-use",
    },
  };
}

export default async function TermsOfUsePage() {
  const page = await getPageBySlug("terms-of-use");
  const sections =
    page.slug === "terms-of-use" && page.sections.length ? page.sections : FALLBACK_SECTIONS;

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
