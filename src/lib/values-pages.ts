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
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer facilisis, libero vel eleifend ultrices, erat metus malesuada lectus, sed molestie felis lorem vitae erat.",
  },
  {
    slug: "code-of-ethics",
    navLabel: "Code of ethics",
    title: "Code of ethics",
    description: "The code of ethics guiding Shkeeno.",
    eyebrow: "Values",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean iaculis nisi ac justo laoreet, nec convallis sapien faucibus.",
  },
  {
    slug: "charity",
    navLabel: "Charity",
    title: "Charity",
    description: "Shkeeno charity and giving notes.",
    eyebrow: "Values",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. In sed mi ac turpis cursus convallis sit amet ac arcu.",
  },
];

export function getValuesPage(slug: string) {
  return valuesPages.find((page) => page.slug === slug);
}
