export type ValuesPage = {
  slug: "sustainability" | "code-of-ethics" | "charity";
  navLabel: string;
  title: string;
  description: string;
  eyebrow: string;
  body: string[];
};

export const valuesPages: ValuesPage[] = [
  {
    slug: "sustainability",
    navLabel: "Sustainability",
    title: "Sustainability",
    description: "Shkeeno sustainability notes and commitments.",
    eyebrow: "Values",
    body: [
      "Shkeeno is being built slowly, with care for what gets made and why it exists. The aim is not to chase volume, but to keep the catalogue considered.",
      "Small releases, repair, alteration, and custom services all support that direction. A piece should have a life beyond the first wear.",
      "As production details become clearer, this page will grow into a more specific sustainability note. For now, the principle is simple: make fewer careless choices.",
    ],
  },
  {
    slug: "code-of-ethics",
    navLabel: "Code of ethics",
    title: "Code of ethics",
    description: "The code of ethics guiding Shkeeno.",
    eyebrow: "Values",
    body: [
      "Shkeeno’s code of ethics starts with respect: for the work, for collaborators, and for the people who choose to buy or follow the brand.",
      "The label should be clear about pricing, availability, pre-orders, delivery, and custom requests. No vague promises, no unnecessary drama.",
      "As the shop develops, this page will hold more detailed policies around sourcing, production, returns, privacy, and customer care.",
    ],
  },
  {
    slug: "charity",
    navLabel: "Charity",
    title: "Charity",
    description: "Shkeeno charity and giving notes.",
    eyebrow: "Values",
    body: [
      "Shkeeno wants to leave space for giving that feels genuine, not decorative. Charity work should connect naturally with the brand, the community, or a specific project.",
      "When a campaign or partnership is active, the details should be easy to understand: who it supports, how it works, and what has been contributed.",
      "Until then, this page stays as a promise of intent rather than a performance. Better to be honest now and specific later.",
    ],
  },
];

export function getValuesPage(slug: string) {
  return valuesPages.find((page) => page.slug === slug);
}
