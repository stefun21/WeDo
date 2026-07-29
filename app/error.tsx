"use client";

import { RotateCcw } from "lucide-react";

export default function ErrorScreen({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="fatal-state">
      <section>
        <div>!</div>
        <p>WEDO RECOVERY</p>
        <h1>Something didn’t load correctly</h1>
        <span>Your data is safe. Retry the connection or refresh the application.</span>
        <button onClick={reset}><RotateCcw /> Try again</button>
      </section>
    </main>
  );
}
