const express = require("express");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Protected profile route
router.get("/profile", protect, (req, res) => {
    res.status(200).json({
        success: true,
        message: "Profile accessed successfully",
        user: req.user
    });
});

// Player statistics
router.get("/stats", protect, (req, res) => {
    const user = req.user;

    const winRate =
        user.gamesPlayed > 0
            ? ((user.wins / user.gamesPlayed) * 100).toFixed(2)
            : "0.00";

    res.status(200).json({
        success: true,
        stats: {
            gamesPlayed: user.gamesPlayed,
            wins: user.wins,
            losses: user.losses,
            draws: user.draws,
            winRate: `${winRate}%`
        }
    });
});

module.exports = router;