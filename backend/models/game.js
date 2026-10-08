const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema(
    {
        mode: {
            type: String,
            enum: ["ai", "friendly", "online"],
            required: true
        },

        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: null
        },

        playerX: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        playerO: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        winner: {
            type: String,
            enum: ["X", "O", "draw", null],
            default: null
        },

        board: {
            type: [String],
            default: ["", "", "", "", "", "", "", ""]
        },

        moves: [
            {
                player: {
                    type: String,
                    enum: ["X", "O"]
                },

                position: {
                    type: Number,
                    min: 0,
                    max: 8
                },

                playedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],

        roomCode: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: ["waiting", "playing", "completed", "abandoned"],
            default: "playing"
        },

        statsUpdated: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Game", gameSchema);