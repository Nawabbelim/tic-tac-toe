/* =====================================================================
   TIC-TAC-TOE ULTIMATE: script.js
   Sections:
   0  Firebase + helpers          5  Computer player (easy/normal/hard)
   1  Profile (name + picture)    6  Offline game flow
   2  Wallet + rupee notes        7  Online: rooms, bargaining, payout
   3  Game rules (pure functions) 8  Chat + emoji reactions
   4  Drawing the board           9  Buttons / start-up
   ===================================================================== */

/* ---------- 0. FIREBASE + HELPERS ---------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  push,
  onValue,
  onChildAdded,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

// Your same Firebase project as before
const firebaseConfig = {
  apiKey: "AIzaSyCm9lvKkghX4vNuCn1FyXA_ZQB08uZlGQU",
  authDomain: "tic-tac-toe-byn.firebaseapp.com",
  databaseURL:
    "https://tic-tac-toe-byn-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tic-tac-toe-byn",
  storageBucket: "tic-tac-toe-byn.firebasestorage.app",
  messagingSenderId: "898321852621",
  appId: "1:898321852621:web:5066d0de97605c7e9be184",
};
const db = getDatabase(initializeApp(firebaseConfig));

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
// show/hide an element using the .hide CSS class
const show = (sel, on = true) => $(sel).classList.toggle("hide", !on);

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

// Falling money emoji for celebrations
function rain(emoji = "💸") {
  for (let i = 0; i < 24; i++) {
    const s = document.createElement("span");
    s.textContent = emoji;
    s.style.cssText = `left:${Math.random() * 100}vw;animation-delay:${Math.random() * 0.9}s;font-size:${20 + Math.random() * 26}px`;
    $("#rain").appendChild(s);
    setTimeout(() => s.remove(), 3500);
  }
}

/* ---------- 1. PROFILE ---------- */
const AVATARS = [
  "😎",
  "🦁",
  "🐯",
  "🦊",
  "🐼",
  "🐵",
  "🦄",
  "🐲",
  "🤖",
  "👽",
  "🧙",
  "🥷",
  "👑",
  "🔥",
  "⚡",
  "🌸",
  "🍕",
  "🚀",
  "🎯",
  "🏏",
  "🐘",
  "🦚",
  "🪁",
  "🎭",
];

let profile = {
  name: localStorage.getItem("ttt_name") || "Player 1",
  avatar: localStorage.getItem("ttt_avatar") || "😎",
};

// An avatar is either an emoji or an uploaded photo stored as a "data:" URL
function paintAvatar(el, av) {
  if (String(av).startsWith("data:")) {
    el.textContent = "";
    el.style.backgroundImage = `url(${av})`;
    el.classList.add("photo");
  } else {
    el.style.backgroundImage = "";
    el.classList.remove("photo");
    el.textContent = av;
  }
}

function saveProfile() {
  localStorage.setItem("ttt_name", profile.name);
  try {
    localStorage.setItem("ttt_avatar", profile.avatar);
  } catch {
    toast("Photo too big to save");
  }
  paintAvatar($("#avatarBtn"), profile.avatar);
}

// Shrinks the chosen photo to 96x96 so it is tiny to store and send online
function handlePhoto(file) {
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = c.height = 96;
    const side = Math.min(img.width, img.height);
    c.getContext("2d").drawImage(
      img,
      (img.width - side) / 2,
      (img.height - side) / 2,
      side,
      side,
      0,
      0,
      96,
      96,
    );
    profile.avatar = c.toDataURL("image/jpeg", 0.7);
    saveProfile();
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(file);
}

/* ---------- 2. WALLET + RUPEE NOTES ---------- */
// [note value, colour]. Notes are shown biggest first (greedy change-making).
const NOTES = [
  [500, "#6b7280"],
  [200, "#f59e0b"],
  [100, "#8b5cf6"],
  [50, "#06b6d4"],
  [20, "#84cc16"],
  [10, "#a16207"],
  [5, "#d97706"],
  [2, "#94a3b8"],
  [1, "#eab308"],
];

const BAL_KEY = "ticTacToeBalance"; // same key as your old code, so saved balances carry over
let wallet =
  localStorage.getItem(BAL_KEY) === null
    ? 500
    : Number(localStorage.getItem(BAL_KEY));
if (!Number.isFinite(wallet) || wallet < 0) wallet = 500;

// Turns a number into a bundle of notes. 640 -> 500 + 100 + 20 + 20. 10 -> one ₹10 note.
function notesHTML(amount) {
  let left = amount,
    i = 0,
    html = "";
  for (const [value, colour] of NOTES) {
    const count = Math.floor(left / value);
    left -= count * value;
    if (!count) continue;
    html += `<div class="rn ${value < 10 ? "coin" : ""} ${count > 1 ? "stk" : ""}" style="--c:${colour};--i:${i++}">₹${value}${count > 1 ? `<b>×${count}</b>` : ""}</div>`;
  }
  return (
    html || `<p class="empty">No notes left 😢<br>Win offline to earn ₹50</p>`
  );
}

// Smoothly counts the number up/down so changes feel alive
let shownBalance = 0;
function countTo(el, to) {
  const from = shownBalance,
    t0 = performance.now();
  shownBalance = to;
  (function step(t) {
    const p = Math.min(1, (t - t0) / 700);
    el.textContent = Math.round(from + (to - from) * p).toLocaleString("en-IN");
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}

function renderWallet() {
  $("#homeNotes").innerHTML = notesHTML(wallet);
  countTo($("#homeBalance"), wallet);
  $("#miniBalance").textContent = wallet.toLocaleString("en-IN");
}

// The ONE place the balance changes. Saves it and tells the online room.
function setWallet(n) {
  wallet = Math.max(0, Math.floor(n));
  localStorage.setItem(BAL_KEY, wallet);
  renderWallet();
  if (room && me)
    set(ref(db, `rooms/${room}/players/${me}/balance`), wallet).catch(() => {});
}

/* ---------- 3. GAME RULES (pure functions, no screen code) ----------
   A "state" is a small object:
     cells : 81 characters. "." empty, or X / O.  Position = board*9 + cell (both 0-8)
     main  : 9 characters, result of each small board: "." open, X, O, or D (full, nobody won)
     cur   : whose turn ("X" or "O")
     next  : which board must be played next (0-8), or -1 for "anywhere"
     over / winner : game finished? who won ("" = draw)
   States are never edited; applyMove returns a NEW one. That makes the
   computer's "what if" thinking and Firebase saving very simple. */
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

// np = number of players (2 or 3). Seats are X, O and (3-player only) N.
const ORDER = ["X", "O", "N"];
const newState = (np = 2) => ({
  cells: ".".repeat(81),
  main: ".".repeat(9),
  cur: "X",
  next: -1,
  over: false,
  winner: "",
  np,
});

// Result of one small board: "X", "O", "D" (full, no winner) or "" (still open)
function localResult(cells, b) {
  const p = cells.slice(b * 9, b * 9 + 9);
  for (const [a, c, d] of LINES)
    if (p[a] !== "." && p[a] === p[c] && p[a] === p[d]) return p[a];
  return p.includes(".") ? "" : "D";
}

// All moves the current player may make, as [board, cell] pairs
function legalMoves(s) {
  if (s.over) return [];
  const forced = s.next >= 0 && s.main[s.next] === ".";
  const boards = forced ? [s.next] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const out = [];
  for (const b of boards) {
    if (s.main[b] !== ".") continue;
    for (let c = 0; c < 9; c++)
      if (s.cells[b * 9 + c] === ".") out.push([b, c]);
  }
  return out;
}

function applyMove(s, b, c) {
  const i = b * 9 + c;
  const cells = s.cells.slice(0, i) + s.cur + s.cells.slice(i + 1);
  let main = s.main;
  const r = localResult(cells, b);
  if (r) main = main.slice(0, b) + r + main.slice(b + 1);
  let winner = "";
  for (const [x, y, z] of LINES) {
    if (
      main[x] !== "." &&
      main[x] !== "D" &&
      main[x] === main[y] &&
      main[x] === main[z]
    ) {
      winner = main[x];
      break;
    }
  }
  return {
    cells,
    main,
    cur: ORDER[(ORDER.indexOf(s.cur) + 1) % s.np], // turn order X -> O -> (N) -> X
    np: s.np,
    next: main[c] === "." ? c : -1, // sent to board "c", unless it is already finished
    over: !!winner || !main.includes("."), // someone won, or every board is finished
    winner,
  };
}

/* ---------- 4. DRAWING THE BOARD ---------- */
let state = newState();
let mode = "home"; // "home" | "offline" | "online"
let thinking = false; // computer is "thinking"
let difficulty = "normal";
let chosenNp = 2; // 2 or 3 players (set by the toggle buttons)
let gameId = 0; // changes on every new game so old timers get ignored

function buildBoard() {
  $("#boxes").innerHTML = Array.from(
    { length: 9 },
    (_, b) =>
      `<div class="box" data-b="${b}">${Array.from(
        { length: 9 },
        (_, c) =>
          `<button class="cell" data-c="${c}" aria-label="Board ${b + 1}, cell ${c + 1}"></button>`,
      ).join("")}</div>`,
  ).join("");
}

function canPlay() {
  if (state.over) return false;
  if (mode === "offline") return state.cur === "X" && !thinking; // you are always X
  return mode === "online" && status === "playing" && state.cur === me;
}

function resultText() {
  const s = state,
    P = curRoom?.players || {};
  if (s.over) {
    if (!s.winner) return "🤝 It's a draw!";
    const nm =
      mode === "offline"
        ? s.winner === "X"
          ? profile.name
          : s.winner === "O"
            ? "Computer"
            : "Computer 2"
        : P[s.winner]?.name || s.winner;
    return `🏆 ${nm} (${s.winner}) wins!`;
  }
  if (mode === "offline")
    return thinking ? "🤖 Computer is thinking…" : "Your turn";
  if (status !== "playing") return "";
  return s.cur === me ? "Your turn" : `${P[s.cur]?.name || "Opponent"}'s turn`;
}

function render() {
  const s = state;
  const legal = new Set(
    canPlay() ? legalMoves(s).map(([b, c]) => b * 9 + c) : [],
  );

  $$(".box").forEach((box) => {
    const b = +box.dataset.b,
      m = s.main[b];
    box.className =
      "box" +
      (m === "."
        ? ""
        : m === "D"
          ? " won won-d"
          : " won won-" + m.toLowerCase()) +
      (!s.over && s.next === b && m === "." ? " active" : "");
    box.dataset.w = m === "." ? "" : m === "D" ? "=" : m; // big letter drawn over won boards
    box.querySelectorAll(".cell").forEach((cell) => {
      const i = b * 9 + +cell.dataset.c,
        v = s.cells[i],
        t = v === "." ? "" : v,
        was = cell.textContent;
      cell.textContent = t;
      cell.className =
        "cell" +
        (t === "X"
          ? " mark-x"
          : t === "O"
            ? " mark-o"
            : t === "N"
              ? " mark-n"
              : "") +
        (legal.has(i) ? " legal" : "") +
        (t && t !== was ? " pop" : "");
      cell.disabled = !legal.has(i);
    });
  });

  $("#playerX").classList.toggle("active", !s.over && s.cur === "X");
  $("#playerO").classList.toggle("active", !s.over && s.cur === "O");
  $("#playerN").classList.toggle("active", !s.over && s.cur === "N");
  $("#playerN").classList.toggle("hide", s.np !== 3); // third card only in 3-player games
  $("#result").textContent = resultText();
  $("#playAgain").classList.toggle(
    "hide",
    !(s.over && (mode === "offline" || status === "playing")),
  );

  // pot display
  const pot = $("#potBar");
  if (mode === "online" && curRoom?.bet && status === "playing") {
    pot.textContent = `🏆 Pot: ₹${curRoom.bet.amount * state.np}  (₹${curRoom.bet.amount} each)`;
    pot.classList.remove("hide");
  } else pot.classList.add("hide");
}

$("#boxes").addEventListener("click", (e) => {
  const cell = e.target.closest(".cell");
  if (!cell || !canPlay()) return;
  const b = +cell.parentElement.dataset.b,
    c = +cell.dataset.c;
  if (legalMoves(state).some((m) => m[0] === b && m[1] === c)) play(b, c);
});

function paintPlayer(p, d) {
  const el = $("#player" + p);
  paintAvatar(el.querySelector(".av"), d.avatar || "👤");
  el.querySelector(".pn").textContent =
    (d.name || "Player") + (p === me && mode === "online" ? " (you)" : "");
  el.querySelector(".pb").textContent =
    d.balance != null ? "₹" + d.balance : "";
}

function screen(which, m) {
  mode = m;
  document.body.dataset.mode = m;
  document.body.dataset.stage = "";
  show("#homeScreen", which === "home");
  $("#gameScreen").classList.toggle("active", which === "game");
}

/* ---------- 5. COMPUTER PLAYER ----------
   Works for 2 or 3 players: the computer plays every seat except X (you).
   easy   : any legal move at random
   normal : simple rules (win game > win board > block > don't gift the next player)
   hard   : "minimax" search a few moves deep with a scoring function */
const wouldWin = (cells, b, c, p) => {
  const i = b * 9 + c;
  return localResult(cells.slice(0, i) + p + cells.slice(i + 1), b) === p;
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const opponents = (s) => ORDER.slice(0, s.np).filter((p) => p !== s.cur);

function chooseMove(s, diff) {
  const moves = legalMoves(s);
  if (!moves.length) return null;
  if (diff === "easy") return pick(moves);

  const meP = s.cur,
    opps = opponents(s);

  if (diff === "normal") {
    let best = [],
      bestScore = -Infinity;
    for (const m of moves) {
      const n = applyMove(s, m[0], m[1]);
      let sc = Math.random() * 5; // tiny randomness so it isn't robotic
      if (n.winner === meP) sc += 1000; // wins the whole game
      if (n.main[m[0]] === meP) sc += 100; // wins a small board
      if (opps.some((o) => wouldWin(s.cells, m[0], m[1], o))) sc += 60; // blocks an opponent's board
      if (!n.over) {
        const next = legalMoves(n).map((o) => applyMove(n, o[0], o[1])); // what the next player could do
        if (next.some((r) => r.winner === n.cur))
          sc -= 500; // don't hand them the game
        else if (next.some((r, k) => r.main[legalMoves(n)[k][0]] === n.cur))
          sc -= 40; // or a board
      }
      if (sc > bestScore) {
        bestScore = sc;
        best = [m];
      } else if (sc === bestScore) best.push(m);
    }
    return pick(best);
  }

  // HARD: try every move, imagine the replies, keep the best
  const depth = (s.np === 3 ? 3 : 4) - (moves.length > 20 ? 1 : 0);
  let best = [],
    bestScore = -Infinity;
  for (const m of moves) {
    const v = search(
      applyMove(s, m[0], m[1]),
      depth - 1,
      -Infinity,
      Infinity,
      meP,
    );
    if (v > bestScore) {
      bestScore = v;
      best = [m];
    } else if (v === bestScore) best.push(m);
  }
  return pick(best);
}

// Minimax with alpha-beta pruning. Every other player is assumed to play against the computer.
function search(s, d, alpha, beta, meP) {
  if (s.over) return s.winner === meP ? 1e5 + d : s.winner ? -1e5 - d : 0; // sooner win = better
  if (d === 0) return evaluate(s, meP);
  const isMax = s.cur === meP;
  let best = isMax ? -Infinity : Infinity;
  for (const [b, c] of legalMoves(s)) {
    const v = search(applyMove(s, b, c), d - 1, alpha, beta, meP);
    if (isMax) {
      best = Math.max(best, v);
      alpha = Math.max(alpha, v);
    } else {
      best = Math.min(best, v);
      beta = Math.min(beta, v);
    }
    if (beta <= alpha) break;
  }
  return best;
}

// Guess how good a position is for meP: boards owned (centre worth most),
// lines of 2 on the big board, and nearly-complete lines inside open boards.
function evaluate(s, meP) {
  const W = [3, 2, 3, 2, 4, 2, 3, 2, 3];
  let sc = 0;
  for (let b = 0; b < 9; b++) {
    const m = s.main[b];
    if (m === meP) sc += W[b] * 20;
    else if (m !== "." && m !== "D") sc -= W[b] * 20;
    else if (m === ".") sc += lineScore(s.cells.slice(b * 9, b * 9 + 9), meP);
  }
  return sc + lineScore(s.main, meP, 8, 40);
}
function lineScore(p, meP, one = 1, two = 4) {
  let t = 0;
  for (const l of LINES) {
    let a = 0,
      o = 0;
    for (const i of l) {
      const ch = p[i];
      if (ch === meP) a++;
      else if (ch !== "." && ch !== "D") o++;
    }
    if (!o && a) t += a === 1 ? one : two;
    if (!a && o) t -= o === 1 ? one : two;
  }
  return t;
}

/* ---------- 6. OFFLINE GAME FLOW ---------- */
function startOffline(d) {
  difficulty = d;
  gameId++;
  thinking = false;
  state = newState(chosenNp);
  curRoom = null;
  status = "";
  screen("game", "offline");
  paintPlayer("X", { name: profile.name, avatar: profile.avatar });
  paintPlayer("O", { name: "Computer", avatar: "🤖" });
  if (chosenNp === 3) paintPlayer("N", { name: "Computer 2", avatar: "👾" }); // 3rd player is also a computer
  $("#roomInfo").textContent =
    `vs ${chosenNp === 3 ? "2 Computers" : "Computer"} · ${d} · win ₹50`;
  show("#diffModal", false);
  render();
}

// One move on the board (for both humans and the computer)
async function play(b, c) {
  state = applyMove(state, b, c);
  if (mode === "online") {
    render();
    await set(ref(db, `rooms/${room}/gameState`), state).catch(() =>
      toast("Network problem, move not sent"),
    );
    return;
  }
  thinking = false;
  if (state.over) {
    render();
    finishOffline();
    return;
  }
  if (state.cur !== "X") {
    // O (and N in 3-player) are computers
    thinking = true;
    render();
    const id = gameId;
    setTimeout(
      () => {
        if (id !== gameId || mode !== "offline") return; // left or restarted meanwhile
        const mv = chooseMove(state, difficulty);
        thinking = false;
        if (mv) play(mv[0], mv[1]);
      },
      difficulty === "hard" ? 650 : 800,
    );
  } else render();
}

// Runs exactly once per game: pays the ₹50 reward only if YOU (X) won
function finishOffline() {
  if (state.winner === "X") {
    setWallet(wallet + 50);
    toast("🎉 You won! +₹50 added to your wallet");
    rain("💸");
  } else if (state.winner === "O") toast("The computer won this one 😅");
  else toast("It's a draw");
}

/* ---------- 7. ONLINE: ROOMS, BARGAINING, PAYOUT ----------
   Firebase layout:
   rooms/CODE/
     totalPlayers : 2 or 3
     status    : "waiting" | "bargaining" | "playing"
     round     : counts games played in this room (so money moves only once)
     bet       : { amount, by, ax, ao, an }  (ax/ao/an = X/O/N agreed to this amount)
     players   : { X:{name,avatar,balance}, O:{...}, N:{...} }
     gameState : the state object from section 3
     messages, reactions : chat
   Flow: create/join -> bargain -> everyone agrees -> host (X) starts round ->
         every client subtracts the bet -> play -> every client pays the winner. */
let room = null,
  me = null,
  status = "",
  curRoom = null;
let unsubs = [],
  starting = false,
  stakedRound = 0,
  settledRound = 0,
  oppLeftShown = false;
const STEP = 50; // the "More" / "Less" buttons change the bet by this much
const floor10 = (n) => Math.floor(n / 10) * 10;
const myData = () => ({
  name: profile.name,
  avatar: profile.avatar,
  balance: wallet,
});
const roomIds = (r) => ORDER.slice(0, r.totalPlayers || 2); // ["X","O"] or ["X","O","N"]
const flag = (id) => "a" + id.toLowerCase(); // "X" -> "ax"
const noFlags = { ax: false, ao: false, an: false };
const maxBet = (r) =>
  floor10(Math.min(...roomIds(r).map((id) => r.players?.[id]?.balance ?? 0)));
const allAgreed = (r) => roomIds(r).every((id) => r.bet?.[flag(id)]);

function openLobby() {
  if (wallet < 10)
    return toast(
      "You need at least ₹10 to play online. Win offline to earn ₹50!",
    );
  $("#onlineStatus").textContent = "Play online with friends!";
  show("#onlineControls");
}

async function createRoom() {
  try {
    let code,
      tries = 0;
    do {
      code = String(1000 + Math.floor(Math.random() * 9000));
      tries++;
    } while ((await get(ref(db, `rooms/${code}`))).exists() && tries < 6); // avoid clashing with an existing room
    await set(ref(db, `rooms/${code}`), {
      status: "waiting",
      round: 0,
      createdAt: Date.now(),
      totalPlayers: chosenNp,
      bet: {
        amount: Math.max(10, Math.min(50, floor10(wallet))),
        by: "",
        ...noFlags,
      },
      players: { X: myData() },
    });
    enterRoom(code, "X");
  } catch (e) {
    console.error(e);
    $("#onlineStatus").textContent =
      "Couldn't create room. Check your internet and Firebase rules.";
  }
}

async function joinRoom() {
  const code = $("#roomCode").value.trim();
  const msg = (t) => ($("#onlineStatus").textContent = t);
  if (!/^\d{4}$/.test(code)) return msg("Enter a valid 4-digit room code.");
  try {
    const snap = await get(ref(db, `rooms/${code}`));
    if (!snap.exists()) return msg("Room not found. Check the code.");
    const r = snap.val(),
      np = r.totalPlayers || 2;
    // first free seat: O, then N (only in 3-player rooms)
    const who = !r.players?.O ? "O" : np === 3 && !r.players?.N ? "N" : null;
    if (r.status !== "waiting" || !who)
      return msg("This room is already full or started.");
    const full = ORDER.slice(0, np).every(
      (id) => id === who || r.players?.[id],
    );
    await update(ref(db, `rooms/${code}`), {
      [`players/${who}`]: myData(),
      ...(full ? { status: "bargaining" } : {}),
    });
    enterRoom(code, who);
    say(`${profile.name} joined 👋`, true);
  } catch (e) {
    console.error(e);
    msg("Couldn't join room. Check your internet and Firebase rules.");
  }
}

function enterRoom(code, who) {
  room = code;
  me = who;
  status = "";
  curRoom = null;
  starting = false;
  stakedRound = 0;
  settledRound = 0;
  oppLeftShown = false;
  state = newState(chosenNp);
  thinking = false;
  gameId++;
  $("#chatMessages").innerHTML = "";
  show("#onlineControls", false);
  screen("game", "online");
  $("#roomInfo").textContent = `Room ${code}`;
  buildBoard();
  render();
  unsubs.push(onValue(ref(db, `rooms/${code}`), onRoom));
  listenChat();
  listenReactions();
}

// Runs every time anything in the room changes
function onRoom(snap) {
  const r = snap.val();
  if (!r) {
    toast("Room was closed");
    leave(false);
    return;
  }
  curRoom = r;
  status = r.status;
  const P = r.players || {},
    np = r.totalPlayers || 2,
    ids = roomIds(r);
  document.body.dataset.stage = status; // CSS uses this to hide chat tools while waiting
  ids.forEach((id) =>
    paintPlayer(id, P[id] || { name: "Waiting…", avatar: "⏳" }),
  );
  state = r.gameState ? { ...newState(np), ...r.gameState } : newState(np);
  if (status !== "bargaining") starting = false;

  // someone left: 2 players -> you win the pot. 3 players -> game cancelled, others get the bet back.
  if (r.left && r.left !== me && !oppLeftShown) {
    oppLeftShown = true;
    toast("A player left the room 👋");
    if (status === "playing" && !state.over)
      update(ref(db, `rooms/${room}/gameState`), {
        over: true,
        winner: np === 2 ? me : "",
      });
  }

  show("#waitBox", status === "waiting");
  $("#waitCode").textContent = room;
  $("#waitInfo").textContent =
    `Players joined: ${ids.filter((id) => P[id]).length}/${np}`;
  show("#bargain", status === "bargaining" && !r.left);
  if (status === "bargaining") renderBargain(r);

  // Only the host (X) starts the round, so it can never start twice
  if (
    status === "bargaining" &&
    me === "X" &&
    ids.every((id) => P[id]) &&
    allAgreed(r) &&
    !starting
  )
    startRound(r);

  // Take the bet from my wallet once per round
  if (status === "playing" && (r.round || 0) > stakedRound) {
    stakedRound = r.round;
    setWallet(wallet - r.bet.amount);
    toast(`₹${r.bet.amount} each is in the pot!`);
  }
  // Pay out once per round
  if (status === "playing" && state.over && settledRound < r.round) settle(r);
  render();
}

async function startRound(r) {
  starting = true;
  if (r.bet.amount > maxBet(r)) {
    await update(ref(db, `rooms/${room}/bet`), noFlags);
    starting = false;
    toast("Someone doesn't have enough balance for that bet");
    return;
  }
  await update(ref(db, `rooms/${room}`), {
    status: "playing",
    round: (r.round || 0) + 1,
    gameState: newState(r.totalPlayers || 2),
  });
}

// Winner takes ALL bets (bet x players). Draw/cancel returns the bet. Losers already paid at round start.
function settle(r) {
  settledRound = r.round;
  const amt = r.bet.amount,
    np = r.totalPlayers || 2,
    pot = amt * np,
    w = state.winner;
  if (!w && r.left && r.left !== me && np === 3) {
    // A player quit a 3-player game: the two who stayed each get their own bet back
    // PLUS half of the leaver's bet (the leaver's ₹amt is split between the two of them).
    setWallet(wallet + amt + amt / 2);
    toast(
      `A player left. You got your ₹${amt} back + ₹${amt / 2} from them 🤝`,
    );
  } else if (!w) {
    setWallet(wallet + amt);
    toast("🤝 Draw: your bet is returned");
  } else if (w === me) {
    setWallet(wallet + pot);
    toast(`🏆 You won ₹${pot}!`);
    rain("💸");
  } else toast(`😢 You lost ₹${amt}`);
}

/* --- bargaining --- */
function renderBargain(r) {
  const b = r.bet,
    P = r.players,
    ids = roomIds(r);
  ORDER.forEach((id) => {
    const el = $("#bv" + id);
    el.classList.toggle("hide", !ids.includes(id));
    el.textContent = `${P[id]?.name || "?"} · ₹${P[id]?.balance ?? 0}`;
  });
  $("#betNotes").innerHTML = notesHTML(b.amount);
  $("#betAmt").textContent = b.amount;
  const iAgree = b[flag(me)];
  $("#betMsg").textContent = !b.by
    ? "Propose an amount or accept this one 👇"
    : b.by === me
      ? `You proposed ₹${b.amount}. Waiting for the others…`
      : `${P[b.by]?.name || "Someone"} proposed ₹${b.amount}`;
  const accept = $("#betAccept");
  accept.disabled = !!iAgree;
  accept.textContent = iAgree
    ? "⏳ Waiting for the others…"
    : `✅ Accept ₹${b.amount}`;
}

// Proposing an amount also means you agree to it; everyone else must accept again
async function propose(amount) {
  const max = maxBet(curRoom);
  amount = Math.max(10, Math.round(amount / 10) * 10);
  if (max < 10) return toast("Not enough balance to bet");
  if (amount > max) {
    toast(`Highest possible bet is ₹${max} (the lowest balance)`);
    amount = max;
  }
  await update(ref(db, `rooms/${room}/bet`), {
    amount,
    by: me,
    ...noFlags,
    [flag(me)]: true,
  });
  return amount;
}

async function acceptBet() {
  const a = curRoom.bet.amount;
  if (a > wallet) return toast("You don't have enough balance for this bet");
  if (a > maxBet(curRoom)) return toast("Another player can't afford this bet");
  await update(ref(db, `rooms/${room}/bet`), { [flag(me)]: true });
  say("✅ Deal!");
}

// "Play again" from the result: go straight back to bargaining
function playAgainOnline() {
  const max = maxBet(curRoom);
  if (max < 10) return toast("Someone has no balance left to bet");
  const amount = Math.min(Math.max(10, curRoom.bet.amount), max);
  update(ref(db, `rooms/${room}`), {
    status: "bargaining",
    gameState: null,
    bet: { amount, by: "", ...noFlags },
  });
}

function leave(notify = true) {
  unsubs.forEach((u) => u());
  unsubs = [];
  if (notify && room && me)
    update(ref(db, `rooms/${room}`), { left: me }).catch(() => {});
  room = me = curRoom = null;
  status = "";
  thinking = false;
  gameId++;
  show("#bargain", false);
  show("#waitBox", false);
  $("#chatPanel").classList.remove("open");
  $("#emojiPanel").classList.remove("open");
  screen("home", "home");
  renderWallet();
}

/* ---------- 8. CHAT + EMOJI REACTIONS ---------- */
const chatPanel = $("#chatPanel"),
  chatMessages = $("#chatMessages"),
  chatBadge = $("#chatBadge");
let reactionsFrom = Date.now();

function say(text, system = false) {
  if (!room) return;
  push(ref(db, `rooms/${room}/messages`), {
    player: system ? "System" : me,
    name: profile.name,
    text,
    createdAt: Date.now(),
    type: system ? "system" : "chat",
  });
}

function listenChat() {
  unsubs.push(
    onChildAdded(ref(db, `rooms/${room}/messages`), (snap) => {
      const m = snap.val(),
        d = document.createElement("div");
      d.className =
        "chat-message" +
        (m.player === me ? " mine" : "") +
        (m.type === "system" ? " sys" : "");
      d.textContent =
        m.type === "system" ? m.text : `${m.name || m.player}: ${m.text}`;
      chatMessages.appendChild(d);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      if (
        m.player !== me &&
        m.type !== "system" &&
        !chatPanel.classList.contains("open")
      )
        chatBadge.classList.add("show");
    }),
  );
}

function showLiveReaction(emoji) {
  const el = $("#liveReaction");
  el.textContent = emoji;
  el.classList.remove("show");
  void el.offsetWidth; // restart the animation
  el.classList.add("show");
}

function listenReactions() {
  reactionsFrom = Date.now();
  unsubs.push(
    onChildAdded(ref(db, `rooms/${room}/reactions`), (snap) => {
      const r = snap.val();
      if (r.createdAt < reactionsFrom || r.player === me) return; // ignore old ones and my own
      showLiveReaction(r.emoji);
    }),
  );
}

/* ---------- 9. BUTTONS + START-UP ---------- */
// Home
$("#playOffline").onclick = () => show("#diffModal");
$("#closeDiff").onclick = () => show("#diffModal", false);
$$(".d-btn[data-d]").forEach(
  (b) => (b.onclick = () => startOffline(b.dataset.d)),
);
$("#playOnline").onclick = openLobby;
$("#closeOnline").onclick = () => show("#onlineControls", false);
$("#createRoom").onclick = createRoom;
$("#joinRoom").onclick = joinRoom;

// 2 / 3 player toggle (one in the difficulty window, one in the online lobby)
$$(".np-btn").forEach(
  (b) =>
    (b.onclick = () => {
      chosenNp = +b.dataset.np;
      $$(".np-btn").forEach((x) =>
        x.classList.toggle("on", +x.dataset.np === chosenNp),
      );
    }),
);

// Profile
$("#nameInput").addEventListener("change", (e) => {
  profile.name = e.target.value.trim() || "Player 1";
  e.target.value = profile.name;
  saveProfile();
});
// highlight the currently chosen emoji in the picker
const markAvatar = () =>
  $$(".av-pick").forEach((b) =>
    b.classList.toggle("sel", b.textContent === profile.avatar),
  );
$("#avatarBtn").onclick = () => {
  markAvatar();
  show("#avatarModal");
};
$("#closeAvatar").onclick = () => show("#avatarModal", false);
$("#photoInput").onchange = (e) => handlePhoto(e.target.files[0]);
$("#avatarGrid").innerHTML = AVATARS.map(
  (a) => `<button type="button" class="av-pick">${a}</button>`,
).join("");
$("#avatarGrid").onclick = (e) => {
  const b = e.target.closest(".av-pick");
  if (!b) return;
  profile.avatar = b.textContent;
  saveProfile();
  markAvatar();
  b.classList.remove("tap");
  void b.offsetWidth;
  b.classList.add("tap"); // click animation
  toast("Picture selected ✅");
};

// Game screen
$("#homeBtn").onclick = () => {
  const risky = mode === "online" && status === "playing" && !state.over;
  if (risky && !confirm("Leave now? You will lose your bet.")) return;
  if (mode === "offline") {
    gameId++;
    thinking = false;
    screen("home", "home");
    renderWallet();
    return;
  }
  leave();
};
$("#playAgain").onclick = () =>
  mode === "offline" ? startOffline(difficulty) : playAgainOnline();
$("#cancelWait").onclick = () => leave();
$("#leaveBargain").onclick = () => leave();

// Bargaining buttons (each also sends a chat message with an emoji)
$("#betMore").onclick = async () => {
  const a = await propose(curRoom.bet.amount + STEP);
  if (a) say(`➕ How about ₹${a}? 😎`);
};
$("#betLess").onclick = async () => {
  const a = await propose(curRoom.bet.amount - STEP);
  if (a) say(`➖ Let's go lower: ₹${a} 🙏`);
};
$("#betNo").onclick = async () => {
  say(`💸 I don't have that much! My balance is ₹${wallet} 😅`);
  if (curRoom.bet.amount > wallet && wallet >= 10) propose(floor10(wallet));
};
$("#betSet").onclick = async () => {
  const v = Number($("#betInput").value);
  if (!v) return toast("Type an amount first");
  const a = await propose(v);
  if (a) {
    say(`💬 I propose ₹${a}`);
    $("#betInput").value = "";
  }
};
$("#betAccept").onclick = acceptBet;

// Chat
$("#chatToggle").onclick = () => {
  $("#emojiPanel").classList.remove("open");
  chatPanel.classList.toggle("open");
  if (chatPanel.classList.contains("open")) chatBadge.classList.remove("show");
};
$("#closeChat").onclick = () => chatPanel.classList.remove("open");
$("#emojiToggle").onclick = () => {
  $("#emojiPanel").classList.toggle("open");
  chatPanel.classList.remove("open");
};
$("#sendChat").onclick = () => {
  const t = $("#chatInput").value.trim();
  if (t) {
    say(t);
    $("#chatInput").value = "";
  }
};
$("#chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#sendChat").click();
});
$$(".emoji-btn").forEach(
  (btn) =>
    (btn.onclick = () => {
      if (!room) return;
      const emoji = btn.textContent;
      push(ref(db, `rooms/${room}/reactions`), {
        player: me,
        emoji,
        createdAt: Date.now(),
      });
      showLiveReaction(emoji);
    }),
);

// Start-up
buildBoard();
$("#nameInput").value = profile.name;
paintAvatar($("#avatarBtn"), profile.avatar);
renderWallet();
