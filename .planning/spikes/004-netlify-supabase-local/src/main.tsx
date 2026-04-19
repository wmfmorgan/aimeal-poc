import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

// tRPC client routes through Netlify proxy → Supabase Edge Function
const trpc = createTRPCClient<any>({
  links: [
    httpBatchLink({
      url: "/functions/v1/trpc",
    }),
  ],
});

// Supabase client via Netlify proxy
const SUPABASE_URL = "http://localhost:8888";
const SUPABASE_ANON_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

function App() {
  const [results, setResults] = useState<string[]>([]);

  const log = (msg: string) => setResults(prev => [`[${new Date().toISOString()}] ${msg}`, ...prev]);

  const testPing = async () => {
    try {
      const data = await trpc.ping.query();
      log(`PASS ping: ${JSON.stringify(data)}`);
    } catch (e: any) {
      log(`FAIL ping: ${e.message}`);
    }
  };

  const testDraft = async () => {
    try {
      const data = await trpc.generateDraft.mutate({
        householdId: "00000000-0000-0000-0000-000000000001",
        numDays: 7,
      });
      log(`PASS generateDraft: ${JSON.stringify(data)}`);
    } catch (e: any) {
      log(`FAIL generateDraft: ${e.message}`);
    }
  };

  const testSupabaseRest = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/households?select=id&limit=1`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      const data = await res.json();
      log(`PASS supabase rest (${res.status}): ${JSON.stringify(data)}`);
    } catch (e: any) {
      log(`FAIL supabase rest: ${e.message}`);
    }
  };

  return (
    <div style={{ fontFamily: "monospace", padding: "2rem", background: "#0f0f0f", color: "#e0e0e0", minHeight: "100vh" }}>
      <h2>Spike 004: Netlify ↔ Supabase Local</h2>
      <p style={{ color: "#888" }}>All requests go through Netlify proxy on port 8888 → Supabase on 54331</p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button onClick={testPing} style={btn}>tRPC ping</button>
        <button onClick={testDraft} style={btn}>tRPC generateDraft</button>
        <button onClick={testSupabaseRest} style={btn}>Supabase REST</button>
      </div>

      <div style={{ background: "#1a1a1a", padding: "1rem", borderRadius: "4px", minHeight: "200px" }}>
        {results.length === 0 && <span style={{ color: "#555" }}>Click a button to test...</span>}
        {results.map((r, i) => (
          <div key={i} style={{ color: r.includes("PASS") ? "#4ade80" : "#f87171", marginBottom: "0.25rem" }}>
            {r}
          </div>
        ))}
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "0.5rem 1rem",
  cursor: "pointer",
  borderRadius: "4px",
};

createRoot(document.getElementById("root")!).render(<App />);
