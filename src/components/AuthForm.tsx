import { useState } from "react";
import { trpc } from "@/lib/trpc";

type AuthMode = "login" | "register";

interface AuthFormProps {
  onSuccess: (token: string) => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("auth-token", data.token);
      onSuccess(data.token);
      setError("");
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("auth-token", data.token);
      onSuccess(data.token);
      setError("");
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "login") {
      loginMutation.mutate({
        emailOrUsername: email,
        password,
      });
    } else {
      registerMutation.mutate({
        email,
        username,
        password,
      });
    }
  };

  const isLoading = loginMutation.isLoading || registerMutation.isLoading;

  return (
    <div className="card max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-empire-gold mb-2">
          🏛️ Idle Empire
        </h1>
        <p className="text-stone-400">
          {mode === "login" ? "Welcome back, Caesar!" : "Build your empire!"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <div>
            <label className="block text-sm font-semibold mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field w-full"
              placeholder="Caesar Augustus"
              required
              minLength={3}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-2">
            {mode === "login" ? "Email or Username" : "Email"}
          </label>
          <input
            type={mode === "login" ? "text" : "email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field w-full"
            placeholder={mode === "login" ? "demo" : "caesar@rome.com"}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field w-full"
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "..." : mode === "login" ? "Enter Empire" : "Found Empire"}
        </button>
      </form>

      <div className="text-center mt-6">
        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="text-empire-gold hover:text-empire-bronze transition-colors underline"
        >
          {mode === "login" 
            ? "New to the realm? Create an empire" 
            : "Already rule? Enter your empire"
          }
        </button>
      </div>

      {mode === "login" && (
        <div className="text-center mt-4 p-3 bg-stone-700 rounded-lg">
          <p className="text-xs text-stone-300">
            <strong>Demo:</strong> demo / demo123
          </p>
        </div>
      )}
    </div>
  );
}