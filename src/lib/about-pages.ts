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
      "Shkeeno is the designer-led fashion identity of Diana Baptista, a Portuguese designer working in the United Kingdom. The brand sits close to the studio: personal, visual, and built around clothes as a way of expressing character rather than following a mass-market rhythm. Its language can be bold and graphic, but the feeling should stay human — pieces with a point of view, room for craft, and an interest in how clothing can carry attitude without losing softness.",
  },
  {
    slug: "the-designer",
    navLabel: "The Designer",
    title: "The Designer",
    description: "About Diana Baptista, the designer behind Shkeeno.",
    eyebrow: "About",
    body:
      "Diana Baptista is a Portuguese fashion designer based in the UK. Her public portfolio describes a path shaped by arts, crafts, sewing, and clothes, with fashion becoming the place where those interests meet. Before developing Shkeeno as a brand space, Diana studied fashion design in Portugal and continued refining her practice through BA Fashion Design work at Anglia Ruskin University. Her graduate work has appeared in ARU and Graduate Fashion Week contexts, with a visual direction that moves between structured silhouettes, expressive surface, floral energy, zebra-like pattern, and confident styling.",
  },
  {
    slug: "the-idea",
    navLabel: "The Idea",
    title: "The Idea",
    description: "About the creative idea behind Shkeeno.",
    eyebrow: "About",
    body:
      "The idea behind Shkeeno is to give Diana’s work a clear, independent home: part brand presence, part portfolio, part future shop. It should not feel like a generic catalogue. The website is being built so collections, individual pieces, pre-orders, services, and editorial notes can grow around the same centre: Diana’s creative identity. For now, Shkeeno can hold the story, the look, and the first pieces. Later, it can support a fuller commerce flow without losing the designer-led feel.",
  },
];

export function getAboutPage(slug: string) {
  return aboutPages.find((page) => page.slug === slug);
}
