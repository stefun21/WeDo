"use client";

import { ArrowRight, Check, Home, Link2, LogOut, Plus, Users } from "lucide-react";
import { FormEvent, useState } from "react";

export default function GroupSetup({ displayName }: { displayName: string }) {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(mode === "create" ? "/api/groups" : "/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Something went wrong.");
      setLoading(false);
      return;
    }
    window.location.reload();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  return (
    <main className="group-setup-shell">
      <header><div className="auth-logo"><span><Check /></span>WeDo</div><button onClick={logout}><LogOut /> Log out</button></header>
      <section className="group-setup-card">
        <p className="auth-kicker">WELCOME, {displayName.toUpperCase()}</p>
        <h1>{mode === "choose" ? "Let’s find your people." : mode === "create" ? "Create a shared space." : "Join your group."}</h1>
        <p>{mode === "choose" ? "Every list, task and conversation lives inside a private group." : mode === "create" ? "You’ll be the owner and can invite members next." : "Enter the private invitation code shared by a group member."}</p>

        {mode === "choose" ? (
          <div className="group-choice-grid">
            <button onClick={() => setMode("create")}><i><Home /></i><strong>Create a group</strong><span>Start a new space for your family, friends or team.</span><ArrowRight /></button>
            <button onClick={() => setMode("join")}><i><Link2 /></i><strong>Join with a code</strong><span>Use a WeDo code sent by someone you know.</span><ArrowRight /></button>
          </div>
        ) : (
          <form className="group-form" onSubmit={submit}>
            <label>
              {mode === "create" ? "Group name" : "Invitation code"}
              <span>{mode === "create" ? <Users /> : <Link2 />}<input name={mode === "create" ? "name" : "code"} maxLength={60} placeholder={mode === "create" ? "Our Home" : "WEDO-XXXXXXXX"} required /></span>
            </label>
            {error ? <div className="auth-error">{error}</div> : null}
            <button className="auth-submit" disabled={loading}>{loading ? "Please wait..." : mode === "create" ? "Create group" : "Join group"} <Plus /></button>
            <button type="button" className="back-link" onClick={() => setMode("choose")}>← Back</button>
          </form>
        )}
      </section>
    </main>
  );
}
