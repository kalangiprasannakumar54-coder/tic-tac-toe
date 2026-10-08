const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: function () {
                return !this.googleId;
            }
        },

        googleId: {
            type: String,
            default: null
        },

        profilePicture: {
            type: String,
            default: ""
        },

        gamesPlayed: {
            type: Number,
            default: 0
        },

        wins: {
            type: Number,
            default: 0
        },

        losses: {
            type: Number,
            default: 0
        },

        draws: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.models.User ||
    mongoose.model("User", userSchema);