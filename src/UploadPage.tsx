import { useState, type FormEvent } from "react";

export function UploadPage() {
  const [id, setId] = useState("nagymaros-");
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [importedId, setImportedId] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "saving") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("saving");
    setMessage(null);
    setImportedId(null);
    try {
      const res = await fetch("/api/sites", { method: "POST", body: data });
      const payload = (await res.json()) as {
        error?: string;
        site?: { id: string; label: string; metrics: string[] };
      };
      if (!res.ok) {
        throw new Error(payload.error ?? `Hiba (${res.status})`);
      }
      setStatus("ok");
      setImportedId(payload.site?.id ?? id);
      setMessage(
        payload.site
          ? `${payload.site.label} mentve (${payload.site.metrics.join(", ")}). Ellenőrizd a főoldalon, majd commitold a public/data fájlokat.`
          : "Mentve.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Ismeretlen hiba");
    }
  }

  return (
    <div className="app upload-page">
      <header className="hero">
        <h1 className="hero-brand">Helyszín import</h1>
        <p className="section-desc">
          Grafana CSV → JSON a helyi <code>public/data</code> mappába. Csak{" "}
          <code>bun dev</code> alatt. Utána commit és <code>bun run deploy</code>
          .
        </p>
      </header>
      <form className="upload-form" onSubmit={onSubmit}>
        <label className="site-select-label">
          <span className="site-select-caption">Azonosító</span>
          <input
            className="site-select"
            name="id"
            value={id}
            onChange={(event) => setId(event.target.value)}
            required
            autoComplete="off"
            placeholder="nagymaros-iskola01"
          />
        </label>
        <label className="site-select-label">
          <span className="site-select-caption">Felirat</span>
          <input
            className="site-select"
            name="label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            required
            autoComplete="off"
            placeholder="Iskola 01"
          />
        </label>
        <label className="site-select-label">
          <span className="site-select-caption">Grafana CSV (1–3 fájl)</span>
          <input
            className="site-select"
            name="files"
            type="file"
            accept=".csv,text/csv"
            multiple
            required
          />
        </label>
        <button className="export-btn" type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Mentés…" : "Importálás"}
        </button>
        {message ? (
          <p
            className={status === "error" ? "upload-message is-error" : "upload-message"}
            role={status === "error" ? "alert" : "status"}
          >
            {message}
          </p>
        ) : null}
        {importedId ? (
          <p>
            <a href={`/?s=${encodeURIComponent(importedId)}`}>Megnyitás a dashboardon</a>
          </p>
        ) : null}
        <p>
          <a href="/">Vissza a dashboardra</a>
        </p>
      </form>
    </div>
  );
}
