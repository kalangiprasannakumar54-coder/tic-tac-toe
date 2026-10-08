const express = require("express");
const User = require("./models/User");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

// IMPORTANT: filenames are lowercase
// because Render uses Linux and is case-sensitive.

const Game = require("./models/Game");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const gameRoutes = require("./routes/gameRoutes");

dotenv.config();

const app = express();
const server = http.createServer(app);

// =====================================================
// SOCKET.IO
// =====================================================

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());

// =====================================================
// DATABASE
// =====================================================

connectDB();

// =====================================================
// API ROUTES
// =====================================================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/games", gameRoutes);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Tic-Tac-Toe Backend is running!"
    });
});

// =====================================================
// SOCKET.IO AUTHENTICATION
// =====================================================

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(
                new Error("Authentication token required")
            );
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(
            decoded.userId
        ).select("-password");

        if (!user) {
            return next(
                new Error("User not found")
            );
        }

        socket.user = user;

        next();

    } catch (error) {
        console.error(
            "Socket authentication error:",
            error.message
        );

        next(
            new Error("Invalid or expired token")
        );
    }
});

// =====================================================
// SOCKET.IO CONNECTION
// =====================================================

io.on("connection", (socket) => {

    console.log(
        `Authenticated socket connected: ${socket.id}`
    );

    console.log(
        `User: ${socket.user.name} (${socket.user.email})`
    );

    // =================================================
    // CREATE ROOM
    // =================================================

    socket.on("createRoom", async (callback) => {
        try {

            const roomCode = Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();

            socket.join(roomCode);

            socket.roomCode = roomCode;
            socket.player = "X";
            socket.rematchRequested = false;

            socket.gameState = {
                board: [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    ""
                ],
                currentPlayer: "X",
                gameStatus: "playing"
            };

            const game = await Game.create({
                mode: "online",
                playerX: socket.user._id,
                playerO: null,
                roomCode: roomCode,
                board: socket.gameState.board,
                status: "waiting",
                winner: null,
                moves: [],
                statsUpdated: false
            });

            socket.gameId = game._id;

            console.log(
                `Room created: ${roomCode} | X: ${socket.user.name} | Game ID: ${game._id}`
            );

            callback({
                success: true,
                roomCode: roomCode,
                player: "X",
                userId: socket.user._id,
                gameId: game._id,
                board: socket.gameState.board,
                currentPlayer: "X",
                gameStatus: "playing"
            });

        } catch (error) {

            console.error(
                "Create room error:",
                error
            );

            callback({
                success: false,
                message: "Failed to create game"
            });
        }
    });

    // =================================================
    // JOIN ROOM
    // =================================================

    socket.on("joinRoom", async (roomCode, callback) => {
        try {

            roomCode = String(roomCode)
                .trim()
                .toUpperCase();

            const room =
                io.sockets.adapter.rooms.get(roomCode);

            if (!room) {
                return callback({
                    success: false,
                    message: "Room not found"
                });
            }

            if (room.size >= 2) {
                return callback({
                    success: false,
                    message: "Room is already full"
                });
            }

            const playerXSocketId = [...room][0];

            const playerXSocket =
                io.sockets.sockets.get(
                    playerXSocketId
                );

            if (!playerXSocket) {
                return callback({
                    success: false,
                    message: "Player X not found"
                });
            }

            const game =
                await Game.findById(
                    playerXSocket.gameId
                );

            if (!game) {
                return callback({
                    success: false,
                    message:
                        "Game not found in database"
                });
            }

            if (game.playerO) {
                return callback({
                    success: false,
                    message:
                        "Player O already joined"
                });
            }

            socket.join(roomCode);

            socket.roomCode = roomCode;
            socket.player = "O";
            socket.rematchRequested = false;

            socket.gameState = {
                board: [
                    ...playerXSocket.gameState.board
                ],
                currentPlayer:
                    playerXSocket.gameState.currentPlayer,
                gameStatus:
                    playerXSocket.gameState.gameStatus
            };

            socket.gameId =
                playerXSocket.gameId;

            // Save Player O
            game.playerO =
                socket.user._id;

            game.status = "playing";

            game.board =
                socket.gameState.board;

            await game.save();

            console.log(
                `Player O joined ${roomCode} | O: ${socket.user.name}`
            );

            console.log(
                `Game ${game._id} status changed to playing`
            );

            callback({
                success: true,
                roomCode: roomCode,
                player: "O",
                userId: socket.user._id,
                gameId: socket.gameId,
                board:
                    socket.gameState.board,
                currentPlayer:
                    socket.gameState.currentPlayer,
                gameStatus:
                    socket.gameState.gameStatus
            });

            socket.to(roomCode).emit(
                "playerJoined",
                {
                    player: "O",
                    userId: socket.user._id,
                    playerName: socket.user.name,
                    board:
                        socket.gameState.board,
                    currentPlayer:
                        socket.gameState.currentPlayer,
                    gameStatus:
                        socket.gameState.gameStatus
                }
            );

        } catch (error) {

            console.error(
                "Join room error:",
                error
            );

            callback({
                success: false,
                message:
                    "Failed to join game"
            });
        }
    });

    // =================================================
    // MAKE MOVE
    // =================================================

    socket.on(
        "makeMove",
        async (position, callback) => {

            try {

                const roomCode =
                    socket.roomCode;

                const player =
                    socket.player;

                if (!roomCode || !player) {
                    return callback({
                        success: false,
                        message:
                            "You are not in a game room"
                    });
                }

                const room =
                    io.sockets.adapter.rooms.get(
                        roomCode
                    );

                if (!room) {
                    return callback({
                        success: false,
                        message:
                            "Room not found"
                    });
                }

                const playerXSocketId =
                    [...room][0];

                const playerXSocket =
                    io.sockets.sockets.get(
                        playerXSocketId
                    );

                if (
                    !playerXSocket ||
                    !playerXSocket.gameState
                ) {
                    return callback({
                        success: false,
                        message:
                            "Game state not found"
                    });
                }

                const gameState =
                    playerXSocket.gameState;

                // Check game status
                if (
                    gameState.gameStatus !==
                    "playing"
                ) {
                    return callback({
                        success: false,
                        message:
                            "Game is already completed"
                    });
                }

                // Check turn
                if (
                    gameState.currentPlayer !==
                    player
                ) {
                    return callback({
                        success: false,
                        message:
                            `It is ${gameState.currentPlayer}'s turn`
                    });
                }

                // Check position
                if (
                    typeof position !== "number" ||
                    !Number.isInteger(position) ||
                    position < 0 ||
                    position > 8
                ) {
                    return callback({
                        success: false,
                        message:
                            "Invalid position"
                    });
                }

                // Check occupied cell
                if (
                    gameState.board[position] !== ""
                ) {
                    return callback({
                        success: false,
                        message:
                            "Position is already occupied"
                    });
                }

                // =============================================
                // MAKE MOVE
                // =============================================

                gameState.board[position] =
                    player;

                // =============================================
                // CHECK WINNER
                // =============================================

                const winningLines = [
                    [0, 1, 2],
                    [3, 4, 5],
                    [6, 7, 8],

                    [0, 3, 6],
                    [1, 4, 7],
                    [2, 5, 8],

                    [0, 4, 8],
                    [2, 4, 6]
                ];

                let winner = null;

                for (
                    const line of winningLines
                ) {

                    const [a, b, c] = line;

                    if (
                        gameState.board[a] !== "" &&
                        gameState.board[a] ===
                            gameState.board[b] &&
                        gameState.board[a] ===
                            gameState.board[c]
                    ) {

                        winner =
                            gameState.board[a];

                        break;
                    }
                }

                // =============================================
                // CHECK DRAW
                // =============================================

                const isDraw =
                    !winner &&
                    gameState.board.every(
                        (cell) => cell !== ""
                    );

                // =============================================
                // GET GAME FROM DATABASE
                // =============================================

                const game =
                    await Game.findById(
                        socket.gameId
                    );

                if (!game) {
                    return callback({
                        success: false,
                        message:
                            "Game not found in database"
                    });
                }

                game.board =
                    gameState.board;

                game.moves.push({
                    player: player,
                    position: position,
                    playedAt: new Date()
                });

                // =============================================
                // GAME COMPLETED
                // =============================================

                if (winner || isDraw) {

                    gameState.gameStatus =
                        "completed";

                    const finalWinner =
                        winner || "draw";

                    game.winner =
                        finalWinner;

                    game.status =
                        "completed";

                    // =========================================
                    // UPDATE PLAYER STATISTICS
                    // =========================================

                    if (!game.statsUpdated) {

                        const playerX =
                            await User.findById(
                                game.playerX
                            );

                        const playerO =
                            await User.findById(
                                game.playerO
                            );

                        if (playerX) {
                            playerX.gamesPlayed += 1;
                        }

                        if (playerO) {
                            playerO.gamesPlayed += 1;
                        }

                        if (
                            finalWinner === "X"
                        ) {

                            if (playerX) {
                                playerX.wins += 1;
                            }

                            if (playerO) {
                                playerO.losses += 1;
                            }

                        } else if (
                            finalWinner === "O"
                        ) {

                            if (playerO) {
                                playerO.wins += 1;
                            }

                            if (playerX) {
                                playerX.losses += 1;
                            }

                        } else {

                            if (playerX) {
                                playerX.draws += 1;
                            }

                            if (playerO) {
                                playerO.draws += 1;
                            }
                        }

                        if (playerX) {
                            await playerX.save();
                        }

                        if (playerO) {
                            await playerO.save();
                        }

                        game.statsUpdated = true;
                    }

                    await game.save();

                    // Send response to player
                    callback({
                        success: true,
                        board:
                            gameState.board,
                        player: player,
                        position: position,
                        winner:
                            finalWinner,
                        gameStatus:
                            "completed"
                    });

                    // Send update to both players
                    io.to(roomCode).emit(
                        "gameUpdated",
                        {
                            board:
                                gameState.board,
                            player: player,
                            position: position,
                            winner:
                                finalWinner,
                            gameStatus:
                                "completed",
                            currentPlayer:
                                null
                        }
                    );

                    return;
                }

                // =============================================
                // GAME CONTINUES
                // =============================================

                gameState.currentPlayer =
                    player === "X"
                        ? "O"
                        : "X";

                await game.save();

                // Update game state for both sockets
                for (
                    const socketId of room
                ) {

                    const roomSocket =
                        io.sockets.sockets.get(
                            socketId
                        );

                    if (roomSocket) {
                        roomSocket.gameState = {
                            board: [
                                ...gameState.board
                            ],
                            currentPlayer:
                                gameState.currentPlayer,
                            gameStatus:
                                gameState.gameStatus
                        };
                    }
                }

                callback({
                    success: true,
                    board:
                        gameState.board,
                    player: player,
                    position: position,
                    winner: null,
                    gameStatus:
                        "playing",
                    currentPlayer:
                        gameState.currentPlayer
                });

                io.to(roomCode).emit(
                    "gameUpdated",
                    {
                        board:
                            gameState.board,
                        player: player,
                        position: position,
                        winner: null,
                        gameStatus:
                            "playing",
                        currentPlayer:
                            gameState.currentPlayer
                    }
                );

            } catch (error) {

                console.error(
                    "Make move error:",
                    error
                );

                callback({
                    success: false,
                    message:
                        "Failed to process move"
                });
            }
        }
    );

    // =================================================
    // REMATCH
    // =================================================

    socket.on(
        "requestRematch",
        async (callback) => {

            try {

                const roomCode =
                    socket.roomCode;

                const player =
                    socket.player;

                if (!roomCode || !player) {
                    return callback({
                        success: false,
                        message:
                            "You are not in a game room"
                    });
                }

                const room =
                    io.sockets.adapter.rooms.get(
                        roomCode
                    );

                if (!room || room.size !== 2) {
                    return callback({
                        success: false,
                        message:
                            "Both players must be in the room"
                    });
                }

                // Mark this player
                socket.rematchRequested = true;

                callback({
                    success: true,
                    message:
                        "Rematch request sent"
                });

                // Find other player
                const otherSocketId =
                    [...room].find(
                        (socketId) =>
                            socketId !== socket.id
                    );

                const otherSocket =
                    io.sockets.sockets.get(
                        otherSocketId
                    );

                if (!otherSocket) {
                    return;
                }

                // Tell other player
                otherSocket.emit(
                    "rematchRequested",
                    {
                        player: player
                    }
                );

                // =============================================
                // BOTH PLAYERS REQUESTED REMATCH
                // =============================================

                if (
                    socket.rematchRequested &&
                    otherSocket.rematchRequested
                ) {

                    console.log(
                        `Both players requested rematch in ${roomCode}`
                    );

                    const playerXSocket =
                        socket.player === "X"
                            ? socket
                            : otherSocket;

                    const playerOSocket =
                        socket.player === "O"
                            ? socket
                            : otherSocket;

                    // Create new game
                    const newGame =
                        await Game.create({
                            mode: "online",
                            playerX:
                                playerXSocket.user._id,
                            playerO:
                                playerOSocket.user._id,
                            roomCode:
                                roomCode,
                            board: [
                                "",
                                "",
                                "",
                                "",
                                "",
                                "",
                                "",
                                "",
                                ""
                            ],
                            status: "playing",
                            winner: null,
                            moves: [],
                            statsUpdated: false
                        });

                    const newGameState = {
                        board: [
                            "",
                            "",
                            "",
                            "",
                            "",
                            "",
                            "",
                            ""
                        ],
                        currentPlayer: "X",
                        gameStatus: "playing"
                    };

                    // Update both sockets
                    playerXSocket.gameState = {
                        board: [
                            ...newGameState.board
                        ],
                        currentPlayer:
                            newGameState.currentPlayer,
                        gameStatus:
                            newGameState.gameStatus
                    };

                    playerOSocket.gameState = {
                        board: [
                            ...newGameState.board
                        ],
                        currentPlayer:
                            newGameState.currentPlayer,
                        gameStatus:
                            newGameState.gameStatus
                    };

                    playerXSocket.gameId =
                        newGame._id;

                    playerOSocket.gameId =
                        newGame._id;

                    // Reset requests
                    playerXSocket.rematchRequested =
                        false;

                    playerOSocket.rematchRequested =
                        false;

                    console.log(
                        `Rematch started in ${roomCode} | Game ID: ${newGame._id}`
                    );

                    // Notify both players
                    io.to(roomCode).emit(
                        "rematchStarted",
                        {
                            gameId:
                                newGame._id,
                            board:
                                newGameState.board,
                            currentPlayer:
                                "X",
                            gameStatus:
                                "playing"
                        }
                    );
                }

            } catch (error) {

                console.error(
                    "Rematch error:",
                    error
                );

                callback({
                    success: false,
                    message:
                        "Failed to start rematch"
                });
            }
        }
    );

    // =================================================
    // DISCONNECT
    // =================================================

    socket.on("disconnect", () => {

        console.log(
            `Socket disconnected: ${socket.id}`
        );

    });

});

// =====================================================
// START SERVER
// =====================================================

const PORT =
    process.env.PORT || 5000;

server.listen(
    PORT,
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            "Socket.IO server is ready!"
        );

    }
);