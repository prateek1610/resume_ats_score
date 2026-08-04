"use client";

import { useState } from "react";

export function AccountDataControls({ signOutHref }: { signOutHref: string }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteData() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Deletion failed.");
      window.location.assign(signOutHref);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Deletion failed. Please retry.");
      setBusy(false);
    }
  }

  return <section className="account-data-panel">
    <div><p className="eyebrow">Account controls</p><h3>Privacy and data</h3><p>Delete every saved report and original resume associated with your signed-in email.</p></div>
    {!open ? <button type="button" onClick={() => setOpen(true)}>Delete all my data</button> : <div className="account-delete-confirm">
      <label htmlFor="delete-account-confirmation">Type <strong>DELETE</strong> to confirm</label>
      <input id="delete-account-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
      <div><button type="button" className="danger-button" disabled={busy || confirmation !== "DELETE"} onClick={deleteData}>{busy ? "Deleting permanently…" : "Permanently delete"}</button><button type="button" disabled={busy} onClick={() => { setOpen(false); setConfirmation(""); setError(""); }}>Cancel</button></div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>}
  </section>;
}
