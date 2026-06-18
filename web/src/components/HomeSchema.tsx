// JSON-LD structured data for the homepage.
// Covers Organization, the SoftwareApplication (the extension), and the
// homepage FAQ — gives Google + AI assistants a machine-readable description
// of what Kitha is, so it can be surfaced and cited.

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
      "@type": "SoftwareApplication",
      name: "Kitha — AI Tweet Detector",
      applicationCategory: "BrowserApplication",
      operatingSystem: "Chrome",
      url: "https://www.kitha.co",
      downloadUrl:
        "https://chromewebstore.google.com/detail/kitha-ai-tweet-detector/idlmbjjhhlhbomgepbbhgmfnllekfhbd",
      description:
        "Kitha detects AI-generated tweets instantly with a Chrome extension, adding an AI-or-human badge to each post in your X (Twitter) feed.",
      publisher: { "@id": "https://www.kitha.co/#organization" },
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "USD",
          description: "50 scans per day, AI detection badges, basic support.",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "5",
          priceCurrency: "USD",
          description:
            "Unlimited scans, AI detection badges, priority support, early access.",
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How accurate is the AI detection?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Kitha's model achieves 95.6% accuracy on our test dataset. It's trained on a large corpus of human and AI-generated text to reliably distinguish between the two.",
          },
        },
        {
          "@type": "Question",
          name: "Does Kitha store my data?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We only store anonymized tweet IDs for caching purposes (24 hours). We never store the actual tweet content or any personally identifiable information.",
          },
        },
        {
          "@type": "Question",
          name: "Can I use Kitha on mobile?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Currently, Kitha is only available as a Chrome extension for desktop. We're exploring mobile options for the future.",
          },
        },
        {
          "@type": "Question",
          name: "What happens when I hit the free limit?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "When you reach 50 scans per day, you can upgrade to Pro for unlimited scans, or wait until the next day when your limit resets.",
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
