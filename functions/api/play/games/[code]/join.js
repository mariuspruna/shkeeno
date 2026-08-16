import { json, readJson, supabaseFetch } from "../../../catalog/_shared.js";
import {
  cleanName,
  drawTiles,
  errorResponse,
  loadGameState,
  makeToken,
} from "../../../_wordgame.js";

export async function onRequestPost({ request, env, params }) {
  try {
    const body = await readJson(request);
    const loaded = await loadGameState(env, params.code);
    if (!loaded) return json({ error: "Game not found." }, 404);
    if (loaded.game.status === "finished") return json({ error: "This game is already finished." }, 400);
    if (loaded.players.length >= loaded.game.max_players) return json({ error: "This game is already full." }, 400);

    const token = makeToken();
    const name = cleanName(body.name || `Player ${loaded.players.length + 1}`);
    const draw = drawTiles(loaded.game.tile_bag || [], []);
    const nextIndex = loaded.players.length;

    const playerResponse = await supabaseFetch(env, "/word_game_players", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        game_id: loaded.game.id,
        player_index: nextIndex,
        name,
        token,
        rack: draw.rack,
      }),
    });

    if (!playerResponse.ok) throw new Error(await playerResponse.text());

    const status = nextIndex + 1 >= loaded.game.max_players ? "active" : "waiting";
    const gameResponse = await supabaseFetch(env, `/word_games?id=eq.${encodeURIComponent(loaded.game.id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        tile_bag: draw.bag,
        status,
        updated_at: new Date().toISOString(),
        last_action: `${name} joined the game.`,
      }),
    });
    if (!gameResponse.ok) throw new Error(await gameResponse.text());

    const nextLoaded = await loadGameState(env, loaded.game.code, token);
    return json({ ...nextLoaded.state, token });
  } catch (error) {
    return errorResponse(error, "Could not join game.");
  }
}
