const express = require("express");

const {
    createGame,
    playAIGame,
    playFriendlyGame,
    completeGame,
    getGameHistory
} = require("../controllers/gameController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Create a new game
router.post("/", protect, createGame);
router.post("/friendly/move", protect, playFriendlyGame);
// Play against AI
router.post("/ai/move", protect, playAIGame);

// Complete a game
router.put("/:gameId/complete", protect, completeGame);

// Get game history
router.get("/history", protect, getGameHistory);

module.exports = router;