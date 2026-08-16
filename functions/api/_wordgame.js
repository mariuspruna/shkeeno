import { json, supabaseFetch } from "./catalog/_shared.js";

export const BOARD_SIZE = 15;
export const RACK_SIZE = 7;

const TILE_DISTRIBUTION = {
  A: [9, 1],
  B: [2, 3],
  C: [2, 3],
  D: [4, 2],
  E: [12, 1],
  F: [2, 4],
  G: [3, 2],
  H: [2, 4],
  I: [9, 1],
  J: [1, 8],
  K: [1, 5],
  L: [4, 1],
  M: [2, 3],
  N: [6, 1],
  O: [8, 1],
  P: [2, 3],
  Q: [1, 10],
  R: [6, 1],
  S: [4, 1],
  T: [6, 1],
  U: [4, 1],
  V: [2, 4],
  W: [2, 4],
  X: [1, 8],
  Y: [2, 4],
  Z: [1, 10],
};

const WORDS = new Set([
  "A", "I", "AM", "AN", "AS", "AT", "BE", "BY", "DO", "GO", "HE", "IF", "IN", "IS", "IT", "ME", "MY", "NO", "OF", "ON", "OR", "OX", "SO", "TO", "UP", "US", "WE",
  "ACE", "ACT", "ADD", "AGE", "AGO", "AID", "AIR", "AND", "ANT", "ANY", "APE", "ARE", "ARM", "ART", "ASH", "ASK", "ATE", "BAD", "BAG", "BAR", "BAT", "BED", "BEE", "BIG", "BIT", "BOX", "BOY", "BUS", "CAN", "CAR", "CAT", "COT", "CUP", "CUT", "DAY", "DID", "DOG", "EAR", "EAT", "END", "ERA", "FAR", "FIT", "FLY", "FOR", "FOX", "FUN", "GET", "GIRL", "HAT", "HER", "HIM", "HIS", "HOT", "HOW", "ICE", "INK", "JOY", "KEY", "LAW", "LAY", "LET", "LIE", "LIP", "LOG", "LOT", "LOW", "MAN", "MAP", "MAY", "MIX", "NET", "NEW", "NOW", "OAK", "OLD", "ONE", "OUR", "OUT", "PAN", "PEN", "PET", "PIN", "RAG", "RAN", "RAT", "RED", "RUN", "SAT", "SAW", "SAY", "SEA", "SEE", "SET", "SHE", "SKY", "SUN", "TEA", "TEN", "THE", "TOY", "TRY", "TWO", "USE", "WAR", "WAS", "WAY", "WHO", "WHY", "YES", "YET",
  "ABOUT", "AFTER", "AGAIN", "ALIVE", "APPLE", "BOARD", "BRAND", "CHAIR", "CHARM", "CLEAR", "CLOTH", "COLOUR", "DANCE", "DREAM", "DRESS", "EARTH", "EIGHT", "FAITH", "FIBRE", "FIELD", "FIRST", "FLAME", "FLAIR", "FLOOR", "FLOWER", "FRAME", "GRACE", "GRAPHIC", "GREEN", "HEART", "HOUSE", "IDEA", "IMAGE", "LABEL", "LIGHT", "LINES", "LONDON", "MAGIC", "MAKER", "MOMENT", "MUSIC", "NIGHT", "ORANGE", "PIECE", "PLACE", "PLAIN", "PLAY", "POET", "PRINT", "QUIET", "REPAIR", "RHYTHM", "ROUND", "SEWING", "SHAPE", "SHIRT", "SHOE", "SKIRT", "SOFT", "SOUND", "SPACE", "STITCH", "STONE", "STORY", "STYLE", "TABLE", "TAILOR", "TEAL", "THING", "THREAD", "TILE", "TRAIN", "VALUE", "WHITE", "WORDS", "WORLD", "ZEBRA",
  "BAPTISTA", "DIANA", "FASHION", "SHKEENO", "DESIGN", "DESIGNER", "TEXTILE", "PATTERN", "SERVICE", "SERVICES", "COLLECTION", "COLLECTIONS", "SUSTAIN", "CHARITY", "ETHICS",
]);

export function tileScore(letter) {
  return TILE_DISTRIBUTION[String(letter || "").toUpperCase()]?.[1] || 0;
}

export function buildBag() {
  const bag = [];
  Object.entries(TILE_DISTRIBUTION).forEach(([letter, [count, score]]) => {
    for (let index = 0; index < count; index += 1) {
      bag.push({ id: crypto.randomUUID(), letter, score });
    }
  });
  return shuffle(bag);
}

export function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function drawTiles(bag, rack, count = RACK_SIZE) {
  const nextBag = [...bag];
  const nextRack = [...rack];
  while (nextRack.length < count && nextBag.length) {
    nextRack.push(nextBag.shift());
  }
  return { bag: nextBag, rack: nextRack };
}

export function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function makeToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function cleanName(value) {
  return String(value || "Player").trim().slice(0, 28) || "Player";
}

export function boardKey(row, col) {
  return `${row},${col}`;
}

export function normalisePlacements(placements) {
  if (!Array.isArray(placements)) return [];
  return placements
    .map((placement) => ({
      row: Number(placement.row),
      col: Number(placement.col),
      tileId: String(placement.tileId || ""),
    }))
    .filter((placement) => (
      Number.isInteger(placement.row) &&
      Number.isInteger(placement.col) &&
      placement.row >= 0 &&
      placement.row < BOARD_SIZE &&
      placement.col >= 0 &&
      placement.col < BOARD_SIZE &&
      placement.tileId
    ));
}

export function wordExists(word) {
  const normalised = String(word || "").toUpperCase();
  if (normalised.length <= 1) return true;
  return WORDS.has(normalised);
}

export function getFormedWords(board, placements) {
  const placed = new Set(placements.map((placement) => boardKey(placement.row, placement.col)));
  const words = [];
  const seen = new Set();

  function tileAt(row, col) {
    return board[boardKey(row, col)] || null;
  }

  function collect(row, col, dr, dc) {
    let startRow = row;
    let startCol = col;
    while (tileAt(startRow - dr, startCol - dc)) {
      startRow -= dr;
      startCol -= dc;
    }

    const cells = [];
    let cursorRow = startRow;
    let cursorCol = startCol;
    while (tileAt(cursorRow, cursorCol)) {
      cells.push({ row: cursorRow, col: cursorCol, tile: tileAt(cursorRow, cursorCol) });
      cursorRow += dr;
      cursorCol += dc;
    }

    if (cells.length <= 1) return;
    const key = `${dr}:${dc}:${startRow}:${startCol}`;
    if (seen.has(key)) return;
    seen.add(key);

    if (!cells.some((cell) => placed.has(boardKey(cell.row, cell.col)))) return;
    words.push({
      word: cells.map((cell) => cell.tile.letter).join(""),
      cells,
      score: cells.reduce((sum, cell) => sum + Number(cell.tile.score || tileScore(cell.tile.letter)), 0),
    });
  }

  placements.forEach((placement) => {
    collect(placement.row, placement.col, 0, 1);
    collect(placement.row, placement.col, 1, 0);
  });

  return words;
}

export function validateTurn(existingBoard, rack, placements) {
  const uniqueSquares = new Set();
  const rackById = new Map(rack.map((tile) => [tile.id, tile]));
  const board = { ...existingBoard };

  for (const placement of placements) {
    const key = boardKey(placement.row, placement.col);
    if (uniqueSquares.has(key)) return { ok: false, error: "Two tiles are on the same square." };
    if (board[key]) return { ok: false, error: "That square is already occupied." };
    const tile = rackById.get(placement.tileId);
    if (!tile) return { ok: false, error: "One of those tiles is no longer in your tray." };
    board[key] = tile;
    uniqueSquares.add(key);
  }

  if (!placements.length) return { ok: false, error: "Place at least one tile." };

  const words = getFormedWords(board, placements);
  if (!words.length) {
    const solo = placements.map((placement) => board[boardKey(placement.row, placement.col)]);
    if (solo.length === 1 && Object.keys(existingBoard).length > 0) {
      return { ok: false, error: "A single tile must form a word with existing tiles." };
    }
    const sorted = [...placements].sort((a, b) => a.row - b.row || a.col - b.col);
    words.push({
      word: sorted.map((placement) => board[boardKey(placement.row, placement.col)].letter).join(""),
      cells: sorted,
      score: sorted.reduce((sum, placement) => sum + board[boardKey(placement.row, placement.col)].score, 0),
    });
  }

  const invalidWords = words.filter((entry) => !wordExists(entry.word)).map((entry) => entry.word);
  if (invalidWords.length) {
    return { ok: false, error: `Word not recognised: ${invalidWords.join(", ")}`, board, words, invalidWords };
  }

  return {
    ok: true,
    board,
    words,
    score: words.reduce((sum, entry) => sum + entry.score, 0),
  };
}

export async function getGameByCode(env, code) {
  const response = await supabaseFetch(
    env,
    `/word_games?code=eq.${encodeURIComponent(String(code || "").toUpperCase())}&select=*&limit=1`,
  );
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  return rows?.[0] || null;
}

export async function getPlayers(env, gameId) {
  const response = await supabaseFetch(
    env,
    `/word_game_players?game_id=eq.${encodeURIComponent(gameId)}&select=*&order=player_index.asc`,
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export function publicState(game, players, currentToken = "") {
  return {
    game: {
      id: game.id,
      code: game.code,
      status: game.status,
      max_players: game.max_players,
      board: game.board || {},
      tile_bag_count: Array.isArray(game.tile_bag) ? game.tile_bag.length : 0,
      current_player_index: game.current_player_index,
      pass_streak: game.pass_streak,
      last_action: game.last_action,
      winner_player_id: game.winner_player_id,
      updated_at: game.updated_at,
    },
    players: players.map((player) => ({
      id: player.id,
      player_index: player.player_index,
      name: player.name,
      score: player.score,
      status: player.status,
      rack_count: Array.isArray(player.rack) ? player.rack.length : 0,
      rack: player.token === currentToken ? player.rack : undefined,
      is_you: player.token === currentToken,
    })),
  };
}

export async function loadGameState(env, code, token = "") {
  const game = await getGameByCode(env, code);
  if (!game) return null;
  const players = await getPlayers(env, game.id);
  return { game, players, state: publicState(game, players, token) };
}

export function errorResponse(error, fallback = "Game request failed.") {
  return json({ error: error.message || fallback }, 400);
}
