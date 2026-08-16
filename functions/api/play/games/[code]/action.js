import { json, readJson, supabaseFetch } from "../../../catalog/_shared.js";
import {
  drawTiles,
  errorResponse,
  loadGameState,
  normalisePlacements,
  shuffle,
  validateTurn,
} from "../../../_wordgame.js";
import { getSiteUrl, notifyNtfy } from "../../../_ntfy.js";

function activePlayers(players) {
  return players.filter((player) => player.status === "active");
}

function nextPlayerIndex(players, currentIndex) {
  const candidates = activePlayers(players);
  if (!candidates.length) return currentIndex;
  for (let offset = 1; offset <= players.length; offset += 1) {
    const index = (currentIndex + offset) % players.length;
    if (players[index]?.status === "active") return index;
  }
  return candidates[0].player_index;
}

async function patchGame(env, gameId, payload) {
  const response = await supabaseFetch(env, `/word_games?id=eq.${encodeURIComponent(gameId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...payload,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(await response.text());
}

async function patchPlayer(env, playerId, payload) {
  const response = await supabaseFetch(env, `/word_game_players?id=eq.${encodeURIComponent(playerId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...payload,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(await response.text());
}

function requireTurn(loaded, token) {
  const player = loaded.players.find((candidate) => candidate.token === token);
  if (!player) throw new Error("Player token not recognised.");
  if (loaded.game.status !== "active") throw new Error("The game is not active yet.");
  if (player.status !== "active") throw new Error("This player is no longer active.");
  if (player.player_index !== loaded.game.current_player_index) throw new Error("It is not your turn yet.");
  return player;
}

export async function onRequestPost({ request, env, params }) {
  try {
    const body = await readJson(request);
    const token = String(body.token || "");
    const action = String(body.action || "").trim();
    const loaded = await loadGameState(env, params.code, token);
    if (!loaded) return json({ error: "Game not found." }, 404);

    if (action === "nudge") {
      const player = loaded.players.find((candidate) => candidate.token === token);
      if (!player) throw new Error("Player token not recognised.");
      const turnPlayer = loaded.players.find((candidate) => candidate.player_index === loaded.game.current_player_index);
      const click = `${getSiteUrl(env)}/play?game=${encodeURIComponent(loaded.game.code)}`;
      await notifyNtfy(env, {
        title: "Shkeeno Words",
        tags: "game,eyes",
        priority: "3",
        click,
        body: `🔔 ${player.name} nudged ${turnPlayer?.name || "the table"} · ${loaded.game.code}`,
      }).catch(() => null);
      const nextLoaded = await loadGameState(env, params.code, token);
      return json(nextLoaded.state);
    }

    const player = requireTurn(loaded, token);
    const nextIndex = nextPlayerIndex(loaded.players, loaded.game.current_player_index);

    if (action === "submit") {
      const placements = normalisePlacements(body.placements);
      const validation = validateTurn(loaded.game.board || {}, player.rack || [], placements);
      if (!validation.ok) return json({ error: validation.error, invalidWords: validation.invalidWords || [] }, 400);

      const usedIds = new Set(placements.map((placement) => placement.tileId));
      const remainingRack = (player.rack || []).filter((tile) => !usedIds.has(tile.id));
      const draw = drawTiles(loaded.game.tile_bag || [], remainingRack);
      await patchPlayer(env, player.id, {
        rack: draw.rack,
        score: Number(player.score || 0) + validation.score,
      });
      await patchGame(env, loaded.game.id, {
        board: validation.board,
        tile_bag: draw.bag,
        current_player_index: nextIndex,
        pass_streak: 0,
        last_action: `${player.name} played ${validation.words.map((entry) => entry.word).join(", ")} for ${validation.score}.`,
      });
    } else if (action === "pass") {
      const passStreak = Number(loaded.game.pass_streak || 0) + 1;
      await patchGame(env, loaded.game.id, {
        current_player_index: nextIndex,
        pass_streak: passStreak,
        status: passStreak >= 3 ? "finished" : loaded.game.status,
        last_action: passStreak >= 3 ? `${player.name} passed. Three passes ended the game.` : `${player.name} passed.`,
      });
    } else if (action === "exchange") {
      const tileIds = new Set(Array.isArray(body.tileIds) ? body.tileIds.map(String) : []);
      if (!tileIds.size) return json({ error: "Choose at least one tile to exchange." }, 400);
      const kept = [];
      const returned = [];
      (player.rack || []).forEach((tile) => {
        if (tileIds.has(tile.id)) returned.push(tile);
        else kept.push(tile);
      });
      if (!returned.length) return json({ error: "Those tiles are not in your tray." }, 400);
      const draw = drawTiles(shuffle([...(loaded.game.tile_bag || []), ...returned]), kept);
      await patchPlayer(env, player.id, { rack: draw.rack });
      await patchGame(env, loaded.game.id, {
        tile_bag: draw.bag,
        current_player_index: nextIndex,
        pass_streak: 0,
        last_action: `${player.name} exchanged ${returned.length} tile${returned.length === 1 ? "" : "s"}.`,
      });
    } else if (action === "resign") {
      await patchPlayer(env, player.id, { status: "resigned" });
      const remaining = activePlayers(loaded.players).filter((candidate) => candidate.id !== player.id);
      await patchGame(env, loaded.game.id, {
        current_player_index: remaining[0]?.player_index ?? nextIndex,
        status: remaining.length <= 1 ? "finished" : loaded.game.status,
        winner_player_id: remaining.length === 1 ? remaining[0].id : loaded.game.winner_player_id,
        last_action: `${player.name} resigned.`,
      });
    } else {
      return json({ error: "Unknown game action." }, 400);
    }

    const nextLoaded = await loadGameState(env, params.code, token);
    return json(nextLoaded.state);
  } catch (error) {
    return errorResponse(error, "Could not update game.");
  }
}
