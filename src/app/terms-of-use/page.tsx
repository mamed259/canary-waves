import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SectionRenderer from "@/components/SectionRenderer";
import { getPageBySlug } from "@/lib/strapi";

export const revalidate = 300;

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
  if (page.slug !== "terms-of-use" || !page.sections.length) notFound();

  return (
    <>
      <Navbar />
      <main className="site-main">
        <SectionRenderer sections={page.sections} />
      </main>
      <Footer />
    </>
  );
}
