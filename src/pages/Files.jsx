import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import PageTransition from "../components/PageTransition";
import Modal from "../components/Modal";
import { getBlob, putBlob, deleteBlob } from "../lib/fileStore";

const WO_STORAGE_KEY = "gmn_workorders_v1";
const FILES_STORAGE_KEY = "gmn_files_v1";

function safeParse(raw, fallback) {
  try {
    const v = raw ? JSON.parse(raw) : fallback;
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function loadWorkOrders() {
  const v = safeParse(localStorage.getItem(WO_STORAGE_KEY), []);
  return Array.isArray(v) ? v : [];
}

function loadFiles() {
  const v = safeParse(localStorage.getItem(FILES_STORAGE_KEY), []);
  return Array.isArray(v) ? v : [];
}

function saveFiles(list) {
  localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(list));
}

function uid() {
  return crypto?.randomUUID ? crypto.randomUUID() : String(Date.now());
}

function isAllowedType(type) {
  return (
    type === "application/pdf" ||
    type.startsWith("image/") ||
    type.startsWith("video/")
  );
}

function formatBytes(bytes) {
  const b = Number(bytes || 0);
  if (!Number.isFinite(b) || b <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = b;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function Files() {
  const workOrders = useMemo(() => loadWorkOrders(), []);
  const [files, setFiles] = useState(() => loadFiles());

  const [open, setOpen] = useState(false);
  const [woId, setWoId] = useState("");

  // ✅ UX
  const [q, setQ] = useState("");
  const [showOrphans, setShowOrphans] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => saveFiles(files), [files]);

  const filesWithWO = useMemo(() => {
    const woById = new Map(workOrders.map((w) => [w.id, w]));
    return files.map((f) => ({
      ...f,
      wo: woById.get(f.woId) || null, // null means orphan
    }));
  }, [files, workOrders]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return filesWithWO.filter((f) => {
      if (!showOrphans && !f.wo) return false;

      const blob = [
        f.wo?.wo,
        f.wo?.client,
        f.name,
        f.type,
        f.createdAt,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !text || blob.includes(text);
    });
  }, [filesWithWO, q, showOrphans]);

  async function handleUpload(selectedFiles, resetInput) {
    if (uploading) return;

    if (!woId) {
      alert("Select a Work Order first.");
      return;
    }

    const list = Array.from(selectedFiles || []);
    if (!list.length) return;

    setUploading(true);
    try {
      for (const file of list) {
        if (!isAllowedType(file.type)) {
          alert(`Unsupported file type: ${file.type || "unknown"}`);
          continue;
        }

        // store blob in IndexedDB
        const id = uid();
        await putBlob(id, file);

        // store metadata in localStorage
        const record = {
          id,
          woId,
          name: file.name,
          type: file.type,
          size: file.size,
          createdAt: new Date().toISOString(),
        };

        setFiles((prev) => [record, ...prev]);
      }

      setOpen(false);
    } finally {
      setUploading(false);
      resetInput?.();
    }
  }

  async function previewFile(f) {
    const blob = await getBlob(f.id);
    if (!blob) {
      alert("File not found in local storage (IndexedDB).");
      return;
    }

    const url = URL.createObjectURL(blob);

    // open safely
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) alert("Popup blocked. Please allow popups to preview.");

    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function removeFile(f) {
    const ok = confirm(`Delete this file?\n\n${f.name}\n\nThis cannot be undone.`);
    if (!ok) return;

    await deleteBlob(f.id);
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
  }

  return (
    <PageTransition>
      <div className="space-y-5">
        <PageHeader
          title="Files"
          subtitle="Upload and attach documents to specific Work Orders."
          actions={
            <button className="btn-primary" onClick={() => setOpen(true)} type="button">
              Upload
            </button>
          }
        />

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ui-hover">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-7">
              <input
                className="input"
                placeholder="Search WO#, client, file name, type…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-2">
              <button
                type="button"
                className={[
                  "rounded-xl px-3 py-2 text-xs font-semibold ui-hover ui-focus tap-feedback w-full",
                  showOrphans
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800",
                ].join(" ")}
                onClick={() => setShowOrphans((v) => !v)}
                title="Orphans are files whose WO was deleted or missing."
              >
                {showOrphans ? "Showing Orphans" : "Hide Orphans"}
              </button>
            </div>

            <div className="md:col-span-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
              <span className="font-semibold">Results</span>
              <span className="tabular-nums">{filtered.length}</span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">Attached Files</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Metadata in localStorage + blobs in IndexedDB.
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {filtered.length} items
            </div>
          </div>

          <div className="overflow-auto gmn-scroll">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 border-b border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">WO#</th>
                  <th className="px-4 py-3 text-left font-semibold">File</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Uploaded</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((f, idx) => (
                  <tr
                    key={f.id}
                    className={[
                      "border-t border-slate-100 dark:border-slate-800/70",
                      idx % 2 === 0
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-50/30 dark:bg-slate-900/60",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3 font-semibold">
                      {f.wo?.wo || (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/40">
                          Orphan
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatBytes(f.size)}
                      </div>
                    </td>

                    <td className="px-4 py-3">{f.type || "—"}</td>

                    <td className="px-4 py-3">
                      {f.createdAt ? new Date(f.createdAt).toLocaleString() : "—"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn-ghost px-3 py-1.5 text-xs"
                          onClick={() => previewFile(f)}
                          type="button"
                        >
                          Preview
                        </button>
                        <button
                          className="rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 dark:bg-white dark:text-slate-900 ui-hover ui-focus tap-feedback"
                          onClick={() => removeFile(f)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center">
                      <div className="text-sm font-semibold">No files</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Upload files and attach them to a Work Order.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <UploadModal
          open={open}
          onClose={() => setOpen(false)}
          workOrders={workOrders}
          woId={woId}
          setWoId={setWoId}
          uploading={uploading}
          onUpload={handleUpload}
        />
      </div>
    </PageTransition>
  );
}

function UploadModal({ open, onClose, workOrders, woId, setWoId, uploading, onUpload }) {
  const inputRef = useRef(null);

  return (
    <Modal
      open={open}
      title="Upload Files"
      subtitle="Attach PNG/JPEG/PDF/MP4 directly to a Work Order."
      onClose={onClose}
    >
      <div className="grid gap-4">
        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Work Order *
          </div>
          <div className="mt-1">
            <select
              className="input"
              value={woId}
              onChange={(e) => setWoId(e.target.value)}
              disabled={uploading}
            >
              <option value="" disabled>
                Select WO#
              </option>
              {workOrders.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.wo} • {w.client}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Files
          </div>
          <div className="mt-1">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,video/mp4"
              className="input"
              disabled={!woId || uploading}
              onChange={(e) =>
                onUpload(e.target.files, () => {
                  if (inputRef.current) inputRef.current.value = "";
                })
              }
            />
          </div>

          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Note: Large videos can be heavy in the browser. Stage 2 should move this to backend storage.
          </div>

          {uploading ? (
            <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
              Uploading…
            </div>
          ) : null}
        </label>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost px-4 py-2.5" type="button">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
