import { rollDice } from "./engine/dice.js";
import { makeGame, phaseLabel, phase, isRoundOver, isGameOver } from "./engine/state.js";
import { applyRoll } from "./engine/rules.js";
import { startTurn, bankActivePlayer, bankOffTurn, bustActivePlayer, maybeAdvanceRound, afterSafeRollPassTurn } from "./engine/turns.js";
import { loadSave, save, clearSave } from "./storage/local.js";

import { makeCode, createGameRow, fetchGameRow, updateGameRow, subscribeToGame } from "./net/games.js";

const $ = (id) => document.getElementById(id);

// setup UI
const landingScreen = $("landingScreen");
const setupScreen = $("setupScreen");
const onlinePanel = $("onlinePanel");
const gameScreen = $("gameScreen");

const brandLink = $("brandLink");
const goLocalBtn = $("goLocalBtn");
const goOnlineBtn = $("goOnlineBtn");
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

let setupPlayers = [];
let game = null;

// online session state
let session = {
  mode: "local",      // "local" | "online"
  code: null,
  version: 0,
  unsubscribe: null,
  playerId: null,
  name: null
};

// prevents double-roll / double-bank while an online update is in flight
let pendingOnlineAction = false;

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


function hideAllScreens(){
  landingScreen.style.display = "none";
  setupScreen.style.display = "none";
  onlinePanel.style.display = "none";
  gameScreen.style.display = "none";
}

function showLanding(){
  hideAllScreens();
  landingScreen.style.display = "block";
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
  if (session.mode !== "online") return true;

  if (pendingOnlineAction) return false;

  const me = session.playerId;
  const activeP = game.players?.[game.activeIdx];
  if (!activeP) return false;
  return activeP.id === me;
}

function canUseActiveBank(){
  if (!game) return false;
  if (session.mode !== "online") return true;
  if (pendingOnlineAction) return false;
  const activeP = game.players?.[game.activeIdx];
  if (!activeP) return false;
  return activeP.id === session.playerId;
}

function canIBankPlayer(player){
  if (!game || !player) return false;
  const idx = findPlayerIndexById(player.id);
  if (idx === -1) return false;
  if (game.roundStatus[idx]?.done) return false;

  if (session.mode !== "online") return true;
  if (pendingOnlineAction) return false;
  return session.playerId === player.id;
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

  startBtn.disabled = setupPlayers.length < 2 || setupPlayers.length > 4;

  const saved = loadSave();
  resumeBtn.style.display = saved ? "inline-block" : "none";
}

function renderGame(){
  if (!game) return;

  // online code display
  if (gameCodeEl) gameCodeEl.textContent = session.mode === "online" ? session.code : "—";

  roundNum.textContent = String(Math.min(game.round, 10));
  turnCount.textContent = String(game.turnCount);
  tally.textContent = String(game.tally);
  phaseText.textContent = phaseLabel(game);

  const ap = game.players[game.activeIdx];
  active.textContent = ap ? ap.name : "—";

  d1.textContent = game.lastRoll ? String(game.lastRoll.d1) : "—";
  d2.textContent = game.lastRoll ? String(game.lastRoll.d2) : "—";

  logEl.innerHTML = (game.log || []).slice(-12).map(line => `<div>${escapeHtml(line)}</div>`).join("");

  const over = isGameOver(game);
  const iCanAct = canIAct();

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

rollBtn.disabled = over || !iCanAct;
bankBtn.disabled = over || !canUseActiveBank();
  nextRoundBtn.disabled = !isRoundOver(game) || over || (session.mode === "online" && !iCanAct);

  // local save only in local mode
  if (session.mode === "local"){
    setSaveStatus(save(game) ? "saved ✓" : "save failed");
  }else{
    setSaveStatus(pendingOnlineAction ? "syncing…" : "online ✓");
  }
}

// ---------- local mode ----------
function startNewLocalGame(players){
  session = { ...session, mode: "local", code: null, version: 0 };
  pendingOnlineAction = false;

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

  session = { ...session, mode: "local", code: null, version: 0 };
  pendingOnlineAction = false;

  game = saved;
  ensurePlayerIds(game);
  game.log = game.log || [];
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

  pendingOnlineAction = false;

  attachOnlineSubscription(code);
  game = g;
  ensurePlayerIds(game);

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

  pendingOnlineAction = false;

  game = row.state;
  ensurePlayerIds(game);
  game.log = game.log || [];
  game.online = { code };

  // if i'm not already in players, try to add me (up to 4)
  const already = (game.players || []).some(p => p.id === playerId);
  if (!already){
    if ((game.players || []).length >= 4){
      game.log.push(`👀 ${name} joined as spectator (room full).`);
    }else{
      const next = structuredClone(game);
      next.players.push({ name, isAI:false, total:0, rounds:[], id: playerId });
      next.roundStatus.push({ done:false, banked:false, busted:false });
      next.log.push(`➕ ${name} joined.`);
      try{
        const updated = await updateGameRow(code, next, row.version);
        game = updated.state;
  ensurePlayerIds(game);
        session.version = updated.version;
      }catch(e){
        console.warn("join update conflict (ok)", e);
      }
    }
  }

  attachOnlineSubscription(code);
  showGame();
  renderGame();
  setOnlineStatus(`joined: ${code}`);
}

function attachOnlineSubscription(code){
  if (session.unsubscribe){
    session.unsubscribe();
    session.unsubscribe = null;
  }

  session.unsubscribe = subscribeToGame(code, (newRow) => {
    if (typeof newRow.version === "number" && newRow.version >= session.version){
      session.version = newRow.version;
      game = newRow.state;
      ensurePlayerIds(game);
      game.log = game.log || [];
      game.online = { code };

      // once we receive the authoritative update, we’re definitely not “pending”
      pendingOnlineAction = false;

      renderGame();
    }
  });
}

async function pushOnlineUpdate(mutatorFn, opts = {}){
  const { requireTurn = true } = opts;
  if (pendingOnlineAction) return;

  pendingOnlineAction = true;
  renderGame(); // disable buttons immediately

  const code = session.code;
  const expectedVersion = session.version;

  const next = structuredClone(game);
  ensurePlayerIds(next);

  if (requireTurn){
    const ap = next.players?.[next.activeIdx];
    if (!ap || ap.id !== session.playerId){
      pendingOnlineAction = false;
      renderGame();
      return;
    }
  }else if (!session.playerId){
    pendingOnlineAction = false;
    renderGame();
    return;
  }

  try{
    mutatorFn(next);

    const updated = await updateGameRow(code, next, expectedVersion);
    session.version = updated.version;
    game = updated.state;
    ensurePlayerIds(game);
    game.online = { code };

    pendingOnlineAction = false;
    renderGame();
  }catch(e){
    console.warn("update failed, refetching", e);
    try{
      const row = await fetchGameRow(code);
      session.version = row.version;
      game = row.state;
      ensurePlayerIds(game);
      game.online = { code };
    } finally {
      pendingOnlineAction = false;
      renderGame();
    }
  }
}

// ---------- gameplay actions ----------
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
    await pushOnlineUpdate((g) => {
      startTurn(g);

      const r = rollDice();
      const res = applyRoll(g, r);
      const who = g.players[g.activeIdx].name;

      if (res.special === "lucky7"){
        g.log.push(`🎲 ${who} rolled 7 → +70. tally = ${g.tally}.`);
        afterSafeRollPassTurn(g);
      }else if (res.special === "bust7"){
        g.log.push(`🎲 ${who} rolled 7 → 💥 bust.`);
        bustActivePlayer(g);
      }else if (res.special === "double"){
        g.log.push(`🎲 ${who} rolled ${r.d1}-${r.d2} (+${r.sum}) → doubles! tally doubled → ${g.tally}.`);
        afterSafeRollPassTurn(g);
      }else{
        g.log.push(`🎲 ${who} rolled ${r.d1}-${r.d2} (+${r.sum}). tally = ${g.tally}.`);
        afterSafeRollPassTurn(g);
      }

      maybeAdvanceRound(g);
    });
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

// ---------- setup handlers ----------
addBtn.addEventListener("click", () => {
  const name = (nameInput.value || "").trim();
  if (!name) return;
  if (setupPlayers.length >= 4) return;

  setupPlayers.push({ name, isAI: aiToggle.checked });
  nameInput.value = "";
  renderSetup();
});
nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addBtn.click(); });

startBtn.addEventListener("click", () => startNewLocalGame(setupPlayers));
resumeBtn.addEventListener("click", () => resumeSaved());

brandLink?.addEventListener("click", (e) => { e.preventDefault?.(); showLanding(); });
goLocalBtn?.addEventListener("click", () => { showSetup(); renderSetup(); });
goOnlineBtn?.addEventListener("click", () => { showOnlinePanel(); setOnlineStatus("enter a name to start"); });
backFromLocal?.addEventListener("click", () => showLanding());
backFromOnline?.addEventListener("click", () => showLanding());

rollBtn.addEventListener("click", onRoll);
bankBtn.addEventListener("click", onBank);
nextRoundBtn.addEventListener("click", onNextRound);

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

newGameBtn.addEventListener("click", () => {
  clearSave();
  if (session.unsubscribe){
    session.unsubscribe();
    session.unsubscribe = null;
  }
  session = { ...session, mode: "local", code: null, version: 0 };
  pendingOnlineAction = false;
  game = null;
  showLanding();
  renderSetup();
});

resetSaveBtn.addEventListener("click", () => {
  clearSave();
  if (session.unsubscribe){
    session.unsubscribe();
    session.unsubscribe = null;
  }
  session = { ...session, mode: "local", code: null, version: 0 };
  pendingOnlineAction = false;
  game = null;
  setupPlayers = [];
  showLanding();
  renderSetup();
});

renderSetup();
setOnlineStatus("");
showLanding();
