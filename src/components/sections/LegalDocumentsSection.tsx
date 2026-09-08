"use client";

import { usePathname } from "next/navigation";
import type { LegalDocumentsSectionContent } from "@/lib/page-content";

interface LegalDocumentsSectionProps {
  content: LegalDocumentsSectionContent;
}

function renderMarkdown(text: string) {
  const blocks = text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return blocks.map((block, index) => {
    if (block.startsWith("### ")) {
      return <h3 key={index} style={{ marginTop: "1.5rem" }}>{block.slice(4)}</h3>;
    }
    if (block.startsWith("## ")) {
      return <h2 key={index} style={{ marginTop: "2rem" }}>{block.slice(3)}</h2>;
    }
    if (block.startsWith("# ")) {
      return <h2 key={index} style={{ marginTop: "2rem" }}>{block.slice(2)}</h2>;
    }
    const lines = block.split("\n");
    if (lines.every((line) => /^(-|•)\s+/.test(line.trim()))) {
      return (
        <ul key={index} style={{ marginTop: "1rem", paddingLeft: "1.4rem" }}>
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>{line.replace(/^(-|•)\s+/, "")}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={index} style={{ marginTop: "1rem" }}>
        {lines.map((line, lineIndex) => (
          <span key={lineIndex}>
            {lineIndex > 0 ? <br /> : null}
            {line}
          </span>
        ))}
      </p>
    );
  });
}

export default function LegalDocumentsSection({
  content,
}: LegalDocumentsSectionProps) {
  const pathname = usePathname();
  const isTerms = pathname.includes("terms");
  const title = isTerms ? "Terms of Use" : "Privacy Policy";
  const body = (isTerms ? content.termsOfUse : content.privacyPolicy) || content.privacyPolicy || content.termsOfUse;

  return (
    <section style={{ padding: "132px 56px 96px", background: "var(--stone)" }}>
      <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
        <h1 style={{ color: "var(--mineral)", margin: 0 }}>{title}</h1>
        <div
          style={{
            marginTop: "22px",
            color: "var(--marl)",
            lineHeight: 1.8,
            fontSize: "18px",
            maxWidth: "72ch",
          }}
        >
          {body ? renderMarkdown(body) : null}
        </div>
      </div>
    </section>
  );
}
