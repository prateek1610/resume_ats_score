"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteReportButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Delete failed.");
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Delete failed.");
      setBusy(false);
    }
  }

  if (confirming) {
    return <div className="delete-confirm"><span>Delete the report and original file?</span><button onClick={remove} disabled={busy}>{busy ? "Deleting…" : "Yes, delete"}</button><button onClick={() => setConfirming(false)} disabled={busy}>Cancel</button>{error && <small role="alert">{error}</small>}</div>;
  }
  return <button className="delete-button" type="button" onClick={() => setConfirming(true)}>Delete report</button>;
}
