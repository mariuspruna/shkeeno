export type AboutPage = {
  slug: "shkeeno" | "the-designer" | "the-idea";
  navLabel: string;
  title: string;
  description: string;
  eyebrow: string;
  body: string[];
};

export const aboutPages: AboutPage[] = [
  {
    slug: "shkeeno",
    navLabel: "Shkeeno",
    title: "Shkeeno",
    description: "About Shkeeno, the independent fashion label by Diana Baptista.",
    eyebrow: "About",
    body: [
      "Shkeeno is an independent fashion label with a studio attitude: expressive pieces, sharp visual choices, and room for clothes that feel personal.",
      "The brand is young, but the direction is clear. It is not trying to behave like a big retailer. It is building a world first: collections, images, services, notes, and small releases with a strong point of view.",
      "Expect contrast, pattern, texture, and a mix of confidence and softness. Shkeeno should feel contemporary and easy to enter, but never generic.",
    ],
  },
  {
    slug: "the-designer",
    navLabel: "The Designer",
    title: "The Designer",
    description: "About Diana Baptista, the designer behind Shkeeno.",
    eyebrow: "About",
    body: [
      "Diana Baptista is a Portuguese fashion designer based in the UK. Fashion has been the place where her interest in clothes, craft, drawing, sewing, and visual expression comes together.",
      "Her work has moved through fashion design studies in Portugal and BA Fashion Design work at Anglia Ruskin University, with graduate work shown through ARU and Graduate Fashion Week contexts.",
      "The visual language is confident and instinctive: structured silhouettes, strong surface detail, graphic rhythm, floral references, and expressive styling. Shkeeno gives that energy a sharper home.",
    ],
  },
  {
    slug: "the-idea",
    navLabel: "The Idea",
    title: "The Idea",
    description: "About the creative idea behind Shkeeno.",
    eyebrow: "About",
    body: [
      "Shkeeno starts with the feeling of a label before the mechanics of a shop. The first job is to create a place with a clear identity, not just a grid of products.",
      "Collections, services, pre-orders, editorial notes, and limited pieces can all sit inside that world. The idea is flexible, but the tone stays consistent: visual, direct, designer-led, and a little unexpected.",
      "As the brand grows, the website can grow with it. The shop can become more complete without flattening the personality that makes Shkeeno worth following.",
    ],
  },
];

export function getAboutPage(slug: string) {
  return aboutPages.find((page) => page.slug === slug);
}
