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
  cell.addEventListener("click", () => {
    //and evenlistner can work on only one element
    if (gameOver) return; // Stop if the game has ended
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
    cell.classList.add(currentp === "X" ? "mark-x" : "mark-o");
    checkWinner(cell.parentElement);
    checkMainWinner(); // checks overall main winner after each move
    checkDraw(); // Check whether the game ended in a draw

    if (gameOver) return; // dont switch if gameover

    //if(currentp==="X"){ currentp="O";} else{currentp="X";} ternary op: better
    currentp = currentp === "X" ? "O" : "X"; // condition ? truecode : elseCode
    document
      .querySelector("#playerX") //on highligh if X turn in X player
      .classList.toggle("active", currentp === "X");
    document
      .querySelector("#playerO") //on highligh if O turn in O player
      .classList.toggle("active", currentp === "O");

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
        const winnerPlayer = document.querySelector(
          a.textContent === "X" ? "#playerX" : "#playerO",
        );

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
restartBtn.addEventListener("click", () => {
  cells.forEach((cell) => {
    cell.textContent = "";
    cell.disabled = false;
    cell.classList.remove("mark-x", "mark-o");
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

  document.querySelector("#playerX").classList.add("active");
  document.querySelector("#playerO").classList.remove("active");
});
