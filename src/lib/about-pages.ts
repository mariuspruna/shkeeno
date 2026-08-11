export type AboutPage = {
  slug: "shkeeno" | "the-designer" | "the-idea";
  navLabel: string;
  title: string;
  description: string;
  eyebrow: string;
  body: string;
};

export const aboutPages: AboutPage[] = [
  {
    slug: "shkeeno",
    navLabel: "Shkeeno",
    title: "Shkeeno",
    description: "About Shkeeno, the independent fashion label by Diana Baptista.",
    eyebrow: "About",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer facilisis, libero vel eleifend ultrices, erat metus malesuada lectus, sed molestie felis lorem vitae erat.",
  },
  {
    slug: "the-designer",
    navLabel: "The Designer",
    title: "The Designer",
    description: "About Diana Baptista, the designer behind Shkeeno.",
    eyebrow: "About",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean iaculis nisi ac justo laoreet, nec convallis sapien faucibus.",
  },
  {
    slug: "the-idea",
    navLabel: "The Idea",
    title: "The Idea",
    description: "About the creative idea behind Shkeeno.",
    eyebrow: "About",
    body:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. In sed mi ac turpis cursus convallis sit amet ac arcu.",
  },
];

export function getAboutPage(slug: string) {
  return aboutPages.find((page) => page.slug === slug);
}
