"use client";

import { ArrowRight, Check, Eye, EyeOff, KeyRound, Lock, ShieldCheck, UserRound, Users } from "lucide-react";
import { FormEvent, useState } from "react";

type Mode = "login" | "register" | "recover";

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      if (data.recoveryCode) {
        setRecoveryCode(data.recoveryCode);
      } else {
        window.location.reload();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (recoveryCode) {
    return (
      <main className="auth-shell">
        <section className="recovery-card">
          <div className="success-icon"><ShieldCheck /></div>
          <p className="auth-kicker">ACCOUNT CREATED</p>
          <h1>Save your recovery code</h1>
          <p>This is the only way to reset your password. Keep it somewhere private.</p>
          <button className="recovery-code" onClick={() => navigator.clipboard.writeText(recoveryCode)}>
            {recoveryCode}<span>Click to copy</span>
          </button>
          <button className="auth-submit" onClick={() => window.location.reload()}>
            Continue to WeDo <ArrowRight />
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="auth-logo"><span><Check /></span>WeDo</div>
        <div>
          <p className="auth-kicker">BETTER TOGETHER</p>
          <h1>Everything your group needs, in one shared space.</h1>
          <p>Tasks, shopping lists, conversations and plans — synchronized and always within reach.</p>
        </div>
        <ul>
          <li><Check /> Your data stays private</li>
          <li><Check /> Works on phone and desktop</li>
          <li><Check /> No email address required</li>
        </ul>
        <div className="auth-orbit"><Users /></div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <p className="auth-kicker">{mode === "login" ? "WELCOME BACK" : mode === "register" ? "CREATE YOUR SPACE" : "ACCOUNT RECOVERY"}</p>
          <h2>{mode === "login" ? "Sign in to WeDo" : mode === "register" ? "Create your account" : "Reset your password"}</h2>
          <p className="auth-helper">
            {mode === "login" ? "Continue where your group left off." : mode === "register" ? "No email, no phone number, no tracking." : "Use the recovery code you saved."}
          </p>

          <form onSubmit={submit}>
            {mode === "register" ? (
              <label>
                Display name
                <span><UserRound /><input name="displayName" minLength={2} maxLength={40} placeholder="How others will see you" required /></span>
              </label>
            ) : null}
            <label>
              Username
              <span><UserRound /><input name="username" minLength={3} maxLength={24} pattern="[a-zA-Z0-9_-]+" placeholder="your_username" autoComplete="username" required /></span>
            </label>
            {mode === "recover" ? (
              <label>
                Recovery code
                <span><KeyRound /><input name="recoveryCode" placeholder="WEDO-XXXX-XXXX-XXXX" required /></span>
              </label>
            ) : null}
            <label>
              {mode === "recover" ? "New password" : "Password"}
              <span>
                <Lock />
                <input name="password" type={showPassword ? "text" : "password"} minLength={8} maxLength={72} placeholder="At least 8 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label="Show or hide password">
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </span>
            </label>

            {error ? <div className="auth-error">{error}</div> : null}

            <button className="auth-submit" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Reset password"}
              {!loading ? <ArrowRight /> : null}
            </button>
          </form>

          <div className="auth-links">
            {mode === "login" ? (
              <>
                <button onClick={() => setMode("recover")}>Forgot password?</button>
                <p>New to WeDo? <button onClick={() => setMode("register")}>Create an account</button></p>
              </>
            ) : (
              <p>Already have an account? <button onClick={() => setMode("login")}>Sign in</button></p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
