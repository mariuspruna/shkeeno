const TILE_SCORES = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
  N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
};

const WORDS = new Set("A I AM AN AS AT BE BY DO GO HE IF IN IS IT ME MY NO OF ON OR OX SO TO UP US WE ACE ACT ADD AGE AGO AID AIR AND ANT ANY APE ARE ARM ART ASH ASK ATE BAD BAG BAR BAT BED BEE BIG BIT BOX BOY BUS CAN CAR CAT COT CUP CUT DAY DID DOG EAR EAT END ERA FAR FIT FLY FOR FOX FUN GET GIRL HAT HER HIM HIS HOT HOW ICE INK JOY KEY LAW LAY LET LIE LIP LOG LOT LOW MAN MAP MAY MIX NET NEW NOW OAK OLD ONE OUR OUT PAN PEN PET PIN RAG RAN RAT RED RUN SAT SAW SAY SEA SEE SET SHE SKY SUN TEA TEN THE TOY TRY TWO USE WAR WAS WAY WHO WHY YES YET ABOUT AFTER AGAIN ALIVE APPLE BOARD BRAND CHAIR CHARM CLEAR CLOTH COLOUR DANCE DREAM DRESS EARTH EIGHT FAITH FIBRE FIELD FIRST FLAME FLAIR FLOOR FLOWER FRAME GRACE GRAPHIC GREEN HEART HOUSE IDEA IMAGE LABEL LIGHT LINES LONDON MAGIC MAKER MOMENT MUSIC NIGHT ORANGE PIECE PLACE PLAIN PLAY POET PRINT QUIET REPAIR RHYTHM ROUND SEWING SHAPE SHIRT SHOE SKIRT SOFT SOUND SPACE STITCH STONE STORY STYLE TABLE TAILOR TEAL THING THREAD TILE TRAIN VALUE WHITE WORDS WORLD ZEBRA BAPTISTA DIANA FASHION SHKEENO DESIGN DESIGNER TEXTILE PATTERN SERVICE SERVICES COLLECTION COLLECTIONS SUSTAIN CHARITY ETHICS".split(" "));

const state = {
  code: "",
  token: "",
  game: null,
  players: [],
  selectedTileId: "",
  selectedExchangeIds: new Set(),
  placements: [],
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
      score: cells.reduce((sum, cell) => sum + Number(cell.tile.score || TILE_SCORES[cell.tile.letter] || 0), 0),
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
      score: sorted.reduce((sum, placement) => sum + Number(tileFromRack(placement.tileId)?.score || 0), 0),
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
      html.push(`
        <button
          type="button"
          class="word-cell${center ? " is-center" : ""}${fixedTile ? " has-fixed-tile" : ""}${placement ? " has-new-tile" : ""}"
          data-board-row="${row}"
          data-board-col="${col}"
        >
          ${tile ? `<span>${tile.letter}</span><small>${tile.score}</small>` : center ? "★" : ""}
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
  const rack = me?.rack || [];
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

nodes.board?.addEventListener("click", (event) => {
  const cell = event.target.closest("[data-board-row]");
  if (!cell || !isMyTurn()) return;
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
  if (!state.selectedTileId) return;
  if (state.game?.board?.[boardKey(row, col)]) return;
  state.placements.push({ row, col, tileId: state.selectedTileId });
  state.selectedTileId = "";
  renderBoard();
  renderRack();
  updatePreview();
});

nodes.rack?.addEventListener("click", (event) => {
  const tileButton = event.target.closest("[data-rack-tile]");
  if (!tileButton) return;
  const id = tileButton.dataset.rackTile;
  if (event.altKey || event.metaKey || event.shiftKey) {
    if (state.selectedExchangeIds.has(id)) state.selectedExchangeIds.delete(id);
    else state.selectedExchangeIds.add(id);
  } else {
    state.selectedTileId = state.selectedTileId === id ? "" : id;
  }
  renderRack();
});

document.querySelector("[data-withdraw]")?.addEventListener("click", () => {
  state.placements = [];
  renderBoard();
  renderRack();
  updatePreview();
});

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
  if (!tileIds.length) return setStatus("Hold Shift and tap tiles to mark them for exchange.", "bad");
  if (!window.confirm(`Exchange ${tileIds.length} tile${tileIds.length === 1 ? "" : "s"} and lose this turn?`)) return;
  const data = await api(`/api/play/games/${encodeURIComponent(state.code)}/action`, {
    method: "POST",
    body: JSON.stringify({ token: state.token, action: "exchange", tileIds }),
  });
  state.selectedExchangeIds.clear();
  state.placements = [];
  renderState(data);
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
