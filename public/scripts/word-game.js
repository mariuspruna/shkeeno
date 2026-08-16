const TILE_SCORES = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
  N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
};

const PREMIUM_SQUARES = {
  "7,7": "DW",
  "0,0": "TW", "0,7": "TW", "0,14": "TW", "7,0": "TW", "7,14": "TW", "14,0": "TW", "14,7": "TW", "14,14": "TW",
  "1,1": "DW", "2,2": "DW", "3,3": "DW", "4,4": "DW", "10,10": "DW", "11,11": "DW", "12,12": "DW", "13,13": "DW",
  "1,13": "DW", "2,12": "DW", "3,11": "DW", "4,10": "DW", "10,4": "DW", "11,3": "DW", "12,2": "DW", "13,1": "DW",
  "0,3": "DL", "0,11": "DL", "2,6": "DL", "2,8": "DL", "3,0": "DL", "3,7": "DL", "3,14": "DL",
  "6,2": "DL", "6,6": "DL", "6,8": "DL", "6,12": "DL", "7,3": "DL", "7,11": "DL",
  "8,2": "DL", "8,6": "DL", "8,8": "DL", "8,12": "DL", "11,0": "DL", "11,7": "DL", "11,14": "DL", "12,6": "DL", "12,8": "DL", "14,3": "DL", "14,11": "DL",
  "1,5": "TL", "1,9": "TL", "5,1": "TL", "5,5": "TL", "5,9": "TL", "5,13": "TL", "9,1": "TL", "9,5": "TL", "9,9": "TL", "9,13": "TL", "13,5": "TL", "13,9": "TL",
};

const WORDS = new Set("A I AM AN AS AT BE BY DO GO HE IF IN IS IT ME MY NO OF ON OR OX SO TO UP US WE ACE ACT ADD AGE AGO AID AIR AND ANT ANY APE ARE ARM ART ASH ASK ATE BAD BAG BAR BAT BED BEE BIG BIT BOX BOY BUS CAN CAR CAT COT CUP CUT DAY DID DOG EAR EAT END ERA FAR FIT FLY FOR FOX FUN GET GIRL HAT HER HIM HIS HOT HOW ICE INK JOY KEY LAW LAY LET LIE LIP LOG LOT LOW MAN MAP MAY MIX NET NEW NOW OAK OLD ONE OUR OUT PAN PEN PET PIN RAG RAN RAT RED RUN SAT SAW SAY SEA SEE SET SHE SKY SUN TEA TEN THE TOY TRY TWO USE WAR WAS WAY WHO WHY YES YET ABOUT AFTER AGAIN ALIVE APPLE BOARD BRAND CHAIR CHARM CLEAR CLOTH COLOUR DANCE DREAM DRESS EARTH EIGHT FAITH FIBRE FIELD FIRST FLAME FLAIR FLOOR FLOWER FRAME GRACE GRAPHIC GREEN HEART HOUSE IDEA IMAGE LABEL LIGHT LINES LONDON MAGIC MAKER MOMENT MUSIC NIGHT ORANGE PIECE PLACE PLAIN PLAY POET PRINT QUIET REPAIR RHYTHM ROUND SEWING SHAPE SHIRT SHOE SKIRT SOFT SOUND SPACE STITCH STONE STORY STYLE TABLE TAILOR TEAL THING THREAD TILE TRAIN VALUE WHITE WORDS WORLD ZEBRA BAPTISTA DIANA FASHION SHKEENO DESIGN DESIGNER TEXTILE PATTERN SERVICE SERVICES COLLECTION COLLECTIONS SUSTAIN CHARITY ETHICS".split(" "));

const state = {
  code: "",
  token: "",
  game: null,
  players: [],
  selectedTileId: "",
  selectedExchangeIds: new Set(),
  exchangeMode: false,
  placements: [],
  rackOrder: [],
  lastNudgeAt: 0,
  lastBoardTapAt: 0,
  poll: null,
};

const nodes = {
  lobby: document.querySelector("[data-game-lobby]"),
  table: document.querySelector("[data-game-table]"),
  status: document.querySelector("[data-word-game-status]"),
  board: document.querySelector("[data-word-board]"),
  rack: document.querySelector("[data-word-rack]"),
  scoreboard: document.querySelector("[data-scoreboard]"),
  gameCode: document.querySelector("[data-game-code]"),
  gameStatus: document.querySelector("[data-game-status]"),
  bagCount: document.querySelector("[data-bag-count]"),
  previewScore: document.querySelector("[data-preview-score]"),
  validity: document.querySelector("[data-word-validity]"),
  exchangeMode: document.querySelector("[data-exchange-mode]"),
  history: document.querySelector("[data-word-history]"),
};

function setStatus(message, tone = "neutral") {
  if (!nodes.status) return;
  nodes.status.hidden = !message;
  nodes.status.textContent = message || "";
  nodes.status.dataset.tone = tone;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function storageKey(code) {
  return `shkeeno_words_${String(code || "").toUpperCase()}`;
}

function saveToken(code, token) {
  localStorage.setItem(storageKey(code), token);
}

function readToken(code) {
  return localStorage.getItem(storageKey(code)) || "";
}

function closestElement(event, selector) {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  return target?.closest(selector) || null;
}

function currentPlayer() {
  return state.players.find((player) => player.is_you) || null;
}

function isMyTurn() {
  const me = currentPlayer();
  return Boolean(me && state.game?.status === "active" && me.player_index === state.game.current_player_index);
}

function boardKey(row, col) {
  return `${row},${col}`;
}

function placedTileAt(row, col) {
  return state.placements.find((placement) => placement.row === row && placement.col === col) || null;
}

function tileFromRack(tileId) {
  const me = currentPlayer();
  return me?.rack?.find((tile) => tile.id === tileId) || null;
}

function orderedRack(rack = []) {
  const currentIds = new Set(rack.map((tile) => tile.id));
  state.rackOrder = state.rackOrder.filter((id) => currentIds.has(id));
  rack.forEach((tile) => {
    if (!state.rackOrder.includes(tile.id)) state.rackOrder.push(tile.id);
  });
  const order = new Map(state.rackOrder.map((id, index) => [id, index]));
  return [...rack].sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
}

function fullBoard() {
  const board = { ...(state.game?.board || {}) };
  state.placements.forEach((placement) => {
    board[boardKey(placement.row, placement.col)] = tileFromRack(placement.tileId);
  });
  return board;
}

function wordExists(word) {
  const value = String(word || "").toUpperCase();
  return value.length <= 1 || WORDS.has(value);
}

fetch("/data/word-list.txt")
  .then((response) => response.ok ? response.text() : "")
  .then((text) => {
    text.split(/\s+/).forEach((word) => {
      if (word) WORDS.add(word.toUpperCase());
    });
    updatePreview();
  })
  .catch(() => null);

function scoreWord(cells, placed) {
  let wordMultiplier = 1;
  const score = cells.reduce((sum, cell) => {
    const baseScore = Number(cell.tile.score || TILE_SCORES[cell.tile.letter] || 0);
    if (!placed.has(boardKey(cell.row, cell.col))) return sum + baseScore;
    const premium = PREMIUM_SQUARES[boardKey(cell.row, cell.col)];
    if (premium === "DL") return sum + (baseScore * 2);
    if (premium === "TL") return sum + (baseScore * 3);
    if (premium === "DW") wordMultiplier *= 2;
    if (premium === "TW") wordMultiplier *= 3;
    return sum + baseScore;
  }, 0);
  return score * wordMultiplier;
}

function collectWords() {
  const board = fullBoard();
  const words = [];
  const seen = new Set();
  const placed = new Set(state.placements.map((placement) => boardKey(placement.row, placement.col)));

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
      score: scoreWord(cells, placed),
    });
  }

  state.placements.forEach((placement) => {
    collect(placement.row, placement.col, 0, 1);
    collect(placement.row, placement.col, 1, 0);
  });

  if (!words.length && state.placements.length > 1) {
    const sorted = [...state.placements].sort((a, b) => a.row - b.row || a.col - b.col);
    words.push({
      word: sorted.map((placement) => tileFromRack(placement.tileId)?.letter || "").join(""),
      score: scoreWord(sorted.map((placement) => ({ ...placement, tile: tileFromRack(placement.tileId) })), placed),
    });
  }

  return words;
}

function updatePreview() {
  const words = collectWords();
  const score = words.reduce((sum, entry) => sum + entry.score, 0);
  const invalid = words.filter((entry) => !wordExists(entry.word)).map((entry) => entry.word);

  if (nodes.previewScore) nodes.previewScore.textContent = String(score);
  if (!nodes.validity) return;
  if (!state.placements.length) {
    nodes.validity.textContent = "Place tiles to begin.";
    nodes.validity.dataset.valid = "idle";
  } else if (invalid.length) {
    nodes.validity.textContent = `Not found: ${invalid.join(", ")}`;
    nodes.validity.dataset.valid = "false";
  } else {
    nodes.validity.textContent = words.length ? `Looks good: ${words.map((entry) => entry.word).join(", ")}` : "Place a connected word.";
    nodes.validity.dataset.valid = words.length ? "true" : "idle";
  }
}

function renderBoard() {
  if (!nodes.board) return;
  const board = state.game?.board || {};
  const html = [];
  for (let row = 0; row < 15; row += 1) {
    for (let col = 0; col < 15; col += 1) {
      const fixedTile = board[boardKey(row, col)];
      const placement = placedTileAt(row, col);
      const tile = fixedTile || (placement ? tileFromRack(placement.tileId) : null);
      const center = row === 7 && col === 7;
      const premium = PREMIUM_SQUARES[boardKey(row, col)] || "";
      html.push(`
        <button
          type="button"
          class="word-cell${center ? " is-center" : ""}${fixedTile ? " has-fixed-tile" : ""}${placement ? " has-new-tile" : ""}${premium ? ` has-premium is-${premium.toLowerCase()}` : ""}"
          data-board-row="${row}"
          data-board-col="${col}"
          data-premium="${premium}"
        >
          ${tile ? `<span>${tile.letter}</span><small>${tile.score}</small>` : center ? "★" : premium}
        </button>
      `);
    }
  }
  nodes.board.innerHTML = html.join("");
}

function renderRack() {
  if (!nodes.rack) return;
  const me = currentPlayer();
  const usedIds = new Set(state.placements.map((placement) => placement.tileId));
  const rack = orderedRack(me?.rack || []);
  nodes.rack.innerHTML = rack.map((tile) => `
    <button
      type="button"
      class="word-tile${state.selectedTileId === tile.id ? " is-selected" : ""}${state.selectedExchangeIds.has(tile.id) ? " is-exchange" : ""}"
      data-rack-tile="${tile.id}"
      ${usedIds.has(tile.id) ? "disabled" : ""}
    >
      <span>${tile.letter}</span><small>${tile.score}</small>
    </button>
  `).join("");
  if (nodes.exchangeMode) {
    nodes.exchangeMode.textContent = state.exchangeMode ? "Exchange mode: on" : "Mark exchange";
    nodes.exchangeMode.dataset.active = state.exchangeMode ? "true" : "false";
  }
}

function renderHistory() {
  if (!nodes.history) return;
  const history = Array.isArray(state.game?.history) ? state.game.history : [];
  nodes.history.innerHTML = history.length
    ? history.slice().reverse().map((entry) => `<li>${entry.message || ""}</li>`).join("")
    : "<li>No moves yet.</li>";
}

function renderScoreboard() {
  if (!nodes.scoreboard) return;
  nodes.scoreboard.innerHTML = state.players.map((player) => `
    <article class="word-player-card${player.player_index === state.game?.current_player_index ? " is-turn" : ""}${player.is_you ? " is-you" : ""}">
      <p>${player.name}${player.is_you ? " / you" : ""}</p>
      <strong>${player.score}</strong>
      <span>${player.status}${player.rack_count ? ` · ${player.rack_count} tiles` : ""}</span>
    </article>
  `).join("");
}

function renderState(data) {
  state.game = data.game;
  state.players = data.players || [];
  state.code = data.game?.code || state.code;
  if (state.selectedTileId && !tileFromRack(state.selectedTileId)) {
    state.selectedTileId = "";
  }
  state.selectedExchangeIds.forEach((id) => {
    if (!tileFromRack(id)) state.selectedExchangeIds.delete(id);
  });
  if (data.token) {
    state.token = data.token;
    saveToken(state.code, state.token);
  }
  nodes.lobby.hidden = true;
  nodes.table.hidden = false;
  if (nodes.gameCode) nodes.gameCode.textContent = state.code;
  if (nodes.bagCount) nodes.bagCount.textContent = String(state.game?.tile_bag_count || 0);
  if (nodes.gameStatus) {
    const turnPlayer = state.players.find((player) => player.player_index === state.game?.current_player_index);
    nodes.gameStatus.textContent = state.game?.status === "waiting"
      ? `Waiting for ${state.game.max_players - state.players.length} player${state.game.max_players - state.players.length === 1 ? "" : "s"}.`
      : state.game?.status === "finished"
        ? `Game finished. ${state.game.last_action || ""}`
        : `${turnPlayer?.name || "Someone"} to play. ${state.game.last_action || ""}`;
  }
  renderScoreboard();
  renderBoard();
  renderRack();
  renderHistory();
  updatePreview();
}

async function refreshGame(silent = false) {
  if (!state.code || !state.token) return;
  try {
    const data = await api(`/api/play/games/${encodeURIComponent(state.code)}?token=${encodeURIComponent(state.token)}`);
    renderState(data);
    if (!silent) setStatus("");
  } catch (error) {
    if (!silent) setStatus(error.message, "bad");
  }
}

function startPolling() {
  window.clearInterval(state.poll);
  state.poll = window.setInterval(() => refreshGame(true), 3500);
}

document.querySelector("[data-create-game-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  setStatus("Creating game...");
  try {
    const data = await api("/api/play/games", { method: "POST", body: JSON.stringify(payload) });
    renderState(data);
    startPolling();
    const invite = `${window.location.origin}/play?game=${data.game.code}`;
    await navigator.clipboard?.writeText(invite).catch(() => {});
    setStatus("Game created. Invite link copied if the browser allowed it.", "good");
  } catch (error) {
    setStatus(error.message, "bad");
  }
});

document.querySelector("[data-join-game-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  const code = String(payload.code || "").trim().toUpperCase();
  setStatus("Joining game...");
  try {
    const data = await api(`/api/play/games/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: JSON.stringify({ name: payload.name }),
    });
    renderState(data);
    startPolling();
    setStatus("Joined game.", "good");
  } catch (error) {
    setStatus(error.message, "bad");
  }
});

function placeSelectedTile(event) {
  const now = Date.now();
  if (event.type === "click" && now - state.lastBoardTapAt < 350) return;
  state.lastBoardTapAt = now;
  const cell = closestElement(event, "[data-board-row]");
  if (!cell) return;
  event.preventDefault();
  if (state.game?.status === "waiting") {
    return setStatus("Waiting for the other player to join before tiles can be placed.", "bad");
  }
  if (state.game?.status === "finished") {
    return setStatus("This game is finished.", "bad");
  }
  if (!isMyTurn()) {
    return setStatus("Not your turn yet.", "bad");
  }
  const row = Number(cell.dataset.boardRow);
  const col = Number(cell.dataset.boardCol);
  const existingPlacement = placedTileAt(row, col);
  if (existingPlacement) {
    state.placements = state.placements.filter((placement) => placement !== existingPlacement);
    renderBoard();
    renderRack();
    updatePreview();
    return;
  }
  if (!state.selectedTileId) return setStatus("Select a tile from your rack first.", "bad");
  if (state.game?.board?.[boardKey(row, col)]) return setStatus("That square is already occupied.", "bad");
  state.placements.push({ row, col, tileId: state.selectedTileId });
  state.selectedTileId = "";
  renderBoard();
  renderRack();
  updatePreview();
  setStatus("");
}

nodes.board?.addEventListener("click", placeSelectedTile);
nodes.board?.addEventListener("pointerup", placeSelectedTile);

nodes.rack?.addEventListener("click", (event) => {
  const tileButton = closestElement(event, "[data-rack-tile]");
  if (!tileButton) return;
  const id = tileButton.dataset.rackTile;
  if (state.exchangeMode || event.altKey || event.metaKey || event.shiftKey) {
    if (state.selectedExchangeIds.has(id)) state.selectedExchangeIds.delete(id);
    else state.selectedExchangeIds.add(id);
    state.selectedTileId = "";
  } else {
    state.selectedTileId = state.selectedTileId === id ? "" : id;
  }
  renderRack();
});

document.querySelector("[data-exchange-mode]")?.addEventListener("click", () => {
  state.exchangeMode = !state.exchangeMode;
  state.selectedTileId = "";
  renderRack();
  setStatus(state.exchangeMode ? "Tap tiles to mark them for exchange." : "", "neutral");
});

document.querySelector("[data-withdraw]")?.addEventListener("click", () => {
  state.placements = [];
  renderBoard();
  renderRack();
  updatePreview();
});

function moveSelectedTile(direction) {
  const id = state.selectedTileId;
  if (!id) return setStatus("Select a tile first.", "bad");
  const index = state.rackOrder.indexOf(id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= state.rackOrder.length) return;
  [state.rackOrder[index], state.rackOrder[nextIndex]] = [state.rackOrder[nextIndex], state.rackOrder[index]];
  renderRack();
}

document.querySelector("[data-move-left]")?.addEventListener("click", () => moveSelectedTile(-1));
document.querySelector("[data-move-right]")?.addEventListener("click", () => moveSelectedTile(1));

document.querySelector("[data-submit-turn]")?.addEventListener("click", async () => {
  if (!isMyTurn()) return setStatus("Not your turn yet.", "bad");
  setStatus("Submitting turn...");
  try {
    const data = await api(`/api/play/games/${encodeURIComponent(state.code)}/action`, {
      method: "POST",
      body: JSON.stringify({ token: state.token, action: "submit", placements: state.placements }),
    });
    state.placements = [];
    renderState(data);
    setStatus("Turn submitted.", "good");
  } catch (error) {
    setStatus(error.message, "bad");
  }
});

document.querySelector("[data-pass]")?.addEventListener("click", async () => {
  if (!isMyTurn()) return setStatus("Not your turn yet.", "bad");
  if (!window.confirm("Pass and lose this turn?")) return;
  const data = await api(`/api/play/games/${encodeURIComponent(state.code)}/action`, {
    method: "POST",
    body: JSON.stringify({ token: state.token, action: "pass" }),
  });
  state.placements = [];
  renderState(data);
});

document.querySelector("[data-exchange]")?.addEventListener("click", async () => {
  if (!isMyTurn()) return setStatus("Not your turn yet.", "bad");
  const tileIds = [...state.selectedExchangeIds];
  if (!tileIds.length) return setStatus("Tap “Mark exchange”, then tap the tiles you want to swap.", "bad");
  if (!window.confirm(`Exchange ${tileIds.length} tile${tileIds.length === 1 ? "" : "s"} and lose this turn?`)) return;
  const data = await api(`/api/play/games/${encodeURIComponent(state.code)}/action`, {
    method: "POST",
    body: JSON.stringify({ token: state.token, action: "exchange", tileIds }),
  });
  state.selectedExchangeIds.clear();
  state.placements = [];
  renderState(data);
});

document.querySelector("[data-nudge]")?.addEventListener("click", async () => {
  if (!state.code || !state.token) return setStatus("Join a game first.", "bad");
  const now = Date.now();
  if (now - state.lastNudgeAt < 60_000) return setStatus("Give it a minute before nudging again. We are playful, not chaotic.", "bad");
  setStatus("Sending nudge...");
  try {
    state.lastNudgeAt = now;
    const data = await api(`/api/play/games/${encodeURIComponent(state.code)}/action`, {
      method: "POST",
      body: JSON.stringify({ token: state.token, action: "nudge" }),
    });
    renderState(data);
    setStatus("Nudge sent.", "good");
  } catch (error) {
    setStatus(error.message, "bad");
  }
});

document.querySelector("[data-resign]")?.addEventListener("click", async () => {
  if (!window.confirm("Resign this game?")) return;
  const data = await api(`/api/play/games/${encodeURIComponent(state.code)}/action`, {
    method: "POST",
    body: JSON.stringify({ token: state.token, action: "resign" }),
  });
  state.placements = [];
  renderState(data);
});

document.querySelector("[data-copy-invite]")?.addEventListener("click", async () => {
  const invite = `${window.location.origin}/play?game=${state.code}`;
  await navigator.clipboard?.writeText(invite).catch(() => {});
  setStatus(`Invite: ${invite}`, "good");
});

document.querySelector("[data-copy-code]")?.addEventListener("click", async () => {
  await navigator.clipboard?.writeText(state.code).catch(() => {});
  setStatus(`Game code copied: ${state.code}`, "good");
});

document.querySelector("[data-share-invite]")?.addEventListener("click", async () => {
  const invite = `${window.location.origin}/play?game=${state.code}`;
  if (navigator.share) {
    await navigator.share({ title: "Shkeeno Words", text: `Join my Shkeeno Words game: ${state.code}`, url: invite }).catch(() => {});
    return;
  }
  await navigator.clipboard?.writeText(invite).catch(() => {});
  setStatus(`Invite copied: ${invite}`, "good");
});

const params = new URLSearchParams(window.location.search);
const code = String(params.get("game") || "").trim().toUpperCase();
if (code) {
  state.code = code;
  state.token = readToken(code);
  const codeInput = document.querySelector('[data-join-game-form] input[name="code"]');
  if (codeInput) codeInput.value = code;
  if (state.token) {
    refreshGame().then(startPolling).catch((error) => setStatus(error.message, "bad"));
  }
}
