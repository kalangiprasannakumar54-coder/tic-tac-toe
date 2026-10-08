const WINNING_COMBINATIONS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

// Check whether a player has won
const checkWinner = (board) => {
    for (const combination of WINNING_COMBINATIONS) {
        const [a, b, c] = combination;

        if (
            board[a] &&
            board[a] === board[b] &&
            board[a] === board[c]
        ) {
            return board[a];
        }
    }

    return null;
};

// Check whether the board is full
const isBoardFull = (board) => {
    return board.every((cell) => cell !== "");
};

// Get the current game result
const getGameResult = (board) => {
    const winner = checkWinner(board);

    if (winner) {
        return {
            status: "completed",
            winner
        };
    }

    if (isBoardFull(board)) {
        return {
            status: "completed",
            winner: "draw"
        };
    }

    return {
        status: "playing",
        winner: null
    };
};

// Validate a move
const isValidMove = (board, position) => {
    return (
        Number.isInteger(position) &&
        position >= 0 &&
        position <= 8 &&
        board[position] === ""
    );
};

// Easy AI - random move
const getRandomMove = (board) => {
    const emptyPositions = board
        .map((cell, index) => (cell === "" ? index : null))
        .filter((index) => index !== null);

    if (emptyPositions.length === 0) {
        return null;
    }

    const randomIndex = Math.floor(
        Math.random() * emptyPositions.length
    );

    return emptyPositions[randomIndex];
};

// Medium AI - win, block, then random
const getMediumMove = (
    board,
    aiPlayer = "O",
    humanPlayer = "X"
) => {

    // Try to win
    for (let i = 0; i < board.length; i++) {
        if (board[i] === "") {
            const testBoard = [...board];
            testBoard[i] = aiPlayer;

            if (checkWinner(testBoard) === aiPlayer) {
                return i;
            }
        }
    }

    // Try to block human
    for (let i = 0; i < board.length; i++) {
        if (board[i] === "") {
            const testBoard = [...board];
            testBoard[i] = humanPlayer;

            if (checkWinner(testBoard) === humanPlayer) {
                return i;
            }
        }
    }

    // Otherwise random
    return getRandomMove(board);
};

// Hard AI - Minimax algorithm
const minimax = (
    board,
    isMaximizing,
    aiPlayer = "O",
    humanPlayer = "X"
) => {
    const result = getGameResult(board);

    // AI wins
    if (result.winner === aiPlayer) {
        return 10;
    }

    // Human wins
    if (result.winner === humanPlayer) {
        return -10;
    }

    // Draw
    if (result.winner === "draw") {
        return 0;
    }

    // AI's turn
    if (isMaximizing) {
        let bestScore = -Infinity;

        for (let i = 0; i < board.length; i++) {
            if (board[i] === "") {
                board[i] = aiPlayer;

                const score = minimax(
                    board,
                    false,
                    aiPlayer,
                    humanPlayer
                );

                board[i] = "";

                bestScore = Math.max(bestScore, score);
            }
        }

        return bestScore;
    }

    // Human's turn
    let bestScore = Infinity;

    for (let i = 0; i < board.length; i++) {
        if (board[i] === "") {
            board[i] = humanPlayer;

            const score = minimax(
                board,
                true,
                aiPlayer,
                humanPlayer
            );

            board[i] = "";

            bestScore = Math.min(bestScore, score);
        }
    }

    return bestScore;
};

// Get the best move using Minimax
const getHardMove = (
    board,
    aiPlayer = "O",
    humanPlayer = "X"
) => {
    let bestScore = -Infinity;
    let bestMove = null;

    for (let i = 0; i < board.length; i++) {
        if (board[i] === "") {
            board[i] = aiPlayer;

            const score = minimax(
                board,
                false,
                aiPlayer,
                humanPlayer
            );

            board[i] = "";

            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }

    return bestMove;
};

module.exports = {
    checkWinner,
    isBoardFull,
    getGameResult,
    isValidMove,
    getRandomMove,
    getMediumMove,
    minimax,
    getHardMove
};