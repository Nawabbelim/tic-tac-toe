import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {
  ref,
  set,
  get,
  getDatabase,
  onValue,
  push,
  onChildAdded,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";
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
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const createRoomBtn = document.querySelector("#createRoom");
const roomCodeInput = document.querySelector("#roomCode");
const onlineStatus = document.querySelector("#onlineStatus");

const chatInput = document.querySelector("#chatInput");
const sendChat = document.querySelector("#sendChat");
const chatMessages = document.querySelector("#chatMessages");
const chatBadge = document.querySelector("#chatBadge");
let reactionListenerStartedAt = Date.now();

let currentRoom = null;
let myPlayer = null;

function listenToRoom(roomCode) {
  const roomRef = ref(db, `rooms/${roomCode}`);

  onValue(roomRef, (snapshot) => {
    if (!snapshot.exists()) {
      return;
    }

    const room = snapshot.val();
    if (!room) return;

    if (
      room.lastJoined &&
      room.lastJoined.createdAt > (window.lastJoinTime || 0)
    ) {
      window.lastJoinTime = room.lastJoined.createdAt;

      if (myPlayer !== room.lastJoined.player) {
        const codeBox = document.querySelector(".code");
        codeBox.textContent = `Player ${room.lastJoined.player} joined the room!`;
        codeBox.style.display = "block";

        setTimeout(() => {
          codeBox.style.display = "none";
        }, 3000);
      }
    }

    const gameState = room.gameState;

    if (!gameState) {
      document.querySelector("#playerX").classList.add("active");
      document.querySelector("#playerO").classList.remove("active");
      document.querySelector("#playerN").classList.remove("active");
      return;
    }

    currentp = gameState.currentPlayer || "X";
    currentBoard = gameState.currentBoard ?? undefined;
    wonBoards = gameState.wonBoards || [];
    mainBoard = gameState.mainBoard || ["", "", "", "", "", "", "", "", ""];
    finishedBoards = gameState.finishedBoards || [];
    gameOver = gameState.gameOver || false;
    document
      .querySelector("#playerX")
      .classList.toggle("active", currentp === "X");
    document
      .querySelector("#playerO")
      .classList.toggle("active", currentp === "O");
    document
      .querySelector("#playerN")
      .classList.toggle("active", currentp === "N");

    // 1. Draw the marks received from Firebase
    document.querySelectorAll(".box").forEach((board) => {
      const boardNum = board.dataset.board;

      board.querySelectorAll(".cell").forEach((cell) => {
        const cellNum = cell.dataset.cell;
        const mark = gameState.board?.[boardNum]?.[cellNum];

        cell.textContent = mark || "";

        cell.classList.remove("mark-x", "mark-o", "mark-n");

        if (mark === "X") {
          cell.classList.add("mark-x");
        } else if (mark === "O") {
          cell.classList.add("mark-o");
        } else if (mark === "N") {
          cell.classList.add("mark-n");
        }
      });
    });

    // 2. Restore won-board styling and disabled cells
    document.querySelectorAll(".box").forEach((board) => {
      const boardNum = Number(board.dataset.board);

      board.classList.toggle("won", wonBoards.includes(boardNum));

      board.querySelectorAll(".cell").forEach((cell) => {
        cell.disabled = wonBoards.includes(boardNum) || gameOver;
      });
    });

    // Restore the required next board
    document.querySelectorAll(".box").forEach((board) => {
      board.classList.remove("active");
    });

    //Display the winner or draw message
    if (gameOver) {
      let winnerFound = false;

      for (const combination of winner) {
        const a = mainBoard[combination[0] - 1];
        const b = mainBoard[combination[1] - 1];
        const c = mainBoard[combination[2] - 1];

        if (a && a === b && a === c) {
          result.textContent = a + " wins the game!";
          winnerFound = true;
          break;
        }
      }

      if (!winnerFound) {
        result.textContent = "It's a draw!";
      }
    }

    if (currentBoard && !gameOver) {
      const nextBoard = document.querySelector(
        `[data-board="${currentBoard}"]`,
      );

      if (
        nextBoard &&
        !wonBoards.includes(currentBoard) &&
        !finishedBoards.includes(currentBoard)
      ) {
        nextBoard.classList.add("active");
      }
    }
  });
}

async function saveGameState() {
  if (!currentRoom) return;

  const boardState = {};

  document.querySelectorAll(".box").forEach((board) => {
    const boardNum = board.dataset.board;
    boardState[boardNum] = {};

    board.querySelectorAll(".cell").forEach((cell) => {
      const cellNum = cell.dataset.cell;
      boardState[boardNum][cellNum] = cell.textContent;
    });
  });

  await set(ref(db, `rooms/${currentRoom}/gameState`), {
    board: boardState,
    currentPlayer: currentp,
    currentBoard: currentBoard ?? null,
    wonBoards: wonBoards,
    mainBoard: mainBoard,
    finishedBoards: finishedBoards,
    gameOver: gameOver,
  });
}

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

createRoomBtn.addEventListener("click", async () => {
  try {
    const roomCode = generateRoomCode();
    const roomRef = ref(db, `rooms/${roomCode}`);
    const totalPlayers = threePlayerToggle.checked ? 3 : 2;

    await set(roomRef, {
      totalPlayers: totalPlayers,
      currentPlayer: "X",
      status: "waiting",
      players: {
        X: true,
        O: false,
        N: false,
      },
      createdAt: Date.now(),
    });
    document.querySelector("#playerX").classList.add("active");
    document.querySelector("#playerO").classList.remove("active");
    document.querySelector("#playerN").classList.remove("active");

    currentRoom = roomCode;
    myPlayer = "X"; // This device controls Player X
    listenToRoom(roomCode);
    listenToChat(roomCode);
    reactionListenerStartedAt = Date.now();
    listenToReactions(roomCode);

    roomCodeInput.value = roomCode;
    onlineStatus.textContent = `Room created! Share code: ${roomCode}`;
    document.querySelector("#onlineControls").style.display = "none";
    document.querySelector(".code").style.display = "block ";
    document.querySelector(".code").textContent =
      `Room created! Share code: ${roomCode}`;
  } catch (error) {
    console.error(error);
    onlineStatus.textContent = "Couldn't create room. Check the console.";
  }
});

const joinRoomBtn = document.querySelector("#joinRoom");

joinRoomBtn.addEventListener("click", async () => {
  const roomCode = roomCodeInput.value.trim();
  if (currentRoom === roomCode && myPlayer) {
    onlineStatus.textContent = `Already joined as Player ${myPlayer}!`;
    return;
  }

  if (!/^\d{4}$/.test(roomCode)) {
    onlineStatus.textContent = "Enter a valid 4-digit room code.";
    return;
  }

  try {
    const roomRef = ref(db, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
      onlineStatus.textContent = "Room not found. Check the code.";
      return;
    }

    const room = snapshot.val();
    console.log(room);

    if (room.status !== "waiting") {
      onlineStatus.textContent = "This room is not waiting for a player.";
      return;
    }

    let assignedPlayer;
    if (!room.players.O) {
      assignedPlayer = "O";
    } else if (room.totalPlayers === 3 && !room.players.N) {
      assignedPlayer = "N";
    } else {
      onlineStatus.textContent = "Room is already full.";

      return;
    }
    currentRoom = roomCode;

    await set(ref(db, `rooms/${roomCode}/players/${assignedPlayer}`), true); //update in firebase player name
    myPlayer = assignedPlayer; // This device controls O or N

    await set(ref(db, `rooms/${roomCode}/lastJoined`), {
      player: assignedPlayer,
      createdAt: Date.now(),
    });

    await push(ref(db, `rooms/${roomCode}/messages`), {
      // for displying msg to all (who joined?)
      player: "System",
      text: `Player ${assignedPlayer} joined the room!`,
      createdAt: Date.now(),
      type: "system",
    });

    listenToRoom(roomCode);
    listenToChat(roomCode);
    reactionListenerStartedAt = Date.now();
    listenToReactions(roomCode);

    onlineStatus.textContent = `Joined as Player ${assignedPlayer}!`;
    document.querySelector("#onlineControls").style.display = "none";
    document.querySelector(".code").style.display = "block ";
    document.querySelector(".code").textContent =
      `Joined as Player ${assignedPlayer}!`;
  } catch (error) {
    console.error(error);
    onlineStatus.textContent = "Couldn't join room. Check the console.";
  }
});

const cells = document.querySelectorAll(".cell");
const result = document.querySelector("#result");
const restartBtn = document.querySelector("#restart");
let currentp = "X"; // whoes turn
const threePlayerToggle = document.querySelector("#threePlayerToggle");
const players = ["X", "O", "N"];
let currentBoard; // next board to play
let wonBoards = []; //small boxed which are won
let mainBoard = ["", "", "", "", "", "", "", "", ""]; // who won small boxes
let gameOver = false; // Tracks whether the game has ended
let finishedBoards = []; // won or full without won

cells.forEach((cell) => {
  //added loop bcz we have queryselectorAll a array of cells
  cell.addEventListener("click", async () => {
    document.querySelector(".code").textContent = "";
    document.querySelector(".code").style.display = "none";
    //and evenlistner can work on only one element
    if (gameOver) return; // Stop if the game has ended
    if (currentRoom && myPlayer !== currentp) return; // in offline  before && CR will false so it ends condition wont run return
    const cellNum = Number(cell.dataset.cell);
    const boardNum = cell.parentElement.dataset.board; //Get  parent means box's Number
    if (currentBoard) {
      const requiredBoard = document.querySelector(
        `[data-board="${currentBoard}"]`,
      ); //finding required Board
      const requiredCell = requiredBoard.querySelectorAll(".cell"); // got all cell of requiredBoard
      const boardFull = [...requiredCell].every(
        (cell) => cell.textContent !== "",
      ); //checks if every cell is filled

      if (currentBoard && !boardFull && !wonBoards.includes(currentBoard)) {
        //IF there is a required board AND NOt fulled AND Not wonBoard
        if (Number(boardNum) !== currentBoard) return; //NOT that required board, STOP.
      }
    }

    if (cell.textContent !== "") return; //dont overwrite
    if (wonBoards.includes(Number(boardNum))) return; //winner Board block

    cell.textContent = currentp;
    cell.classList.add(
      currentp === "X" ? "mark-x" : currentp === "O" ? "mark-o" : "mark-n",
    );
    checkWinner(cell.parentElement);
    checkMainWinner(); // checks overall main winner after each move
    checkDraw(); // Check whether the game ended in a draw

    if (gameOver) {
      await saveGameState();
      return;
    } // dont switch if gameover

    //if(currentp==="X"){ currentp="O";} else{currentp="X";} ternary op: better

    const totalPlayers = threePlayerToggle.checked ? 3 : 2; // condition ? truecode : elseCode
    const currentIndex = players.indexOf(currentp);

    currentp = players[(currentIndex + 1) % totalPlayers]; //%totalPlayer work as remainder calculation
    //first time 1/3 remainder will 1, 2nd time  2/3 R=2, but third time 3/3 R=0, so cyclewill repeat
    document
      .querySelector("#playerX") //on highligh if X turn in X player
      .classList.toggle("active", currentp === "X");
    document
      .querySelector("#playerO") //on highligh if O turn in O player
      .classList.toggle("active", currentp === "O");
    document
      .querySelector("#playerN") //on highligh if N turn in N player
      .classList.toggle("active", currentp === "N");

    currentBoard = cellNum; //Next board
    document.querySelectorAll(".box").forEach((b) => {
      b.classList.remove("active");
    });

    const nextBoard = document.querySelector(`[data-board="${currentBoard}"]`);

    if (
      wonBoards.includes(currentBoard) ||
      finishedBoards.includes(currentBoard)
    ) {
      currentBoard = undefined;
    } else {
      nextBoard.classList.add("active");
    }
    await saveGameState();
  });
});

let winner = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  [1, 4, 7],
  [2, 5, 8],
  [3, 6, 9],
  [1, 5, 9],
  [3, 5, 7],
];
function checkWinner(board) {
  const boardNum = Number(board.dataset.board);
  const boardCells = board.querySelectorAll(".cell");

  for (const combination of winner) {
    const a = boardCells[combination[0] - 1];
    const b = boardCells[combination[1] - 1];
    const c = boardCells[combination[2] - 1];

    if (
      a.textContent !== "" &&
      a.textContent === b.textContent &&
      a.textContent === c.textContent
    ) {
      console.log(a.textContent + " won!");
      if (!wonBoards.includes(boardNum)) {
        // save only once
        wonBoards.push(boardNum); //declare this board is won by someone
        mainBoard[boardNum - 1] = a.textContent; // set winner symbol in mainBoard
        // Animate the player who won this small board
        const winnerPlayer = document.querySelector(`#player${a.textContent}`);

        winnerPlayer.classList.remove("win-animation");
        winnerPlayer.classList.add("win-animation");

        setTimeout(() => {
          winnerPlayer.classList.remove("win-animation");
        }, 800);

        board.classList.add("won"); // Mark this board as won
        board.querySelectorAll(".cell").forEach((cell) => {
          cell.disabled = true; //totally disable won block
        });
        break; //once win condition found end the loop for this block.
      }
    }
  }
  const boardFull = [...boardCells].every((cell) => cell.textContent !== "");

  if (boardFull && !finishedBoards.includes(boardNum)) {
    finishedBoards.push(boardNum);
  }
}

function checkMainWinner() {
  for (const combination of winner) {
    const a = mainBoard[combination[0] - 1];
    const b = mainBoard[combination[1] - 1];
    const c = mainBoard[combination[2] - 1];

    if (a !== "" && a === b && a === c) {
      result.textContent = a + " wins the game!";
      gameOver = true; // Prevent any more moves
      const winnerPlayer = document.querySelector(`#player${a}`);

      winnerPlayer.classList.remove("win-main-animation");
      void winnerPlayer.offsetWidth; // Restart the animation
      winnerPlayer.classList.add("win-main-animation");
      setTimeout(() => {
        winnerPlayer.classList.remove("win-main-animation");
      }, 900);

      document.querySelector("#playerX").classList.remove("active");
      document.querySelector("#playerO").classList.remove("active");
      document.querySelector("#playerN").classList.remove("active");

      return;
    }
  }
}

function checkDraw() {
  if (finishedBoards.length === 9 && !gameOver) {
    result.textContent = "It's a draw!";
    gameOver = true;
  }
}
restartBtn.addEventListener("click", async () => {
  cells.forEach((cell) => {
    cell.textContent = "";
    cell.disabled = false;
    cell.classList.remove("mark-x", "mark-o", "mark-n");
  });

  currentp = "X";
  currentBoard = undefined;
  wonBoards = [];
  finishedBoards = [];
  mainBoard = ["", "", "", "", "", "", "", "", ""];
  gameOver = false;
  result.textContent = "";

  document.querySelectorAll(".box").forEach((board) => {
    board.classList.remove("active"); //to remove red border
    board.classList.remove("won"); // Clear the won-board style
  });

  document.querySelector("#playerO").classList.remove("active");
  document.querySelector("#playerN").classList.remove("active");
  await saveGameState();
});

const input = document.querySelector("#onlineControls");
document.querySelector(".online").addEventListener("click", () => {
  input.style.display = "grid";
  document.querySelector("#playerX").classList.remove("active");
  emojiPanel.classList.remove("open");
});
document.querySelector("#closeOnline").addEventListener("click", () => {
  document.querySelector("#onlineControls").style.display = "none";
});

// Get the chat elements
const chatToggle = document.querySelector("#chatToggle");
const chatPanel = document.querySelector("#chatPanel");
const closeChat = document.querySelector("#closeChat");

// Get the emoji elements
const emojiToggle = document.querySelector("#emojiToggle");
const emojiPanel = document.querySelector("#emojiPanel");
const liveReaction = document.querySelector("#liveReaction");

// Open and close chat
chatToggle.addEventListener("click", () => {
  emojiPanel.classList.remove("open");
  if (chatPanel.classList.contains("open")) {
    chatBadge.classList.remove("show");
  }
  chatPanel.classList.toggle("open");
});

closeChat.addEventListener("click", () => {
  chatPanel.classList.remove("open");
});

// Open and close emoji panel on phones
emojiToggle.addEventListener("click", () => {
  emojiPanel.classList.toggle("open");
  chatPanel.classList.remove("open");
});

//Add the message-sending code
sendChat.addEventListener("click", async () => {
  const message = chatInput.value.trim();

  if (!message || !currentRoom || !myPlayer) return;

  await push(ref(db, `rooms/${currentRoom}/messages`), {
    player: myPlayer,
    text: message,
    createdAt: Date.now(),
  });

  chatInput.value = ""; //clears input box after send(saved)
});
//allows to send with enter key
chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendChat.click();
  }
});

//msg  Listner
function listenToChat(roomCode) {
  const messagesRef = ref(db, `rooms/${roomCode}/messages`);

  onValue(messagesRef, (snapshot) => {
    chatMessages.innerHTML = "";

    const chatIsClosed = !chatPanel.classList.contains("open");
    if (chatIsClosed && snapshot.exists()) {
      chatBadge.classList.add("show");
    }

    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();

      const messageElement = document.createElement("div");
      messageElement.classList.add("chat-message");

      messageElement.textContent = `${message.player}: ${message.text}`;

      chatMessages.appendChild(messageElement);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

//for emoji
document.querySelectorAll(".emoji-btn").forEach((button) => {
  button.addEventListener("click", async () => {
    const emoji = button.textContent;

    if (!currentRoom || !myPlayer) return;

    await push(ref(db, `rooms/${currentRoom}/messages`), {
      player: myPlayer,
      text: emoji,
      createdAt: Date.now(),
    });

    await push(ref(db, `rooms/${currentRoom}/reactions`), {
      player: myPlayer,
      emoji: emoji,
      createdAt: Date.now(),
    });
    showLiveReaction(emoji);
  });
});

function showLiveReaction(emoji) {
  liveReaction.textContent = emoji;
  liveReaction.classList.remove("show");

  void liveReaction.offsetWidth; // Restarts animation for repeated emojis

  liveReaction.classList.add("show");
}

function listenToReactions(roomCode) {
  const reactionsRef = ref(db, `rooms/${roomCode}/reactions`);

  onChildAdded(reactionsRef, (snapshot) => {
    const reaction = snapshot.val();

    // Ignore reactions sent before this listener started
    if (reaction.createdAt < reactionListenerStartedAt) return;

    // Don't replay our own reaction; we already show it locally
    if (reaction.player === myPlayer) return;

    showLiveReaction(reaction.emoji);
  });
}
