const Game = require("../models/Game");
const User = require("../models/User");

const {
    isValidMove,
    getGameResult,
    getRandomMove,
    getMediumMove,
    getHardMove
} = require("../utils/gameLogic");


// =====================================================
// CREATE A NEW GAME
// =====================================================

const createGame = async (req, res) => {
    try {
        const {
            mode,
            difficulty,
            playerO,
            roomCode
        } = req.body;

        if (!mode) {
            return res.status(400).json({
                success: false,
                message: "Game mode is required"
            });
        }

        if (!["ai", "friendly", "online"].includes(mode)) {
            return res.status(400).json({
                success: false,
                message: "Invalid game mode"
            });
        }

        if (
            mode === "ai" &&
            !["easy", "medium", "hard"].includes(difficulty)
        ) {
            return res.status(400).json({
                success: false,
                message: "Difficulty must be easy, medium, or hard"
            });
        }

        const game = await Game.create({
            mode,
            difficulty: mode === "ai" ? difficulty : null,
            playerX: req.user._id,
            playerO: playerO || null,
            roomCode: roomCode || null,
            status: mode === "online" ? "waiting" : "playing"
        });

        res.status(201).json({
            success: true,
            message: "Game created successfully",
            game
        });

    } catch (error) {
        console.error("Create game error:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


// =====================================================
// PLAY AGAINST AI
// =====================================================

const playAIGame = async (req, res) => {
    try {
        const {
            board,
            position,
            difficulty,
            gameId
        } = req.body;

        // Validate board
        if (!Array.isArray(board) || board.length !== 9) {
            return res.status(400).json({
                success: false,
                message: "Board must contain exactly 9 cells"
            });
        }

        // Validate difficulty
        if (!["easy", "medium", "hard"].includes(difficulty)) {
            return res.status(400).json({
                success: false,
                message: "Difficulty must be easy, medium, or hard"
            });
        }

        // Validate player's move
        if (!isValidMove(board, position)) {
            return res.status(400).json({
                success: false,
                message: "Invalid move"
            });
        }

        // -------------------------------------------------
        // PLAYER X MOVE
        // -------------------------------------------------

        board[position] = "X";

        let result = getGameResult(board);

        // -------------------------------------------------
        // PLAYER WINS BEFORE AI MOVES
        // -------------------------------------------------

        if (result.status === "completed") {

            if (gameId) {
                const game = await Game.findById(gameId);

                if (!game) {
                    return res.status(404).json({
                        success: false,
                        message: "Game not found"
                    });
                }

                game.board = board;

                // Save player's move
                game.moves.push({
                    player: "X",
                    position: position
                });

                game.winner = result.winner;
                game.status = "completed";

                // Update statistics only once
                if (game.statsUpdated !== true) {

                    const player = await User.findById(game.playerX);

                    if (player) {
                        player.gamesPlayed += 1;

                        if (result.winner === "X") {
                            player.wins += 1;
                        } else if (result.winner === "O") {
                            player.losses += 1;
                        } else if (result.winner === "draw") {
                            player.draws += 1;
                        }

                        await player.save();
                    }

                    game.statsUpdated = true;
                }

                await game.save();
            }

            return res.status(200).json({
                success: true,
                message: "Game completed",
                board,
                result,
                aiMove: null
            });
        }

        // -------------------------------------------------
        // AI O MOVE
        // -------------------------------------------------

        let aiMove;

        if (difficulty === "easy") {
            aiMove = getRandomMove(board);
        } else if (difficulty === "medium") {
            aiMove = getMediumMove(board, "O", "X");
        } else {
            aiMove = getHardMove(board, "O", "X");
        }

        // Make AI move
        if (aiMove !== null && aiMove !== undefined) {
            board[aiMove] = "O";
        }

        // Check result after AI move
        result = getGameResult(board);

        // -------------------------------------------------
        // SAVE AI GAME TO MONGODB
        // -------------------------------------------------

        if (gameId) {
            const game = await Game.findById(gameId);

            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: "Game not found"
                });
            }

            game.board = board;

            // Save player's X move
            game.moves.push({
                player: "X",
                position: position
            });

            // Save AI's O move
            if (aiMove !== null && aiMove !== undefined) {
                game.moves.push({
                    player: "O",
                    position: aiMove
                });
            }

            // AI wins or game is draw
            if (result.status === "completed") {

                game.winner = result.winner;
                game.status = "completed";

                // Update statistics only once
                if (game.statsUpdated !== true) {

                    const player = await User.findById(game.playerX);

                    if (player) {
                        player.gamesPlayed += 1;

                        if (result.winner === "X") {
                            player.wins += 1;
                        } else if (result.winner === "O") {
                            player.losses += 1;
                        } else if (result.winner === "draw") {
                            player.draws += 1;
                        }

                        await player.save();
                    }

                    game.statsUpdated = true;
                }
            }

            await game.save();
        }

        // -------------------------------------------------
        // RESPONSE
        // -------------------------------------------------

        res.status(200).json({
            success: true,
            message:
                result.status === "completed"
                    ? "Game completed"
                    : "Move completed",
            board,
            result,
            aiMove
        });

    } catch (error) {
        console.error("AI game error:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


// =====================================================
// PLAY FRIENDLY 2-PLAYER GAME
// =====================================================

const playFriendlyGame = async (req, res) => {
    try {
        const {
            board,
            position,
            player,
            gameId
        } = req.body;

        // Validate board
        if (!Array.isArray(board) || board.length !== 9) {
            return res.status(400).json({
                success: false,
                message: "Board must contain exactly 9 cells"
            });
        }

        // Validate player
        if (!["X", "O"].includes(player)) {
            return res.status(400).json({
                success: false,
                message: "Player must be X or O"
            });
        }

        // Validate move
        if (!isValidMove(board, position)) {
            return res.status(400).json({
                success: false,
                message: "Invalid move"
            });
        }

        // Make move
        board[position] = player;

        // Check result
        const result = getGameResult(board);

        // Save game if gameId exists
        if (gameId) {

            const game = await Game.findById(gameId);

            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: "Game not found"
                });
            }

            // Save current board
            game.board = board;

            // Save player's move
            game.moves.push({
                player: player,
                position: position
            });

            // Game completed
            if (result.status === "completed") {

                game.winner = result.winner;
                game.status = "completed";

                // Prevent duplicate statistics
                if (game.statsUpdated !== true) {

                    // Player X statistics
                    const playerX = await User.findById(game.playerX);

                    if (playerX) {

                        playerX.gamesPlayed += 1;

                        if (result.winner === "X") {
                            playerX.wins += 1;
                        } else if (result.winner === "O") {
                            playerX.losses += 1;
                        } else if (result.winner === "draw") {
                            playerX.draws += 1;
                        }

                        await playerX.save();
                    }

                    // Player O statistics
                    if (game.playerO) {

                        const playerO = await User.findById(game.playerO);

                        if (playerO) {

                            playerO.gamesPlayed += 1;

                            if (result.winner === "O") {
                                playerO.wins += 1;
                            } else if (result.winner === "X") {
                                playerO.losses += 1;
                            } else if (result.winner === "draw") {
                                playerO.draws += 1;
                            }

                            await playerO.save();
                        }
                    }

                    game.statsUpdated = true;
                }
            }

            await game.save();
        }

        // Response
        res.status(200).json({
            success: true,
            message:
                result.status === "completed"
                    ? "Game completed"
                    : "Move completed",
            board,
            result,
            nextPlayer:
                result.status === "playing"
                    ? player === "X"
                        ? "O"
                        : "X"
                    : null
        });

    } catch (error) {
        console.error("Friendly game error:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


// =====================================================
// COMPLETE A GAME
// =====================================================

const completeGame = async (req, res) => {
    try {
        const { gameId } = req.params;

        const {
            winner,
            board,
            moves
        } = req.body;

        const game = await Game.findById(gameId);

        if (!game) {
            return res.status(404).json({
                success: false,
                message: "Game not found"
            });
        }

        // Prevent completing same game twice
        if (
            game.status === "completed" &&
            game.statsUpdated === true
        ) {
            return res.status(400).json({
                success: false,
                message: "Game is already completed"
            });
        }

        // Save game information
        game.winner = winner;
        game.board = board;
        game.moves = moves || [];
        game.status = "completed";

        // -------------------------------------------------
        // PLAYER X STATISTICS
        // -------------------------------------------------

        const playerX = await User.findById(game.playerX);

        if (playerX) {

            playerX.gamesPlayed += 1;

            if (winner === "X") {
                playerX.wins += 1;
            } else if (winner === "O") {
                playerX.losses += 1;
            } else if (winner === "draw") {
                playerX.draws += 1;
            }

            await playerX.save();
        }

        // -------------------------------------------------
        // PLAYER O STATISTICS
        // -------------------------------------------------

        if (game.playerO) {

            const playerO = await User.findById(game.playerO);

            if (playerO) {

                playerO.gamesPlayed += 1;

                if (winner === "O") {
                    playerO.wins += 1;
                } else if (winner === "X") {
                    playerO.losses += 1;
                } else if (winner === "draw") {
                    playerO.draws += 1;
                }

                await playerO.save();
            }
        }

        // Mark statistics as updated
        game.statsUpdated = true;

        await game.save();

        res.status(200).json({
            success: true,
            message: "Game completed successfully",
            game
        });

    } catch (error) {
        console.error("Complete game error:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


// =====================================================
// GET GAME HISTORY
// =====================================================

const getGameHistory = async (req, res) => {
    try {

        const games = await Game.find({
            $or: [
                { playerX: req.user._id },
                { playerO: req.user._id }
            ]
        })
            .populate(
                "playerX",
                "name email profilePicture"
            )
            .populate(
                "playerO",
                "name email profilePicture"
            )
            .sort({
                createdAt: -1
            });

        res.status(200).json({
            success: true,
            count: games.length,
            games
        });

    } catch (error) {
        console.error("Game history error:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


// =====================================================
// EXPORT CONTROLLERS
// =====================================================

module.exports = {
    createGame,
    playAIGame,
    playFriendlyGame,
    completeGame,
    getGameHistory
};