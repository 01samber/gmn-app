import { useEffect, useState, useCallback, useRef } from "react";
import { Upload, Search, Folder, Image, FileText, Video, Trash2, ExternalLink, ChevronDown } from "lucide-react";
import PageTransition from "../components/PageTransition";
import PageHeader from "../components/PageHeader";
import { PageLoader } from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import { filesApi, workOrdersApi } from "../api";

const FILE_TYPES = [
  { value: "all", label: "All Files" },
  { value: "image", label: "Images" },
  { value: "pdf", label: "PDFs" },
  { value: "video", label: "Videos" },
];

function getFileIcon(type) {
  if (type?.startsWith("image/")) return Image;
  if (type === "application/pdf") return FileText;
  if (type?.startsWith("video/")) return Video;
  return Folder;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Files() {
  const [files, setFiles] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [selectedWo, setSelectedWo] = useState("");
  const fileInputRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [filesRes, woRes] = await Promise.all([
        filesApi.getAll({ limit: 100, type: typeFilter !== "all" ? typeFilter : undefined }),
        workOrdersApi.getAll({ limit: 100 }),
      ]);
      setFiles(filesRes.data || []);
      setWorkOrders(woRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUpload(e) {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles?.length) return;

    setUploading(true);
    try {
      for (const file of uploadedFiles) {
        await filesApi.upload(file, selectedWo || null);
      }
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(file) {
    if (!confirm(`Delete ${file.name}?`)) return;
    try {
      await filesApi.delete(file.id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  function openFile(file) {
    window.open(filesApi.getUrl(file.path), "_blank");
  }

  const filteredFiles = search
    ? files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : files;

  if (loading) return <PageLoader message="Loading files..." />;

  return (
    <PageTransition>
      <PageHeader
        title="Files"
        icon={Folder}
        subtitle="Upload and manage project files"
        actions={
          <div className="flex items-center gap-3">
            <select
              value={selectedWo}
              onChange={(e) => setSelectedWo(e.target.value)}
              className="input text-sm py-2"
            >
              <option value="">No work order</option>
              {workOrders.map((wo) => (
                <option key={wo.id} value={wo.id}>{wo.woNumber}</option>
              ))}
            </select>
            <label className="btn-primary flex items-center gap-2 cursor-pointer">
              <Upload size={18} />
              {uploading ? "Uploading..." : "Upload"}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,video/*"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        }
      />

      {error && <ErrorMessage error={error} onRetry={loadData} className="mb-6" />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input appearance-none pr-10 min-w-[140px]"
          >
            {FILE_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Files Grid */}
      {filteredFiles.length === 0 ? (
        <EmptyState
          icon={Folder}
          title="No files found"
          description={search || typeFilter !== "all" ? "Try adjusting your filters" : "Upload your first file to get started"}
          actionLabel="Upload File"
          onAction={() => fileInputRef.current?.click()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file.type);
            const isImage = file.type?.startsWith("image/");
            
            return (
              <div key={file.id} className="card overflow-hidden group hover:shadow-lg transition-all">
                {/* Preview */}
                <div
                  className="h-40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer relative overflow-hidden"
                  onClick={() => openFile(file)}
                >
                  {isImage ? (
                    <img
                      src={filesApi.getUrl(file.path)}
                      alt={file.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Icon size={48} className="text-slate-400" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <ExternalLink size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium truncate" title={file.name}>{file.name}</h3>
                  <div className="flex items-center justify-between mt-2 text-sm text-slate-500 dark:text-slate-400">
                    <span>{formatSize(file.size)}</span>
                    {file.workOrder && (
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {file.workOrder.woNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-400">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleDelete(file)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageTransition>
  );
}
