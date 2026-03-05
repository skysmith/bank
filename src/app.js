import { rollDice } from "./engine/dice.js";
import { makeGame, phaseLabel, phase, isRoundOver, isGameOver } from "./engine/state.js";
import { applyRoll } from "./engine/rules.js";
import { startTurn, bankActivePlayer, bankOffTurn, bustActivePlayer, maybeAdvanceRound, afterSafeRollPassTurn } from "./engine/turns.js";
import { loadSave, save, clearSave } from "./storage/local.js";

import { makeCode, createGameRow, fetchGameRow, updateGameRow, rpcGameAction, subscribeToGame } from "./net/games.js";

const $ = (id) => document.getElementById(id);

// setup UI
const gameHub = $("gameHub");
const landingScreen = $("landingScreen");
const voidScreen = $("voidScreen");
const setupScreen = $("setupScreen");
const onlinePanel = $("onlinePanel");
const gameScreen = $("gameScreen");

const brandLink = $("brandLink");
const themeToggle = $("themeToggle");
const enterBankBtn = $("enterBankBtn");
const enterVoidBtn = $("enterVoidBtn");
const enterQwixxBtn = $("enterQwixxBtn");
const goLocalBtn = $("goLocalBtn");
const goOnlineBtn = $("goOnlineBtn");
const backFromBank = $("backFromBank");
const backFromVoid = $("backFromVoid");
const backFromLocal = $("backFromLocal");
const backFromOnline = $("backFromOnline");

const nameInput = $("nameInput");
const addBtn = $("addBtn");
const aiToggle = $("aiToggle");
const playerList = $("playerList");
const startBtn = $("startBtn");
const resumeBtn = $("resumeBtn");

const onlineName = $("onlineName");
const createOnlineBtn = $("createOnlineBtn");
const joinCodeInput = $("joinCodeInput");
const joinOnlineBtn = $("joinOnlineBtn");
const onlineStatus = $("onlineStatus");

const gameCodeEl = $("gameCode");
const copyCodeBtn = $("copyCodeBtn");
const shareCodeBtn = $("shareCodeBtn");
const onlineLobby = $("onlineLobby");
const lobbyHeadline = $("lobbyHeadline");
const lobbyStatus = $("lobbyStatus");
const startOnlineBtn = $("startOnlineBtn");
const spectatorBanner = $("spectatorBanner");
const spectatorText = $("spectatorText");

const roundNum = $("roundNum");
const turnCount = $("turnCount");
const tally = $("tally");
const phaseText = $("phaseText");
const active = $("active");
const d1 = $("d1");
const d2 = $("d2");
const rollBtn = $("rollBtn");
const bankBtn = $("bankBtn");
const nextRoundBtn = $("nextRoundBtn");
const logEl = $("log");
const scoreboard = $("scoreboard");
const saveStatus = $("saveStatus");

const newGameBtn = $("newGameBtn");
const resetSaveBtn = $("resetSaveBtn");

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 20;

let setupPlayers = [];
let game = null;

// online session state
let session = {
  mode: "local",      // "local" | "online"
  code: null,
  version: 0,
  unsubscribe: null,
  playerId: null,
  name: null,
  isSpectator: false
};

// prevents double-roll / double-bank while an online update is in flight
let pendingOnlineAction = false;
let onlineSyncLabel = "online ✓";

const THEME_KEY = 'bank_theme_v1';

function getStoredTheme(){
  return localStorage.getItem(THEME_KEY);
}

function applyTheme(mode){
  const root = document.documentElement;
  const newMode = mode || 'dark';
  root.setAttribute('data-theme', newMode);
  themeToggle?.setAttribute('aria-label', `switch to ${newMode === 'dark' ? 'light' : 'dark'} mode`);
  themeToggle && (themeToggle.textContent = newMode === 'dark' ? '🌗' : '🌙');
}

function initTheme(){
  const stored = getStoredTheme();
  if (stored){
    applyTheme(stored);
  }else{
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(prefersLight ? 'light' : 'dark');
  }
}

// ---------- helpers ----------
const randomId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

function ensurePlayerIds(g){
  if (!g || !Array.isArray(g.players)) return;
  g.players = g.players.map(p => ({ ...p, id: p.id || randomId() }));
}

function findPlayerIndexById(id, g = game){
  if (!g || !Array.isArray(g.players)) return -1;
  return g.players.findIndex(p => p.id === id);
}

function setSaveStatus(txt){ if (saveStatus) saveStatus.textContent = txt; }

function escapeHtml(s){
  return (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
}

function normalizeGame(g){
  if (!g) return g;
  ensurePlayerIds(g);
  g.log = g.log || [];
  g.status = g.status || (g.round > 10 ? "finished" : "active");
  g.hostId = g.hostId || g.players?.[0]?.id || null;
  return g;
}

function isLobby(g = game){
  return !!g && g.status === "lobby";
}

function isActiveGame(g = game){
  return !!g && g.status === "active" && !isGameOver(g);
}

function resetOnlineFlags(label = "online ✓"){
  pendingOnlineAction = false;
  onlineSyncLabel = label;
}

function setSyncState(label){
  onlineSyncLabel = label;
  renderGame();
}

function roomShareText(){
  const base = window.location.origin + window.location.pathname;
  return `Join my Bank Dice game. Code: ${session.code}. Open ${base}?play=bank-online`;
}


function hideAllScreens(){
  if (gameHub) gameHub.style.display = "none";
  landingScreen.style.display = "none";
  voidScreen.style.display = "none";
  setupScreen.style.display = "none";
  onlinePanel.style.display = "none";
  gameScreen.style.display = "none";
}

function bootFromQuery(){
  const params = new URLSearchParams(window.location.search);
  const play = (params.get("play") || "").toLowerCase();

  if (play === "bank"){
    renderSetup();
    showLanding();
    return true;
  }

  if (play === "bank-local"){
    renderSetup();
    showSetup();
    return true;
  }

  if (play === "bank-online"){
    showOnlinePanel();
    setOnlineStatus("enter a name to start");
    return true;
  }

  if (play === "crossdice" || play === "qwixx"){
    window.location.replace("/qwixx/index.html");
    return true;
  }

  return false;
}

function showHub(){
  hideAllScreens();
  if (gameHub) gameHub.style.display = "block";
}

function showLanding(){
  hideAllScreens();
  landingScreen.style.display = "block";
}

function showVoid(){
  hideAllScreens();
  voidScreen.style.display = "block";
}

function showGame(){
  hideAllScreens();
  gameScreen.style.display = "block";
}

function showSetup(){
  hideAllScreens();
  setupScreen.style.display = "block";
}

function showOnlinePanel(){
  hideAllScreens();
  onlinePanel.style.display = "block";
}

function getOrMakePlayerId(){
  const key = "bank_dice_player_id_v1";
  let id = localStorage.getItem(key);
  if (!id){
    id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
    localStorage.setItem(key, id);
  }
  return id;
}

function canIAct(){
  if (!game) return false;
  if (!isActiveGame()) return false;
  if (session.mode !== "online") return true;

  if (pendingOnlineAction) return false;
  if (session.isSpectator) return false;

  const me = session.playerId;
  const activeP = game.players?.[game.activeIdx];
  if (!activeP) return false;
  return activeP.id === me;
}

function canUseActiveBank(){
  if (!game) return false;
  if (!isActiveGame()) return false;
  if (session.mode !== "online") return true;
  if (pendingOnlineAction) return false;
  if (session.isSpectator) return false;
  const activeP = game.players?.[game.activeIdx];
  if (!activeP) return false;
  return activeP.id === session.playerId;
}

function canIBankPlayer(player){
  if (!game || !player) return false;
  if (!isActiveGame()) return false;
  const idx = findPlayerIndexById(player.id);
  if (idx === -1) return false;
  if (game.roundStatus[idx]?.done) return false;

  if (session.mode !== "online") return true;
  if (pendingOnlineAction) return false;
  if (session.isSpectator) return false;
  return session.playerId === player.id;
}

function canStartOnlineGame(){
  if (session.mode !== "online" || !game) return false;
  if (!isLobby()) return false;
  if (pendingOnlineAction) return false;
  if (game.players.length < MIN_PLAYERS) return false;
  return game.hostId === session.playerId;
}

function setOnlineStatus(msg){
  if (onlineStatus) onlineStatus.textContent = msg || "";
}

function normalizeCode(s){
  return (s || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// ---------- rendering ----------
function renderSetup(){
  playerList.innerHTML = "";
  setupPlayers.forEach((p, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(p.name)}</span><span class="muted small">${p.isAI ? "ai" : "human"}</span>`;
    li.addEventListener("click", () => {
      setupPlayers.splice(i, 1);
      renderSetup();
    });
    playerList.appendChild(li);
  });

  startBtn.disabled = setupPlayers.length < MIN_PLAYERS || setupPlayers.length > MAX_PLAYERS;

  const saved = loadSave();
  resumeBtn.style.display = saved ? "inline-block" : "none";
}

function renderGame(){
  if (!game) return;
  normalizeGame(game);

  // online code display
  if (gameCodeEl) gameCodeEl.textContent = session.mode === "online" ? session.code : "—";

  roundNum.textContent = String(Math.min(game.round, 10));
  turnCount.textContent = String(game.turnCount);
  tally.textContent = String(game.tally);
  phaseText.textContent = isLobby() ? "Invite players, then start the room." : phaseLabel(game);

  const ap = game.players[game.activeIdx];
  active.textContent = isLobby() ? "waiting" : (ap ? ap.name : "—");

  d1.textContent = game.lastRoll ? String(game.lastRoll.d1) : "—";
  d2.textContent = game.lastRoll ? String(game.lastRoll.d2) : "—";

  logEl.innerHTML = (game.log || []).slice(-12).map(line => `<div>${escapeHtml(line)}</div>`).join("");

  const over = isGameOver(game);
  const lobby = isLobby();
  const iCanAct = canIAct();
  const roomStatus = session.mode === "online"
    ? (lobby ? "lobby" : over ? "finished" : "live")
    : "local";

  if (onlineLobby){
    onlineLobby.style.display = session.mode === "online" && lobby ? "flex" : "none";
  }
  if (copyCodeBtn){
    copyCodeBtn.style.display = session.mode === "online" ? "inline-flex" : "none";
  }
  if (shareCodeBtn){
    shareCodeBtn.style.display = session.mode === "online" ? "inline-flex" : "none";
  }
  if (lobbyHeadline){
    lobbyHeadline.textContent = game.players.length < MIN_PLAYERS
      ? `waiting for ${MIN_PLAYERS - game.players.length} more player${MIN_PLAYERS - game.players.length === 1 ? "" : "s"}`
      : "ready to start";
  }
  if (lobbyStatus){
    lobbyStatus.textContent = canStartOnlineGame()
      ? "Everyone is in. Start the game when the room is ready."
      : `Players joined: ${game.players.length}. Share the code and wait for the host.`;
  }
  if (startOnlineBtn){
    startOnlineBtn.disabled = !canStartOnlineGame();
  }

  if (spectatorBanner){
    spectatorBanner.style.display = session.mode === "online" && session.isSpectator ? "flex" : "none";
  }
  if (spectatorText){
    spectatorText.textContent = lobby
      ? "You are watching the lobby. Only seated players can start."
      : "This game already started before you joined. Watch this round, then create a new room for the next game.";
  }

  scoreboard.innerHTML = "";
  game.players.forEach((p, idx) => {
    const card = document.createElement("div");
    card.className = "scorecard";

    const status = game.roundStatus[idx];
    const statusTxt = status.done ? (status.busted ? "busted" : "banked") : "playing";
    const activeMark = idx === game.activeIdx ? " ←" : "";

    card.innerHTML = `
      <div class="score-top">
        <div><strong>${escapeHtml(p.name)}</strong>${activeMark}</div>
        <div class="muted small">${statusTxt}${p.isAI ? " · ai" : ""}</div>
      </div>
      <div class="row space-between" style="margin-top:8px;">
        <div class="muted small">total</div>
        <div><strong>${p.total}</strong></div>
      </div>
    `;

    if (!status.done && !over){
      const bankNow = document.createElement("button");
      bankNow.textContent = "Bank now";
      bankNow.className = "bank-btn";
      bankNow.disabled = !canIBankPlayer(p);
      bankNow.addEventListener("click", () => requestBankForPlayer(p.id));
      card.appendChild(bankNow);
    }

    scoreboard.appendChild(card);
  });

  rollBtn.disabled = over || lobby || !iCanAct;
  bankBtn.disabled = over || lobby || !canUseActiveBank();
  nextRoundBtn.disabled = lobby || !isRoundOver(game) || over || (session.mode === "online" && !iCanAct);

  // local save only in local mode
  if (session.mode === "local"){
    setSaveStatus(save(game) ? "saved ✓" : "save failed");
  }else{
    setSaveStatus(pendingOnlineAction ? "syncing…" : `${onlineSyncLabel} · ${roomStatus}`);
  }
}

// ---------- local mode ----------
function startNewLocalGame(players){
  session = { ...session, mode: "local", code: null, version: 0, isSpectator: false };
  resetOnlineFlags();

  game = makeGame(players);
  ensurePlayerIds(game);
  game.log.push("🟩 game started.");
  showGame();
  renderGame();
  tickAI();
}

function resumeSaved(){
  const saved = loadSave();
  if (!saved) return;

  session = { ...session, mode: "local", code: null, version: 0, isSpectator: false };
  resetOnlineFlags();

  game = normalizeGame(saved);
  showGame();
  renderGame();
  tickAI();
}

// ---------- online mode ----------
async function createOnlineGame(){
  const name = (onlineName.value || "").trim();
  if (!name){
    setOnlineStatus("add your name first");
    return;
  }

  const code = makeCode(6);
  const playerId = getOrMakePlayerId();

  // create initial game state with exactly 1 player (host)
  const g = makeGame([{ name, isAI: false }]);
  g.status = "lobby";
  g.hostId = playerId;
  g.players = [{ ...g.players[0], id: playerId }]; // pin host id
  g.log.push("🟩 online game created.");
  g.online = { code };

  await createGameRow(code, g);

  // switch app to online
  session.mode = "online";
  session.code = code;
  session.version = 0;
  session.playerId = playerId;
  session.name = name;
  session.isSpectator = false;

  resetOnlineFlags();

  attachOnlineSubscription(code);
  game = normalizeGame(g);

  showGame();
  renderGame();
  setOnlineStatus(`created: ${code}`);
}

async function joinOnlineGame(){
  const name = (onlineName.value || "").trim();
  if (!name){
    setOnlineStatus("add your name first");
    return;
  }

  const code = normalizeCode(joinCodeInput.value);
  if (!code){
    setOnlineStatus("enter a code");
    return;
  }

  const playerId = getOrMakePlayerId();
  const row = await fetchGameRow(code);

  // hydrate
  session.mode = "online";
  session.code = code;
  session.version = row.version;
  session.playerId = playerId;
  session.name = name;
  session.isSpectator = false;

  resetOnlineFlags();

  game = normalizeGame(row.state);
  game.online = { code };

  // if i'm not already in players, try to add me (up to MAX_PLAYERS)
  const already = (game.players || []).some(p => p.id === playerId);
  if (!already){
    if (game.status !== "lobby" || (game.players || []).length >= MAX_PLAYERS){
      session.isSpectator = true;
      onlineSyncLabel = "spectating";
    }else{
      const next = structuredClone(game);
      next.players.push({ name, isAI:false, total:0, rounds:[], id: playerId });
      next.roundStatus.push({ done:false, banked:false, busted:false });
      next.log.push(`➕ ${name} joined.`);
      try{
        const updated = await updateGameRow(code, next, row.version);
        game = normalizeGame(updated.state);
        session.version = updated.version;
      }catch(e){
        console.warn("join update conflict (ok)", e);
        const fresh = await fetchGameRow(code);
        session.version = fresh.version;
        game = normalizeGame(fresh.state);
        session.isSpectator = !(game.players || []).some(p => p.id === playerId);
        onlineSyncLabel = session.isSpectator ? "spectating" : "online ✓";
      }
    }
  }

  attachOnlineSubscription(code);
  showGame();
  renderGame();
  setOnlineStatus(`joined: ${code}`);
}

async function hydrateOnlineState(code, { reconnect = false, silent = false } = {}){
  if (!code) return;
  if (!silent) onlineSyncLabel = reconnect ? "reconnecting…" : "syncing…";
  try{
    const row = await fetchGameRow(code);
    session.version = row.version;
    game = normalizeGame(row.state);
    game.online = { code };
    session.isSpectator = !(game.players || []).some(p => p.id === session.playerId);
    onlineSyncLabel = session.isSpectator ? "spectating" : "online ✓";
    if (reconnect) attachOnlineSubscription(code);
    renderGame();
  }catch(e){
    console.warn("online refresh failed", e);
    onlineSyncLabel = "offline?";
    renderGame();
  }
}

function attachOnlineSubscription(code){
  if (session.unsubscribe){
    session.unsubscribe();
    session.unsubscribe = null;
  }

  session.unsubscribe = subscribeToGame(code, (newRow) => {
    if (typeof newRow.version === "number" && newRow.version >= session.version){
      session.version = newRow.version;
      game = normalizeGame(newRow.state);
      game.online = { code };
      session.isSpectator = !(game.players || []).some(p => p.id === session.playerId);

      // once we receive the authoritative update, we’re definitely not “pending”
      resetOnlineFlags(session.isSpectator ? "spectating" : "online ✓");

      renderGame();
    }
  }, (status) => {
    if (status === "SUBSCRIBED"){
      setSyncState(session.isSpectator ? "spectating" : "online ✓");
    }else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED"){
      setSyncState("reconnecting…");
    }
  });
}

async function pushOnlineUpdate(mutatorFn, opts = {}){
  const { requireTurn = true } = opts;
  if (pendingOnlineAction) return;

  pendingOnlineAction = true;
  onlineSyncLabel = "syncing…";
  renderGame(); // disable buttons immediately

  const code = session.code;
  const expectedVersion = session.version;

  const next = structuredClone(game);
  normalizeGame(next);

  if (requireTurn){
    const ap = next.players?.[next.activeIdx];
    if (!ap || ap.id !== session.playerId){
      resetOnlineFlags(session.isSpectator ? "spectating" : "online ✓");
      renderGame();
      return;
    }
  }else if (!session.playerId){
    resetOnlineFlags(session.isSpectator ? "spectating" : "online ✓");
    renderGame();
    return;
  }

  try{
    mutatorFn(next);

    const updated = await updateGameRow(code, next, expectedVersion);
    session.version = updated.version;
    game = normalizeGame(updated.state);
    game.online = { code };

    resetOnlineFlags(session.isSpectator ? "spectating" : "online ✓");
    renderGame();
  }catch(e){
    console.warn("update failed, refetching", e);
    resetOnlineFlags("syncing…");
    await hydrateOnlineState(code, { silent: true });
  }
}

// ---------- gameplay actions ----------
async function pushServerRoll(){
  if (pendingOnlineAction) return;
  pendingOnlineAction = true;
  onlineSyncLabel = "rolling…";
  renderGame();

  try{
    const result = await rpcGameAction("bank_roll_turn", {
      p_code: session.code,
      p_player_id: session.playerId,
      p_expected_version: session.version
    });
    const updated = Array.isArray(result) ? result[0] : result;
    if (!updated) throw new Error("Server roll failed.");
    session.version = updated.version;
    game = normalizeGame(updated.state);
    game.online = { code: session.code };
    session.isSpectator = !(game.players || []).some(p => p.id === session.playerId);
    resetOnlineFlags(session.isSpectator ? "spectating" : "verified roll ✓");
    renderGame();
  }catch(e){
    console.warn("verified roll failed", e);
    resetOnlineFlags("verified roll unavailable");
    await hydrateOnlineState(session.code, { silent: true });
    setOnlineStatus(`roll failed: ${e.message || e}`);
  }
}

function localRoll(){
  startTurn(game);

  const r = rollDice();
  const res = applyRoll(game, r);
  const who = game.players[game.activeIdx].name;

  if (res.special === "lucky7"){
    game.log.push(`🎲 ${who} rolled 7 → +70. tally = ${game.tally}.`);
    afterSafeRollPassTurn(game);
  }else if (res.special === "bust7"){
    game.log.push(`🎲 ${who} rolled 7 → 💥 bust.`);
    bustActivePlayer(game);
  }else if (res.special === "double"){
    game.log.push(`🎲 ${who} rolled ${r.d1}-${r.d2} (+${r.sum}) → doubles! tally doubled → ${game.tally}.`);
    afterSafeRollPassTurn(game);
  }else{
    game.log.push(`🎲 ${who} rolled ${r.d1}-${r.d2} (+${r.sum}). tally = ${game.tally}.`);
    afterSafeRollPassTurn(game);
  }

  maybeAdvanceRound(game);
}

async function requestBankForPlayer(playerId, { requireActive = false } = {}){
  if (!game || isGameOver(game)) return;
  ensurePlayerIds(game);
  const idx = findPlayerIndexById(playerId);
  if (idx === -1) return;
  const status = game.roundStatus[idx];
  if (!status || status.done) return;

  if (requireActive && idx !== game.activeIdx) return;

  const isActive = idx === game.activeIdx;

  if (session.mode === "online"){
    if (!session.playerId || session.playerId !== playerId) return;
    if (pendingOnlineAction) return;

    await pushOnlineUpdate((g) => {
      ensurePlayerIds(g);
      const gi = findPlayerIndexById(playerId, g);
      if (gi === -1) return;
      const gst = g.roundStatus[gi];
      if (!gst || gst.done) return;

      if (gi === g.activeIdx){
        bankActivePlayer(g);
      }else{
        bankOffTurn(g, gi);
      }
      maybeAdvanceRound(g);
    }, { requireTurn: isActive });
  }else{
    if (isActive){
      bankActivePlayer(game);
    }else{
      bankOffTurn(game, idx);
    }
    maybeAdvanceRound(game);
    renderGame();
    tickAI();
  }
}

async function onRoll(){
  if (!game || isGameOver(game)) return;
  if (!canIAct()) return;

  if (session.mode === "online"){
    await pushServerRoll();
  }else{
    localRoll();
    renderGame();
    tickAI();
  }
}

async function onBank(){
  if (!game || isGameOver(game)) return;
  const activePlayer = game.players[game.activeIdx];
  if (!activePlayer) return;
  await requestBankForPlayer(activePlayer.id, { requireActive: true });
}

async function onNextRound(){
  if (!game) return;
  if (isLobby()){
    if (canStartOnlineGame()) await onStartOnlineGame();
    return;
  }
  if (!isRoundOver(game)) return;
  if (session.mode === "online" && !canIAct()) return;

  if (session.mode === "online"){
    await pushOnlineUpdate((g) => {
      maybeAdvanceRound(g);
    });
  }else{
    maybeAdvanceRound(game);
    renderGame();
    tickAI();
  }
}

async function onStartOnlineGame(){
  if (!game || !canStartOnlineGame()) return;
  await pushOnlineUpdate((g) => {
    if (g.status !== "lobby") return;
    g.status = "active";
    g.hostId = g.hostId || session.playerId;
    g.log.push(`🚀 ${g.players.length} players ready. game started.`);
  }, { requireTurn: false });
}

// AI is local-only for now
function tickAI(){
  if (!game || isGameOver(game)) return;
  if (session.mode === "online") return;

  const idx = game.activeIdx;
  const p = game.players[idx];
  const status = game.roundStatus[idx];
  if (!p || !p.isAI || status.done) return;

  const ph = phase(game);
  const shouldBank = (ph === "late" && game.tally >= 70);

  setTimeout(() => {
    if (!game || isGameOver(game)) return;
    if (game.activeIdx !== idx) return;
    if (game.roundStatus[idx].done) return;

    if (shouldBank) onBank();
    else onRoll();
  }, 550);
}

function resetSessionToLocal({ clearPlayers = false } = {}){
  if (session.unsubscribe){
    session.unsubscribe();
    session.unsubscribe = null;
  }

  session = {
    ...session,
    mode: "local",
    code: null,
    version: 0,
    name: null,
    isSpectator: false
  };
  resetOnlineFlags();
  game = null;
  if (clearPlayers) setupPlayers = [];
}

function installOnlineResync(){
  const refresh = () => {
    if (session.mode !== "online" || !session.code) return;
    hydrateOnlineState(session.code, { reconnect: true });
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
  window.addEventListener("pageshow", refresh);
  window.addEventListener("online", refresh);
}

// ---------- setup handlers ----------
addBtn.addEventListener("click", () => {
  const name = (nameInput.value || "").trim();
  if (!name) return;
  if (setupPlayers.length >= MAX_PLAYERS) return;

  setupPlayers.push({ name, isAI: aiToggle.checked });
  nameInput.value = "";
  renderSetup();
});
nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addBtn.click(); });
onlineName?.addEventListener("keydown", (e) => { if (e.key === "Enter") createOnlineBtn.click(); });
joinCodeInput?.addEventListener("input", () => {
  joinCodeInput.value = normalizeCode(joinCodeInput.value).slice(0, 6);
});
joinCodeInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") joinOnlineBtn.click(); });

startBtn.addEventListener("click", () => startNewLocalGame(setupPlayers));
resumeBtn.addEventListener("click", () => resumeSaved());

themeToggle?.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});

brandLink?.addEventListener("click", (e) => { e.preventDefault?.(); showHub(); });
enterBankBtn?.addEventListener("click", () => { renderSetup(); showLanding(); });
enterVoidBtn?.addEventListener("click", () => { showVoid(); });
enterQwixxBtn?.addEventListener("click", () => { window.open("/qwixx/index.html", "_blank", "noopener"); });
goLocalBtn?.addEventListener("click", () => { showSetup(); renderSetup(); });
goOnlineBtn?.addEventListener("click", () => { showOnlinePanel(); setOnlineStatus("enter a name to start"); });
backFromBank?.addEventListener("click", () => showHub());
backFromVoid?.addEventListener("click", () => showHub());
backFromLocal?.addEventListener("click", () => showLanding());
backFromOnline?.addEventListener("click", () => showLanding());

rollBtn.addEventListener("click", onRoll);
bankBtn.addEventListener("click", onBank);
nextRoundBtn.addEventListener("click", onNextRound);
startOnlineBtn?.addEventListener("click", onStartOnlineGame);

createOnlineBtn.addEventListener("click", async () => {
  try{
    setOnlineStatus("creating…");
    await createOnlineGame();
  }catch(e){
    console.error(e);
    setOnlineStatus(`create failed: ${e.message || e}`);
  }
});

joinOnlineBtn.addEventListener("click", async () => {
  try{
    setOnlineStatus("joining…");
    await joinOnlineGame();
  }catch(e){
    console.error(e);
    setOnlineStatus(`join failed: ${e.message || e}`);
  }
});

copyCodeBtn?.addEventListener("click", async () => {
  if (session.mode !== "online" || !session.code) return;
  try{
    await navigator.clipboard.writeText(session.code);
    setSaveStatus("copied ✓");
    setTimeout(() => renderGame(), 600);
  }catch{
    // ignore
  }
});

shareCodeBtn?.addEventListener("click", async () => {
  if (session.mode !== "online" || !session.code) return;
  const shareData = {
    title: "Bank Dice",
    text: roomShareText()
  };
  try{
    if (navigator.share){
      await navigator.share(shareData);
      setSaveStatus("shared ✓");
    }else if (navigator.clipboard){
      await navigator.clipboard.writeText(shareData.text);
      setSaveStatus("invite copied ✓");
    }
    setTimeout(() => renderGame(), 800);
  }catch{
    renderGame();
  }
});

newGameBtn.addEventListener("click", () => {
  clearSave();
  resetSessionToLocal();
  showHub();
  renderSetup();
});

resetSaveBtn.addEventListener("click", () => {
  clearSave();
  resetSessionToLocal({ clearPlayers: true });
  showHub();
  renderSetup();
});

initTheme();
renderSetup();
installOnlineResync();
setOnlineStatus("");
if (!bootFromQuery()){
  showHub();
}
