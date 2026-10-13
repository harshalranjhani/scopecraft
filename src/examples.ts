import type { Proposal, Brief } from "./domain";

export const exampleBriefs: (Brief & { label: string; category: string })[] = [
  {
    label: "The neighborhood café",
    category: "Web design",
    clientName: "Little Fern Café",
    projectName: "A fresh home for Little Fern",
    hourlyRate: 85,
    currency: "USD",
    bufferPercent: 15,
    brief:
      "We are a small independent cafe opening a second location. We need a warm, simple website with a home page, our seasonal menu, locations and opening hours, and a contact form. It must work well on phones. We have a logo and some photos, but menu copy is not finished. We would love online ordering eventually, but not for launch. We hope to launch in four weeks. Could you also help set up a newsletter? We have not picked a platform or a budget yet.",
  },
  {
    label: "The independent maker",
    category: "E-commerce",
    clientName: "Form & Field",
    projectName: "A storefront for handcrafted ceramics",
    hourlyRate: 85,
    currency: "USD",
    bufferPercent: 15,
    brief:
      "I sell handmade ceramics at markets and want to open a Shopify store. I have 20 products, photographs and a simple logo. I need a clean storefront, product pages, shipping setup and an about page. I will write the product descriptions. I would like to launch before the holidays. Could you also handle product photography and connect Instagram shopping? My budget is around $3,000, but I am not sure how much shipping integrations cost.",
  },
  {
    label: "The creative studio",
    category: "Brand strategy",
    clientName: "Sunday Studio",
    projectName: "A thoughtful brand refresh",
    hourlyRate: 85,
    currency: "USD",
    bufferPercent: 15,
    brief:
      "We are a two-person interior design studio. We need a refreshed visual identity: a logo, color palette, typography and a short brand guide. Our existing name stays. We would like two initial concepts and two rounds of revisions. We also need business cards and Instagram templates, but these could be a second phase. We have not agreed on the creative direction or final decision maker. Ideally we finish in three weeks.",
  },
];

const scopes = [
  {
    summary:
      "A warm, mobile-friendly website that helps guests discover the café, browse the seasonal menu, and find both locations.",
    deliverables: [
      {
        title: "Discovery & content planning",
        description:
          "Confirm the page structure, collect brand assets, and agree on launch content.",
        hours: 6,
      },
      {
        title: "Responsive website design",
        description:
          "Design the home, menu, locations, and contact pages for desktop and mobile.",
        hours: 18,
      },
      {
        title: "Website build & contact form",
        description:
          "Build the approved designs and a tested contact form on the agreed platform.",
        hours: 22,
      },
      {
        title: "Testing & launch handoff",
        description:
          "Check accessibility, mobile layouts and links, then provide a simple editing guide.",
        hours: 6,
      },
    ],
    exclusions: [
      "Online ordering and payment processing.",
      "Newsletter setup until the platform and requirements are confirmed.",
      "Ongoing hosting, maintenance and copywriting.",
    ],
    questions: [
      "Who will provide final menu copy, and by what date?",
      "Which website platform and hosting service should we use?",
      "Is newsletter setup part of launch or a separate phase?",
    ],
    risks: [
      {
        severity: "high" as const,
        title: "A deadline without final content",
        detail:
          "The four-week launch depends on approved menu copy. Agree on a content deadline before scheduling.",
      },
      {
        severity: "medium" as const,
        title: "A small request with a bigger scope",
        detail:
          "Newsletter setup needs a platform, signup flow and consent requirements. Estimate it separately.",
      },
    ],
  },
  {
    summary:
      "A focused Shopify storefront for 20 handcrafted ceramic products, with a clear browsing experience and a manageable launch handoff.",
    deliverables: [
      {
        title: "Store planning & theme setup",
        description:
          "Agree on navigation and configure an existing Shopify theme.",
        hours: 8,
      },
      {
        title: "Product catalog & core pages",
        description:
          "Set up 20 products with supplied copy and images, plus about and contact pages.",
        hours: 14,
      },
      {
        title: "Shipping & checkout setup",
        description:
          "Configure agreed shipping regions and test Shopify checkout.",
        hours: 8,
      },
      {
        title: "Launch review & owner training",
        description:
          "Test the store and show the owner how to manage products and orders.",
        hours: 5,
      },
    ],
    exclusions: [
      "Original product photography.",
      "Instagram shopping approval and integration.",
      "Shopify subscription, paid themes and third-party app fees.",
    ],
    questions: [
      "What are the shipping regions, packaging weights and rates?",
      "Are all 20 product descriptions and photos ready?",
      "What is the specific holiday launch date?",
    ],
    risks: [
      {
        severity: "high" as const,
        title: "Budget and launch scope may diverge",
        detail:
          "Photography and social shopping are additional work. Confirm priorities before committing to the budget.",
      },
      {
        severity: "medium" as const,
        title: "Unconfirmed shipping rules",
        detail:
          "Fragile products may require different packaging and rates. The owner needs to supply these details.",
      },
    ],
  },
  {
    summary:
      "A considered visual identity refresh for a small interior design studio, retaining its name and documenting a consistent visual direction.",
    deliverables: [
      {
        title: "Brand discovery",
        description:
          "Align on the audience, visual references and a single decision maker.",
        hours: 5,
      },
      {
        title: "Identity concepts",
        description:
          "Develop two logo and visual direction concepts for review.",
        hours: 14,
      },
      {
        title: "Refinement & final assets",
        description:
          "Refine the selected concept through two revision rounds and export logo files.",
        hours: 10,
      },
      {
        title: "Concise brand guide",
        description:
          "Document logo usage, color values and typography in a short guide.",
        hours: 6,
      },
    ],
    exclusions: [
      "Business card design and printing.",
      "Instagram template creation.",
      "Additional concepts or more than two revision rounds.",
    ],
    questions: [
      "Who gives the final approval?",
      "When can both studio partners attend the discovery session?",
      "Should business cards and social templates be priced as phase two?",
    ],
    risks: [
      {
        severity: "high" as const,
        title: "Approval ownership is unclear",
        detail:
          "Two founders without a final decision maker can expand revisions. Agree on approval responsibility first.",
      },
      {
        severity: "medium" as const,
        title: "A tight timeline needs fast feedback",
        detail:
          "Three weeks is conditional on feedback turnaround. Confirm review dates before starting.",
      },
    ],
  },
];
export const examples: Proposal[] = exampleBriefs.map((brief, i) => ({
  ...brief,
  id: `example-${i}`,
  createdAt: `2026-10-${13 - i}T10:00:00.000Z`,
  status: "draft",
  scope: scopes[i],
  source: "example",
  model: "Curated example",
  generationMs: 0,
}));
