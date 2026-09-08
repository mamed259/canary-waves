import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SectionRenderer from "@/components/SectionRenderer";
import { getPageBySlug } from "@/lib/strapi";

export const revalidate = 300;

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
  if (page.slug !== "privacy-policy" || !page.sections.length) notFound();

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
