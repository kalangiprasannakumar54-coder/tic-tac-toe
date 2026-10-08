const { io } = require("socket.io-client");

const TOKEN_X = process.env.TOKEN_X;
const TOKEN_O = process.env.TOKEN_O;

if (!TOKEN_X || !TOKEN_O) {
    console.error("Both TOKEN_X and TOKEN_O are required.");
    process.exit(1);
}

const playerX = io("http://localhost:5000", {
    auth: {
        token: TOKEN_X
    }
});

let playerO;
let roomCode;


// =====================================================
// PLAYER X
// =====================================================

playerX.on("connect", () => {

    console.log("Player X authenticated!");
    console.log("Socket ID:", playerX.id);

    playerX.emit("createRoom", (response) => {

        console.log("\nRoom created:");
        console.log(response);

        if (!response.success) {
            console.error("Room creation failed.");
            return;
        }

        roomCode = response.roomCode;

        createPlayerO();

    });
});


// =====================================================
// PLAYER O
// =====================================================

function createPlayerO() {

    playerO = io("http://localhost:5000", {

        auth: {
            token: TOKEN_O
        }

    });


    playerO.on("connect", () => {

        console.log("\nPlayer O authenticated!");
        console.log("Socket ID:", playerO.id);

        playerO.emit(
            "joinRoom",
            roomCode,
            (response) => {

                console.log("\nPlayer O joined:");
                console.log(response);

                if (!response.success) {
                    console.error(
                        "Player O failed to join."
                    );
                    return;
                }

                setTimeout(() => {
                    playX1();
                }, 500);

            }
        );

    });


    playerO.on("gameUpdated", (data) => {

        console.log("\n[O] Game updated:");
        console.log(data);

    });


    playerO.on("connect_error", (error) => {

        console.error(
            "Player O connection error:",
            error.message
        );

    });

}


// =====================================================
// GAME MOVES
// =====================================================

function playX1() {

    console.log("\nX plays position 0");

    playerX.emit(
        "makeMove",
        0,
        (response) => {

            console.log(
                "X move response:"
            );

            console.log(response);

            setTimeout(() => {
                playO1();
            }, 500);

        }
    );

}


function playO1() {

    console.log("\nO plays position 3");

    playerO.emit(
        "makeMove",
        3,
        (response) => {

            console.log(
                "O move response:"
            );

            console.log(response);

            setTimeout(() => {
                playX2();
            }, 500);

        }
    );

}


function playX2() {

    console.log("\nX plays position 1");

    playerX.emit(
        "makeMove",
        1,
        (response) => {

            console.log(
                "X move response:"
            );

            console.log(response);

            setTimeout(() => {
                playO2();
            }, 500);

        }
    );

}


function playO2() {

    console.log("\nO plays position 4");

    playerO.emit(
        "makeMove",
        4,
        (response) => {

            console.log(
                "O move response:"
            );

            console.log(response);

            setTimeout(() => {
                playX3();
            }, 500);

        }
    );

}


function playX3() {

    console.log(
        "\nX plays position 2 — WINNING MOVE!"
    );

    playerX.emit(
        "makeMove",
        2,
        (response) => {

            console.log(
                "\nFINAL X MOVE RESPONSE:"
            );

            console.log(response);

            setTimeout(() => {

                playerX.disconnect();
                playerO.disconnect();

            }, 1000);

        }
    );

}


// =====================================================
// PLAYER X EVENTS
// =====================================================

playerX.on("gameUpdated", (data) => {

    console.log("\n[X] Game updated:");
    console.log(data);

});


playerX.on("connect_error", (error) => {

    console.error(
        "Player X connection error:",
        error.message
    );

});


playerX.on("disconnect", () => {

    console.log(
        "\nPlayer X disconnected."
    );

});