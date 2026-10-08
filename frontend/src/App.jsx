import { useEffect, useRef, useState } from "react";
import "./App.css";
import { io } from "socket.io-client";



import Auth from "./auth";

import api from "./api";

import "./App.css";



const winningPatterns = [

  [0, 1, 2],

  [3, 4, 5],

  [6, 7, 8],

  [0, 3, 6],

  [1, 4, 7],

  [2, 5, 8],

  [0, 4, 8],

  [2, 4, 6],

];



function checkWinner(board) {

  for (const [a, b, c] of winningPatterns) {

    if (

      board[a] &&

      board[a] === board[b] &&

      board[a] === board[c]

    ) {

      return board[a];

    }

  }



  if (board.every((cell) => cell !== "")) {

    return "draw";

  }



  return null;

}
function isWinningCell(board, index, winner) {
    if (!winner || winner === "draw") {
        return false;
    }

    return winningPatterns.some((pattern) => {
        return (
            pattern.includes(index) &&
            pattern.every(
                (position) =>
                    board[position] === winner
            )
        );
    });
}


function App() {

  // =========================

  // AUTH

  // =========================



  const [loggedIn, setLoggedIn] = useState(

    Boolean(localStorage.getItem("token"))

  );



  const [user, setUser] = useState(null);

  const [stats, setStats] = useState(null);

  const [gameHistory, setGameHistory] = useState([]);
const [mode, setMode] = useState(null);

// THEME
   const [theme, setTheme] = useState(
    localStorage.getItem("ticTacToeTheme") || "dark"
);
useEffect(() => {
    document.documentElement.setAttribute(
        "data-theme",
        theme
    );

    localStorage.setItem(
        "ticTacToeTheme",
        theme
    );
}, [theme]);

function toggleTheme() {
    setTheme((currentTheme) =>
        currentTheme === "dark"
            ? "light"
            : "dark"
    );
}

  // PROFILE
  const [showProfile, setShowProfile] = useState(false);



  // =========================

  // AI / FRIENDLY STATE

  // =========================



  const [board, setBoard] = useState(

    Array(9).fill("")

  );



  const [currentPlayer, setCurrentPlayer] =

    useState("X");



  const [winner, setWinner] = useState(null);



  const [aiDifficulty, setAiDifficulty] =

    useState("easy");



  const [gameId, setGameId] = useState(null);



  const [aiThinking, setAiThinking] =

    useState(false);



  // =========================

  // ONLINE STATE

  // =========================



  const socketRef = useRef(null);



  const [onlineBoard, setOnlineBoard] =

    useState(Array(9).fill(""));



  const [onlineRoomCode, setOnlineRoomCode] =

    useState("");



  const [joinRoomCode, setJoinRoomCode] =

    useState("");



  const [myPlayer, setMyPlayer] =

    useState(null);



  const [onlineCurrentPlayer, setOnlineCurrentPlayer] =

    useState("X");



  const [onlineWinner, setOnlineWinner] =

    useState(null);



  const [onlineGameStatus, setOnlineGameStatus] =

    useState("waiting");



  const [opponentJoined, setOpponentJoined] =

    useState(false);



  const [opponentName, setOpponentName] =

    useState("");



  const [socketConnected, setSocketConnected] =

    useState(false);



  const [onlineLoading, setOnlineLoading] =

    useState(false);



  // =========================

  // REMATCH STATE

  // =========================



  const [rematchRequested, setRematchRequested] =

    useState(false);



  const [

    opponentRematchRequested,

    setOpponentRematchRequested,

  ] = useState(false);



 // =========================

// LOAD USER DATA

// =========================



useEffect(() => {

    if (!loggedIn) {

        return;

    }



    async function loadUserData() {

        try {

            const profileResponse =

                await api.get("/api/users/profile");



            const statsResponse =

                await api.get("/api/users/stats");



            setUser(profileResponse.data.user);



            setStats(

                statsResponse.data.stats

            );

        } catch (error) {

            console.error(

                "Failed to load user data:",

                error

            );



            if (

                error.response?.status === 401

            ) {

                localStorage.removeItem(

                    "token"

                );



                setLoggedIn(false);

            }

        }

    }



    async function loadGameHistory() {

        try {

            const response =

                await api.get(

                    "/api/games/history"

                );



            console.log(

                "Game history:",

                response.data.games

            );



            setGameHistory(

                response.data.games || []

            );

        } catch (error) {

            console.error(

                "Failed to load game history:",

                error

            );



            if (

                error.response?.status === 401

            ) {

                localStorage.removeItem(

                    "token"

                );



                setLoggedIn(false);

            }

        }

    }



    loadUserData();



    loadGameHistory();

}, [loggedIn]);

  // =========================

  // SOCKET CONNECTION

  // =========================



  useEffect(() => {

    if (!loggedIn || mode !== "online") {

      return;

    }



    const token = localStorage.getItem("token");



    if (!token) {

      return;

    }



    const socket = io(

      import.meta.env.VITE_API_URL,

      {

        auth: {

          token,

        },

      }

    );



    socketRef.current = socket;



    // =========================

    // CONNECT

    // =========================



    socket.on("connect", () => {

      console.log(

        "Socket connected:",

        socket.id

      );



      setSocketConnected(true);

    });



    // =========================

    // CONNECTION ERROR

    // =========================



    socket.on("connect_error", (error) => {

      console.error(

        "Socket connection error:",

        error.message

      );



      setSocketConnected(false);



      alert(

        error.message ||

          "Unable to connect to online multiplayer."

      );

    });



    // =========================

    // DISCONNECT

    // =========================



    socket.on("disconnect", () => {

      console.log("Socket disconnected");



      setSocketConnected(false);

    });



    // =========================

    // PLAYER JOINED

    // =========================



    socket.on("playerJoined", (data) => {

      console.log(

        "Player joined:",

        data

      );



      setOpponentJoined(true);



      if (data.playerName) {

        setOpponentName(

          data.playerName

        );

      }



      if (Array.isArray(data.board)) {

        setOnlineBoard(

          Array.from(

            { length: 9 },

            (_, index) =>

              data.board[index] || ""

          )

        );

      }



      if (data.currentPlayer) {

        setOnlineCurrentPlayer(

          data.currentPlayer

        );

      }



      if (data.gameStatus) {

        setOnlineGameStatus(

          data.gameStatus

        );

      }

    });



    // =========================

    // GAME UPDATED

    // =========================



    socket.on(

      "gameUpdated",

      async (data) => {

        console.log(

          "Game updated:",

          data

        );



        if (Array.isArray(data.board)) {

          setOnlineBoard(

            Array.from(

              { length: 9 },

              (_, index) =>

                data.board[index] || ""

            )

          );

        }



        if (data.currentPlayer) {

          setOnlineCurrentPlayer(

            data.currentPlayer

          );

        }



        if (data.winner) {

          setOnlineWinner(

            data.winner

          );

        }



        if (data.gameStatus) {

          setOnlineGameStatus(

            data.gameStatus

          );

        }



        // Refresh stats after completed game*

        if (

          data.gameStatus ===

          "completed"

        ) {

          try {

            const statsResponse =

              await api.get(

                "/api/users/stats"

              );



            setStats(

              statsResponse.data.stats

            );

          } catch (error) {

            console.error(

              "Failed to refresh stats:",

              error

            );

          }

        }

      }

    );



    // =========================

    // OPPONENT REQUESTED REMATCH

    // =========================



    socket.on(

      "rematchRequested",

      (data) => {

        console.log(

          "Opponent requested rematch:",

          data

        );



        setOpponentRematchRequested(

          true

        );

      }

    );



    // =========================

    // REMATCH STARTED

    // =========================



    socket.on(

      "rematchStarted",

      (data) => {

        console.log(

          "Rematch started:",

          data

        );



        setOnlineBoard(

          Array.from(

            { length: 9 },

            (_, index) =>

              data.board[index] || ""

          )

        );



        setOnlineCurrentPlayer(

          data.currentPlayer || "X"

        );



        setOnlineWinner(null);



        setOnlineGameStatus(

          "playing"

        );



        setRematchRequested(false);



        setOpponentRematchRequested(

          false

        );

      }

    );



    // =========================

    // CLEANUP

    // =========================



    return () => {

      socket.disconnect();



      socketRef.current = null;



      setSocketConnected(false);

    };

  }, [loggedIn, mode]);



  // =========================

  // LOGIN

  // =========================



  function handleLogin() {

    setLoggedIn(true);

  }



  // =========================

  // RESET LOCAL GAME

  // =========================



  function resetGame() {

    setBoard(Array(9).fill(""));



    setCurrentPlayer("X");



    setWinner(null);



    setGameId(null);



    setAiThinking(false);

  }



  // =========================

  // FRIENDLY GAME

  // =========================



  function startFriendlyGame() {

    resetGame();



    setMode("friendly");

  }



  function handleFriendlyMove(index) {

    if (

      board[index] ||

      winner

    ) {

      return;

    }



    const newBoard = [...board];



    newBoard[index] =

      currentPlayer;



    const result =

      checkWinner(newBoard);



    setBoard(newBoard);



    if (result) {

      setWinner(result);

      return;

    }



    setCurrentPlayer(

      currentPlayer === "X"

        ? "O"

        : "X"

    );

  }



  // =========================

  // AI GAME

  // =========================



  function startAIGame() {

    resetGame();



    setMode("ai");

  }



  async function createAIGame() {

    try {

      const response =

        await api.post(

          "/api/games",

          {

            mode: "ai",

            difficulty:

              aiDifficulty,

          }

        );



      setGameId(

        response.data.game._id

      );



      setBoard(

        Array(9).fill("")

      );



      setWinner(null);



      setCurrentPlayer("X");



      setAiThinking(false);

    } catch (error) {

      console.error(

        "Failed to create AI game:",

        error

      );



      alert(

        error.response?.data?.message ||

          "Unable to create AI game."

      );

    }

  }



  async function handleAIMove(index) {

    if (

      board[index] ||

      winner ||

      currentPlayer !== "X" ||

      aiThinking

    ) {

      return;

    }



    try {

      setAiThinking(true);



      const response =

        await api.post(

          "/api/games/ai/move",

          {

            board: [...board],

            position: index,

            difficulty:

              aiDifficulty,

            gameId,

          }

        );



      const newBoard =

        response.data.board;



      const fixedBoard =

        Array.from(

          { length: 9 },

          (_, i) =>

            newBoard[i] || ""

        );



      setBoard(fixedBoard);



      const result =

        response.data.result;



      if (

        result.status ===

        "completed"

      ) {

        setWinner(

          result.winner

        );



        const statsResponse =

          await api.get(

            "/api/users/stats"

          );



        setStats(

          statsResponse.data.stats

        );

      } else {

        setCurrentPlayer("X");

      }

    } catch (error) {

      console.error(

        "AI move error:",

        error

      );



      alert(

        error.response?.data?.message ||

          "Unable to make AI move."

      );

    } finally {

      setAiThinking(false);

    }

  }



  // =========================

  // ONLINE GAME

  // =========================



  function startOnlineGame() {

    setOnlineBoard(

      Array(9).fill("")

    );



    setOnlineRoomCode("");



    setJoinRoomCode("");



    setMyPlayer(null);



    setOnlineCurrentPlayer("X");



    setOnlineWinner(null);



    setOnlineGameStatus(

      "waiting"

    );



    setOpponentJoined(false);



    setOpponentName("");



    setOnlineLoading(false);



    setRematchRequested(false);



    setOpponentRematchRequested(

      false

    );



    setMode("online");

  }



  // =========================

  // CREATE ROOM

  // =========================



  function createRoom() {

    const socket =

      socketRef.current;



    if (

      !socket ||

      !socket.connected

    ) {

      alert(

        "Socket is not connected yet. Please wait a moment."

      );



      return;

    }



    setOnlineLoading(true);



    socket.emit(

      "createRoom",

      (response) => {

        console.log(

          "Create room response:",

          response

        );



        setOnlineLoading(false);



        if (!response?.success) {

          alert(

            response?.message ||

              "Unable to create room."

          );



          return;

        }



        setOnlineRoomCode(

          response.roomCode

        );



        setMyPlayer(

          response.player || "X"

        );



        if (

          Array.isArray(

            response.board

          )

        ) {

          setOnlineBoard(

            Array.from(

              { length: 9 },

              (_, index) =>

                response.board[

                  index

                ] || ""

            )

          );

        }



        setOnlineCurrentPlayer(

          response.currentPlayer ||

            "X"

        );



        setOnlineGameStatus(

          response.gameStatus ||

            "waiting"

        );



        setOpponentJoined(false);



        setRematchRequested(false);



        setOpponentRematchRequested(

          false

        );

      }

    );

  }



  // =========================

  // JOIN ROOM

  // =========================



  function joinRoom() {

    const socket =

      socketRef.current;



    if (

      !socket ||

      !socket.connected

    ) {

      alert(

        "Socket is not connected yet. Please wait a moment."

      );



      return;

    }



    const cleanRoomCode =

      joinRoomCode

        .trim()

        .toUpperCase();



    if (!cleanRoomCode) {

      alert(

        "Please enter a room code."

      );



      return;

    }



    setOnlineLoading(true);



    socket.emit(

      "joinRoom",

      cleanRoomCode,

      (response) => {

        console.log(

          "Join room response:",

          response

        );



        setOnlineLoading(false);



        if (!response?.success) {

          alert(

            response?.message ||

              "Unable to join room."

          );



          return;

        }



        setOnlineRoomCode(

          response.roomCode

        );



        setMyPlayer(

          response.player || "O"

        );



        if (

          Array.isArray(

            response.board

          )

        ) {

          setOnlineBoard(

            Array.from(

              { length: 9 },

              (_, index) =>

                response.board[

                  index

                ] || ""

            )

          );

        }



        setOnlineCurrentPlayer(

          response.currentPlayer ||

            "X"

        );



        setOnlineGameStatus(

          response.gameStatus ||

            "playing"

        );



        setOpponentJoined(true);



        setRematchRequested(false);



        setOpponentRematchRequested(

          false

        );

      }

    );

  }



  // =========================

  // ONLINE MOVE

  // =========================



  function handleOnlineMove(index) {

    if (

      !socketRef.current ||

      !socketRef.current.connected

    ) {

      alert(

        "Not connected to the server."

      );



      return;

    }



    if (!myPlayer) {

      return;

    }



    if (!opponentJoined) {

      return;

    }



    if (

      onlineGameStatus !==

      "playing"

    ) {

      return;

    }



    if (onlineWinner) {

      return;

    }



    if (

      onlineCurrentPlayer !==

      myPlayer

    ) {

      return;

    }



    if (onlineBoard[index]) {

      return;

    }



    socketRef.current.emit(

      "makeMove",

      index,

      (response) => {

        console.log(

          "Make move response:",

          response

        );



        if (!response?.success) {

          alert(

            response?.message ||

              "Unable to make move."

          );

        }

      }

    );

  }



  // =========================

  // REQUEST REMATCH

  // =========================



  function requestRematch() {

    const socket =

      socketRef.current;



    if (

      !socket ||

      !socket.connected

    ) {

      alert(

        "Not connected to the server."

      );



      return;

    }



    if (

      onlineGameStatus !==

      "completed"

    ) {

      return;

    }



    socket.emit(

      "requestRematch",

      (response) => {

        console.log(

          "Rematch response:",

          response

        );



        if (!response?.success) {

          alert(

            response?.message ||

              "Unable to request rematch."

          );



          return;

        }



        setRematchRequested(true);

      }

    );

  }



  // =========================

  // LEAVE ONLINE GAME

  // =========================



  function leaveOnlineGame() {

    if (socketRef.current) {

      socketRef.current.disconnect();



      socketRef.current = null;

    }



    setSocketConnected(false);



    setOnlineBoard(

      Array(9).fill("")

    );



    setOnlineRoomCode("");



    setJoinRoomCode("");



    setMyPlayer(null);



    setOnlineCurrentPlayer("X");



    setOnlineWinner(null);



    setOnlineGameStatus(

      "waiting"

    );



    setOpponentJoined(false);



    setOpponentName("");



    setOnlineLoading(false);



    setRematchRequested(false);



    setOpponentRematchRequested(

      false

    );



    setMode(null);

  }



  // =========================

  // MENU

  // =========================



  function backToMenu() {

    resetGame();



    setMode(null);

  }



  // =========================

  // LOGOUT

  // =========================



  function logout() {

    if (socketRef.current) {

      socketRef.current.disconnect();



      socketRef.current = null;

    }



    localStorage.removeItem(

      "token"

    );



    setLoggedIn(false);



    setUser(null);



    setStats(null);



    setMode(null);



    resetGame();



    setOnlineBoard(

      Array(9).fill("")

    );



    setOnlineRoomCode("");



    setJoinRoomCode("");



    setMyPlayer(null);



    setOnlineWinner(null);



    setOnlineCurrentPlayer("X");



    setOnlineGameStatus(

      "waiting"

    );



    setOpponentJoined(false);



    setOpponentName("");



    setRematchRequested(false);



    setOpponentRematchRequested(

      false

    );

  }



  // =========================

  // LOGIN SCREEN

  // =========================



  if (!loggedIn) {

    return (

      <Auth

        onLogin={handleLogin}

      />

    );

  }



  // =========================

  // PROFILE PAGE

  // =========================

  if (showProfile) {
    return (
    <div className="app">

        <button
            className="theme-toggle"
            onClick={toggleTheme}
        >
            {theme === "dark"
                ? "☀️ Light"
                : "🌙 Dark"}
        </button>    <div className="game-card profile-page">
          <div className="profile-header">
            <div className="profile-avatar">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" />
              ) : (
                <span>
                  {user?.name?.charAt(0)?.toUpperCase() || "👤"}
                </span>
              )}
            </div>

            <div className="profile-heading">
              <h1>👤 My Profile</h1>
              <p>Your Tic-Tac-Toe account</p>
            </div>
          </div>

          <div className="profile-info">
            <div className="profile-info-item">
              <span>🧑 Name</span>
              <strong>{user?.name || "Player"}</strong>
            </div>

            <div className="profile-info-item">
              <span>📧 Email</span>
              <strong>{user?.email || "Not available"}</strong>
            </div>

            <div className="profile-info-item">
              <span>📅 Member Since</span>
              <strong>
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "Not available"}
              </strong>
            </div>
          </div>

          <h2 className="profile-section-title">
            📊 Game Statistics
          </h2>

          {stats && (
            <div className="profile-stats">
              <div className="profile-stat-card">
                <span className="profile-stat-icon">🎮</span>
                <strong>{stats.gamesPlayed}</strong>
                <span>Games Played</span>
              </div>

              <div className="profile-stat-card">
                <span className="profile-stat-icon">🏆</span>
                <strong>{stats.wins}</strong>
                <span>Wins</span>
              </div>

              <div className="profile-stat-card">
                <span className="profile-stat-icon">❌</span>
                <strong>{stats.losses}</strong>
                <span>Losses</span>
              </div>

              <div className="profile-stat-card">
                <span className="profile-stat-icon">🤝</span>
                <strong>{stats.draws}</strong>
                <span>Draws</span>
              </div>

              <div className="profile-stat-card">
                <span className="profile-stat-icon">📈</span>
                <strong>{stats.winRate}</strong>
                <span>Win Rate</span>
              </div>
            </div>
          )}

          <div className="game-actions profile-actions">
            <button onClick={() => setShowProfile(false)}>
              ⬅️ Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================

  // AI SCREEN

  // =========================



  if (mode === "ai") {

    return (

      <div className="app">

        <div className="game-card">



          <h1>

            🤖 AI Battle

          </h1>



          {!gameId ? (

            <>

              <h2>

                Choose Difficulty

              </h2>



              <div className="difficulty-buttons">



                <button

                  className={

                    aiDifficulty ===

                    "easy"

                      ? "selected"

                      : ""

                  }

                  onClick={() =>

                    setAiDifficulty(

                      "easy"

                    )

                  }

                >

                  🟢 Easy

                </button>



                <button

                  className={

                    aiDifficulty ===

                    "medium"

                      ? "selected"

                      : ""

                  }

                  onClick={() =>

                    setAiDifficulty(

                      "medium"

                    )

                  }

                >

                  🟡 Medium

                </button>



                <button

                  className={

                    aiDifficulty ===

                    "hard"

                      ? "selected"

                      : ""

                  }

                  onClick={() =>

                    setAiDifficulty(

                      "hard"

                    )

                  }

                >

                  🔴 Hard

                </button>



              </div>



              <div className="game-actions">



                <button

                  onClick={

                    createAIGame

                  }

                >

                  🎮 Start Game

                </button>



                <button

                  onClick={

                    backToMenu

                  }

                >

                  ⬅️ Menu

                </button>



              </div>

            </>

          ) : (

            <>

              {winner === "draw" ? (

                <h2>

                  🤝 It's a Draw!

                </h2>

              ) : winner === "X" ? (

                <h2>

                  🏆 You Win!

                </h2>

              ) : winner === "O" ? (

                <h2>

                  🤖 AI Wins!

                </h2>

              ) : aiThinking ? (

                <h2>

                  🤖 AI is thinking...

                </h2>

              ) : (

                <h2>

                  Your Turn — X

                </h2>

              )}



              <div className="board">



                {Array.from(

                  { length: 9 },

                  (_, index) => (

                    <button

                      key={index}

className={`cell ${
    isWinningCell(
        board,
        index,
        winner
    )
        ? `winning-cell ${
            winner === "X"
                ? "my-win"
                : "opponent-win"
        }`
        : ""
}`}                      onClick={() =>

                        handleAIMove(

                          index

                        )

                      }

                    >

                      {board[index] ||

                        ""}

                    </button>

                  )

                )}



              </div>



              <p>

                Difficulty:{" "}

                <strong>

                  {aiDifficulty.toUpperCase()}

                </strong>

              </p>



              <div className="game-actions">



                <button

                  onClick={() =>

                    resetGame()

                  }

                >

                  🔄 New Game

                </button>



                <button

                  onClick={

                    backToMenu

                  }

                >

                  ⬅️ Menu

                </button>



              </div>

            </>

          )}



        </div>

      </div>

    );

  }



  // =========================

  // FRIENDLY SCREEN

  // =========================



  if (mode === "friendly") {

    return (

      <div className="app">



        <div className="game-card">



          <h1>

            ⭕ Tic-Tac-Toe ❌

          </h1>



          {winner === "draw" ? (

            <h2>

              🤝 It's a Draw!

            </h2>

          ) : winner ? (

            <h2>

              🏆 Player {winner} Wins!

            </h2>

          ) : (

            <h2>

              Player{" "}

              {currentPlayer}'s Turn

            </h2>

          )}



          <div className="board">



            {Array.from(

              { length: 9 },

              (_, index) => (

                <button

                  key={index}

                className={`cell ${
    isWinningCell(
        board,
        index,
        winner
    )
        ? `winning-cell ${
            winner === "X"
                ? "my-win"
                : "opponent-win"
        }`
        : ""
}`}

                  onClick={() =>

                    handleFriendlyMove(

                      index

                    )

                  }

                >

                  {board[index] ||

                    ""}

                </button>

              )

            )}



          </div>



          <div className="game-actions">



            <button

              onClick={

                resetGame

              }

            >

              🔄 Restart

            </button>



            <button

              onClick={

                backToMenu

              }

            >

              ⬅️ Menu

            </button>



          </div>



        </div>



      </div>

    );

  }



  // =========================

  // ONLINE SCREEN

  // =========================



  if (mode === "online") {

    return (

      <div className="app">



        <div className="game-card online-card">



          <h1>

            🌐 Online Multiplayer

          </h1>



          <p>

            Connection:{" "}

            <strong>

              {socketConnected

                ? "🟢 Connected"

                : "🔴 Connecting..."}

            </strong>

          </p>



          {!onlineRoomCode ? (

            <>

              <h2>

                Create a Room

              </h2>



              <button

                className="online-main-button"

                onClick={createRoom}

                disabled={

                  !socketConnected ||

                  onlineLoading

                }

              >

                {onlineLoading

                  ? "Creating..."

                  : "🏠 Create Room"}

              </button>



              <div className="online-divider">

                <span>

                  OR

                </span>

              </div>



              <h2>

                Join a Room

              </h2>



              <input

                className="room-input"

                type="text"

                placeholder="Enter Room Code"

                value={joinRoomCode}

                onChange={(e) =>

                  setJoinRoomCode(

                    e.target.value.toUpperCase()

                  )

                }

                maxLength={10}

              />



              <button

                className="online-main-button"

                onClick={joinRoom}

                disabled={

                  !socketConnected ||

                  onlineLoading ||

                  !joinRoomCode.trim()

                }

              >

                {onlineLoading

                  ? "Joining..."

                  : "🚪 Join Room"}

              </button>



              <div className="game-actions">



                <button

                  onClick={

                    leaveOnlineGame

                  }

                >

                  ⬅️ Menu

                </button>



              </div>

            </>

          ) : (

            <>

              <div className="room-info">



                <h2>

                  Room Code

                </h2>



                <div className="room-code">

                  {onlineRoomCode}

                </div>



                <p>

                  Share this code with

                  your friend.

                </p>



              </div>



              <p>

                You are:{" "}

                <strong>

                  Player {myPlayer}

                </strong>

              </p>



              {!opponentJoined ? (

                <div className="waiting-box">



                  <h2>

                    ⏳ Waiting for Player 2...

                  </h2>



                  <p>

                    Ask your friend to join

                    using the room code.

                  </p>



                </div>

              ) : (

                <>

                  <p>

                    👤 Opponent:{" "}

                    <strong>

                      {opponentName ||

                        "Player"}

                    </strong>

                  </p>



                  {onlineWinner ===

                  "draw" ? (

                    <h2>

                      🤝 It's a Draw!

                    </h2>

                  ) : onlineWinner ===

                    myPlayer ? (

                    <h2>

                      🏆 You Win!

                    </h2>

                  ) : onlineWinner ? (

                    <h2>

                      😔 Opponent Wins!

                    </h2>

                  ) : onlineCurrentPlayer ===

                    myPlayer ? (

                    <h2>

                      🎯 Your Turn —{" "}

                      {myPlayer}

                    </h2>

                  ) : (

                    <h2>

                      ⏳ Opponent's Turn

                    </h2>

                  )}



                  <div className="board">



                    {Array.from(

                      { length: 9 },

                      (_, index) => (

                        <button

                          key={index}

                        className={`cell ${
    isWinningCell(
        onlineBoard,
        index,
        onlineWinner
    )
        ? `winning-cell ${
            onlineWinner === myPlayer
                ? "my-win"
                : "opponent-win"
        }`
        : ""
}`}
 onClick={() =>

                            handleOnlineMove(

                              index

                            )

                          }

                          disabled={Boolean(

                            onlineBoard[index] ||

                            onlineCurrentPlayer !==

                              myPlayer ||

                            onlineWinner ||

                            onlineGameStatus !==

                              "playing"

                          )}

                        >

                          {onlineBoard[

                            index

                          ] || ""}

                        </button>

                      )

                    )}



                  </div>



                  <p>

                    You are playing as{" "}

                    <strong>

                      {myPlayer}

                    </strong>

                  </p>

                </>

              )}



              {/* =========================*

 *                  REMATCH BUTTONS

 *              ========================= 
 */}



              <div className="game-actions">



                {onlineWinner && (

                  <button

                    onClick={

                      requestRematch

                    }

                    disabled={

                      rematchRequested

                    }

                  >

                    {rematchRequested

                      ? "⏳ Waiting for Opponent..."

                      : "🔄 Rematch"}

                  </button>

                )}



                {opponentRematchRequested &&

                  !rematchRequested && (

                    <button

                      onClick={

                        requestRematch

                      }

                    >

                      🔄 Opponent Wants Rematch

                    </button>

                  )}



                <button

                  onClick={

                    leaveOnlineGame

                  }

                >

                  🚪 Leave Room

                </button>



              </div>

            </>

          )}



        </div>



      </div>

    );

  }



  // =========================

  // MAIN MENU

  // =========================



  return (

    <div className="app">



      <h1>

        ⭕ Tic-Tac-Toe ❌

      </h1>



      <div className="game-card">



        <h2>

          Welcome

          {user?.name

            ? `, ${user.name}`

            : ""}{" "}

          👋

        </h2>



        {stats && (

          <div className="stats">



            <p>

              🎮 Games:{" "}

              {stats.gamesPlayed}

            </p>



            <p>

              🏆 Wins:{" "}

              {stats.wins}

            </p>



            <p>

              ❌ Losses:{" "}

              {stats.losses}

            </p>



            <p>

              🤝 Draws:{" "}

              {stats.draws}

            </p>



            <p>

              📊 Win Rate:{" "}

              {stats.winRate}

            </p>



          </div>

        )}

        {/* =========================*

 * &#xA0;   GAME HISTORY

 * =========================
 */}



<div className="history-section">



    <div className="history-header">

        <h2>📜 Game History</h2>



        <span className="history-count">

            {gameHistory.length} games

        </span>

    </div>



    {gameHistory.length === 0 ? (



        <div className="empty-history">

            <p>🎮 No games played yet.</p>

            <p>Start a game to see your history here.</p>

        </div>



    ) : (



        <div className="history-list">



            {gameHistory.map((game) => {



                const playerXId =

                    game.playerX?._id ||

                    game.playerX;



                const playerOId =

                    game.playerO?._id ||

                    game.playerO;



                const currentUserId =

                    user?._id;



                const isPlayerX =

                    String(playerXId) ===

                    String(currentUserId);



                let result = "Unknown";

                let resultIcon = "🎮";



                if (game.winner === "draw") {



                    result = "Draw";

                    resultIcon = "🤝";



                } else if (game.mode === "ai") {



                    if (game.winner === "X") {

                        result = "You Won";

                        resultIcon = "🏆";

                    } else if (game.winner === "O") {

                        result = "You Lost";

                        resultIcon = "❌";

                    }



                } else if (game.mode === "online") {



                    if (

                        (isPlayerX && game.winner === "X") ||

                        (!isPlayerX && game.winner === "O")

                    ) {

                        result = "You Won";

                        resultIcon = "🏆";

                    } else if (game.winner) {

                        result = "You Lost";

                        resultIcon = "❌";

                    }

                }



                let opponent = "Player";



                if (game.mode === "ai") {



                    opponent = "🤖 AI";



                } else if (game.mode === "online") {



                    opponent =

                        isPlayerX

                            ? game.playerO?.name || "Opponent"

                            : game.playerX?.name || "Opponent";



                } else if (game.mode === "friendly") {



                    opponent = "👥 Local Player";

                }



                const gameDate =

                    game.createdAt

                        ? new Date(

                              game.createdAt

                          ).toLocaleString()

                        : "Unknown date";



                const modeName =

                    game.mode === "ai"

                        ? "🤖 AI Battle"

                        : game.mode === "online"

                        ? "🌐 Online"

                        : "👥 Friendly";



                return (

                    <div

                        className="history-card"

                        key={game._id}

                    >



                        <div className="history-top">



                            <strong>

                                {modeName}

                            </strong>



                            <span className="history-result">

                                {resultIcon} {result}

                            </span>



                        </div>



                        <div className="history-details">



                            <p>

                                👤 Opponent:{" "}

                                <strong>

                                    {opponent}

                                </strong>

                            </p>



                            {game.mode === "ai" &&

                                game.difficulty && (

                                    <p>

                                        🎯 Difficulty:{" "}

                                        <strong>

                                            {game.difficulty.toUpperCase()}

                                        </strong>

                                    </p>

                                )}



                            <p>

                                📅 {gameDate}

                            </p>



                        </div>



                    </div>

                );

            })}



        </div>

    )}



</div>



        <h2>

          Choose Game Mode

        </h2>



        <div className="mode-buttons">



          <button

            onClick={

              startAIGame

            }

          >

            🤖 Play with AI

          </button>



          <button

            onClick={

              startFriendlyGame

            }

          >

            👥 Friendly Game

          </button>



          <button

            onClick={

              startOnlineGame

            }

          >

            🌐 Online Multiplayer

          </button>



          <button
        onClick={() => setShowProfile(true)}
      >
        👤 My Profile
      </button>

      <button

            onClick={logout}

          >

            🚪 Logout

          </button>



        </div>



      </div>



    </div>

  );

}



export default App;
