import { json } from "../../catalog/_shared.js";
import { errorResponse, loadGameState } from "../../_wordgame.js";

export async function onRequestGet({ request, env, params }) {
  try {
    const url = new URL(request.url);
    const token = String(url.searchParams.get("token") || "");
    const loaded = await loadGameState(env, params.code, token);
    if (!loaded) return json({ error: "Game not found." }, 404);
    return json(loaded.state);
  } catch (error) {
    return errorResponse(error, "Could not load game.");
  }
}
