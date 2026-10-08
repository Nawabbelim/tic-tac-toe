const cells = document.querySelectorAll(".cell");
let currentp = "X";
let currentBoard;
let wonBoards = [];

cells.forEach((cell) => {
  //added loop bcz we have queryselectorAll a array of cells
  cell.addEventListener("click", () => {
    //and evenlistner can work on only one element

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

      if (
        currentBoard &&
        !wonBoards.includes(currentBoard) &&
        !boardFull &&
        Number(boardNum) !== currentBoard
      )
        return;
      //IF there is a required board AND NOt fulled AND the clicked board is NOT that required board, STOP.
    }

    if (cell.textContent !== "") return; //dont overwrite
    if (wonBoards.includes(Number(boardNum))) return; //winner Board block

    cell.textContent = currentp;
    checkWinner(cell.parentElement);
    console.log(wonBoards);

    //if(currentp==="X"){ currentp="O";} else{currentp="X";} ternary op: better
    currentp = currentp === "X" ? "O" : "X"; // condition ? truecode : elseCode
    currentBoard = cellNum; //Next board
    document.querySelectorAll(".box").forEach((b) => {
      b.classList.remove("active");
    });
    document
      .querySelector(`[data-board="${currentBoard}"]`)
      .classList.add("active");
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
  const boardCells = board.querySelectorAll(".cell");

  winner.forEach((combination) => {
    const a = boardCells[combination[0] - 1];
    const b = boardCells[combination[1] - 1];
    const c = boardCells[combination[2] - 1];

    if (
      a.textContent !== "" &&
      a.textContent === b.textContent &&
      a.textContent === c.textContent
    ) {
      console.log(a.textContent + " won!");
      if (!wonBoards.includes(Number(board.dataset.board))) {   // save only once
        wonBoards.push(Number(board.dataset.board)); 
      }
    }
  });
}
