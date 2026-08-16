import { json, readJson } from "../../../catalog/_shared.js";
import {
  cleanName,
  errorResponse,
  loadGameState,
} from "../../../_wordgame.js";

function normaliseName(value) {
  return cleanName(value).toLowerCase();
}

export async function onRequestPost({ request, env, params }) {
  try {
    const body = await readJson(request);
    const requestedName = normaliseName(body.name || "");
    if (!requestedName) return json({ error: "Enter the player name used in this game." }, 400);

    const loaded = await loadGameState(env, params.code);
    if (!loaded) return json({ error: "Game not found." }, 404);

    const player = loaded.players.find((candidate) => normaliseName(candidate.name) === requestedName);
    if (!player) return json({ error: "No player with that name exists in this game." }, 404);

    const nextLoaded = await loadGameState(env, loaded.game.code, player.token);
    return json({ ...nextLoaded.state, token: player.token });
  } catch (error) {
    return errorResponse(error, "Could not restore player.");
  }
}
