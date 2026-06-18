// JSON-LD structured data for the homepage.
// Organization + WebSite + FAQPage. Kept in sync with the visible homepage FAQ.
// (The extension's SoftwareApplication/Offer schema is omitted while the
// extension is paused — re-add it when the extension relaunches.)

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.kitha.co/#organization",
      name: "Kitha",
      url: "https://www.kitha.co",
      logo: "https://www.kitha.co/icon.svg",
      sameAs: ["https://x.com/OrdinaryWeb3Dev"],
    },
    {
      "@type": "WebSite",
      "@id": "https://www.kitha.co/#website",
      name: "Kitha",
      url: "https://www.kitha.co",
      publisher: { "@id": "https://www.kitha.co/#organization" },
      description:
        "Guides on detecting AI-generated content on Twitter/X — how detection works, the telltale signs, and the best tools.",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How can I tell if a tweet is AI-generated?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Look for clusters of signs: uniform sentence rhythm, flawless punctuation, generic phrasing, and no personal voice. One sign means little; three or more together is a strong signal the post is AI.",
          },
        },
        {
          "@type": "Question",
          name: "How accurate are AI tweet detectors?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Useful but not perfect. Short text like tweets is the hardest to score, so any result is best read as a strong signal rather than proof.",
          },
        },
        {
          "@type": "Question",
          name: "Is the Kitha browser extension available?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The extension is temporarily paused while we rebuild it. In the meantime, our guides cover how to spot AI tweets and bot replies yourself.",
          },
        },
        {
          "@type": "Question",
          name: "Does Kitha store my data?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Kitha caches only anonymized detection results temporarily (24 hours) and never stores tweet content or personally identifiable information.",
          },
        },
      ],
    },
  ],
};

export default function HomeSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
