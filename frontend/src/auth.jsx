
import { useState } from "react";
import api from "./api";

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const endpoint = isLogin
        ? "/api/auth/login"
        : "/api/auth/register";

      const data = isLogin
        ? { email, password }
        : { name, email, password };

      console.log("Sending request:", endpoint, data);

      const response = await api.post(endpoint, data);

      console.log("Backend response:", response.data);

      const token = response.data.token;

      if (!token) {
        setMessage("Backend responded, but no token was received.");
        return;
      }

      localStorage.setItem("token", token);

      setMessage(
        isLogin
          ? "Login successful!"
          : "Registration successful!"
      );

      onLogin(response.data);
    } catch (error) {
      console.error("Authentication error:", error);

      if (error.response) {
        setMessage(
          `Server error ${error.response.status}: ${
            error.response.data?.message || "Unknown server error"
          }`
        );
      } else if (error.request) {
        setMessage(
          "Cannot connect to backend. Make sure backend is running on port 5000."
        );
      } else {
        setMessage(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>⭕ Tic-Tac-Toe ❌</h1>

        <h2>{isLogin ? "Login" : "Create Account"}</h2>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isLogin
              ? "Login"
              : "Register"}
          </button>
        </form>

        {message && <p className="auth-message">{message}</p>}

        <button
          className="switch-button"
          onClick={() => {
            setIsLogin(!isLogin);
            setMessage("");
          }}
        >
          {isLogin
            ? "Create a new account"
            : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}

export default Auth;
