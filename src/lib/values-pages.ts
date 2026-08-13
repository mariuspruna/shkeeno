export type ValuesPage = {
  slug: "sustainability" | "code-of-ethics" | "charity";
  navLabel: string;
  title: string;
  description: string;
  eyebrow: string;
  body: string;
};

export const valuesPages: ValuesPage[] = [
  {
    slug: "sustainability",
    navLabel: "Sustainability",
    title: "Sustainability",
    description: "Shkeeno sustainability notes and commitments.",
    eyebrow: "Values",
    body:
      "Shkeeno is being shaped as a considered fashion label, not a fast-moving product machine. That means building slowly, keeping quantities intentional, and giving space to repair, alteration, and custom service where it makes sense. The sustainability language will become more precise as Diana defines materials, suppliers, and production methods, but the direction is already clear: fewer careless decisions, more useful pieces, and a closer relationship between the designer, the garment, and the person wearing it.",
  },
  {
    slug: "code-of-ethics",
    navLabel: "Code of ethics",
    title: "Code of ethics",
    description: "The code of ethics guiding Shkeeno.",
    eyebrow: "Values",
    body:
      "Shkeeno’s code of ethics starts with respect: for the people who make the work, the people who wear it, and the creative process behind each piece. The brand should communicate clearly about availability, pricing, delivery, pre-orders, and custom requests. It should avoid inflated promises, protect customer information, and treat collaborators fairly. As the shop grows, this page can become the public home for more detailed policies around sourcing, production, returns, and customer care.",
  },
  {
    slug: "charity",
    navLabel: "Charity",
    title: "Charity",
    description: "Shkeeno charity and giving notes.",
    eyebrow: "Values",
    body:
      "Charity is part of Shkeeno’s future values structure rather than a finished programme today. The intention is to leave room for meaningful giving, collaborations, or small campaigns that connect naturally with Diana’s work and community. This page can later hold the exact organisations, percentages, dates, and outcomes. Until then, the commitment is simple: if Shkeeno links itself to a cause, the wording should be honest, specific, and easy for customers to understand.",
  },
];

export function getValuesPage(slug: string) {
  return valuesPages.find((page) => page.slug === slug);
}
