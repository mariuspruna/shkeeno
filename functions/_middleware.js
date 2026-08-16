export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const isPlayHost = url.hostname.toLowerCase() === "play.shkeeno.com";

  if (isPlayHost && (url.pathname === "/" || url.pathname === "")) {
    url.pathname = "/play";
    return env.ASSETS.fetch(new Request(url.toString(), request));
  }

  return next();
}
