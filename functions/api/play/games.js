import { json, readJson, supabaseFetch } from "../catalog/_shared.js";
import {
  buildBag,
  cleanName,
  drawTiles,
  errorResponse,
  loadGameState,
  makeCode,
  makeToken,
} from "../_wordgame.js";

async function insertGame(env, payload) {
  const response = await supabaseFetch(env, "/word_games", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  return rows?.[0] || null;
}

async function insertPlayer(env, payload) {
  const response = await supabaseFetch(env, "/word_game_players", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  return rows?.[0] || null;
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await readJson(request);
    const maxPlayers = Math.max(2, Math.min(Number(body.max_players || 2), 4));
    const name = cleanName(body.name || "Marius");
    const token = makeToken();
    let bag = buildBag();
    const draw = drawTiles(bag, []);
    bag = draw.bag;

    let game = null;
    let attempts = 0;
    while (!game && attempts < 5) {
      attempts += 1;
      try {
        game = await insertGame(env, {
          code: makeCode(),
          max_players: maxPlayers,
          tile_bag: bag,
          status: "waiting",
          last_action: `${name} created the game.`,
          history: [{
            type: "create",
            message: `${name} created the game.`,
            created_at: new Date().toISOString(),
          }],
        });
      } catch (error) {
        if (!String(error.message || "").includes("duplicate")) throw error;
      }
    }

    if (!game) throw new Error("Could not create a unique game code.");

    await insertPlayer(env, {
      game_id: game.id,
      player_index: 0,
      name,
      token,
      rack: draw.rack,
    });

    const loaded = await loadGameState(env, game.code, token);
    return json({ ...loaded.state, token, invite_url: `/play?game=${game.code}` });
  } catch (error) {
    return errorResponse(error, "Could not create game.");
  }
}
