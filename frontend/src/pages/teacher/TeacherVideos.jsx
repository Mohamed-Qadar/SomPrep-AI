import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { teacherApi } from "../../services/endpoints";
import LoadingState from "../../components/LoadingState";
import {
  Video,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Layers,
  Sparkles,
  Edit2,
  X,
  Save,
} from "lucide-react";

export default function TeacherVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit Video Modal State
  const [editingVideo, setEditingVideo] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editGrade, setEditGrade] = useState(12);
  const [editUrl, setEditUrl] = useState("");
  const [editDuration, setEditDuration] = useState(0);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await teacherApi.videos();
      setVideos(res.data);
    } catch (err) {
      console.error("Error loading teacher videos:", err);
      setError("Waxaa dhacay qalad intii lagu jiray soo dejinta muuqaallada.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm("Ma hubtaa inaad rabto inaad tirto muuqaalkan?");
    if (!confirm) return;

    try {
      setError("");
      setSuccess("");
      await teacherApi.deleteVideo(id);
      setVideos((prev) => prev.filter((v) => v.id !== id));
      setSuccess("Muuqaalka waa la tirtiray si guul leh!");
    } catch (err) {
      console.error("Error deleting video:", err);
      setError("Ma suurtagelin in la tirtiro muuqaalka.");
    }
  };

  const handleTogglePublish = async (id) => {
    try {
      setError("");
      setSuccess("");
      const res = await teacherApi.publishVideo(id);
      setVideos((prev) =>
        prev.map((v) => (v.id === id ? res.data : v))
      );
      setSuccess("Xaaladda daabacaadda waa la beddelay si guul leh!");
    } catch (err) {
      console.error("Error toggling publish:", err);
      setError("Ma suurtagelin in la beddelo xaaladda daabacaadda.");
    }
  };

  const startEdit = (video) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDesc(video.description || "");
    setEditSubject(video.subject);
    setEditGrade(video.grade_level);
    setEditUrl(video.video_url);
    setEditDuration(video.duration_minutes);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editSubject.trim() || !editUrl.trim()) {
      setError("Fadlan buuxi meelaha loo baahan yahay (Title, Subject, Video URL).");
      return;
    }

    try {
      setError("");
      setSuccess("");
      const payload = {
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        subject: editSubject.trim(),
        grade_level: parseInt(editGrade),
        video_url: editUrl.trim(),
        duration_minutes: parseInt(editDuration),
      };

      const res = await teacherApi.updateVideo(editingVideo.id, payload);
      setVideos((prev) =>
        prev.map((v) => (v.id === editingVideo.id ? res.data : v))
      );
      setSuccess("Muuqaalka waa la cusbooneysiiyay si guul leh!");
      setEditingVideo(null);
    } catch (err) {
      console.error("Error updating video:", err);
      setError("Ma suurtagelin in la cusbooneysiiyo muuqaalka.");
    }
  };

  if (loading) {
    return <LoadingState label="Loading video resources..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-border/60 pb-5">
        <div>
          <h1 className="font-outfit text-2xl font-black text-white flex items-center gap-2">
            <Video className="h-6 w-6 text-brand-primary" />
            <span>Maamulka Muuqaallada (My Videos)</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Fiiri, beddel, daabac, ama tirtir casharrada muuqaalka ah ee aad soo gelisay.
          </p>
        </div>
        <Link
          to="/teacher/videos/add"
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-lg hover:shadow-brand-primary/20 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Ku Dar Muuqaal (Add Video)</span>
        </Link>
      </div>

      {error && (
        <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm rounded-xl p-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-brand-success/10 border border-brand-success/20 text-brand-success text-sm rounded-xl p-4">
          {success}
        </div>
      )}

      {videos.length === 0 ? (
        <div className="glass-panel border border-brand-border rounded-2xl p-16 text-center shadow-xl">
          <Video className="h-12 w-12 text-slate-650 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-4">Ma jiraan casharro muuqaal ah oo aad weli daabacday.</p>
          <Link
            to="/teacher/videos/add"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline"
          >
            <span>Soo geli muuqaalkii ugu horreeyay</span>
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="glass-panel border border-brand-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-border bg-slate-900/30 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="p-4 pl-6">Muuqaalka (Video Lesson)</th>
                  <th className="p-4">Maaddada / Fasalka</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Views</th>
                  <th className="p-4">Published</th>
                  <th className="p-4 pr-6 text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40 text-sm text-slate-350">
                {videos.map((video) => (
                  <tr key={video.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-16 bg-slate-950 border border-brand-border rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative group">
                          {video.thumbnail_url ? (
                            <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Video className="h-4 w-4 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white leading-tight">{video.title}</div>
                          {video.description && (
                            <div className="text-[11px] text-slate-500 max-w-[250px] truncate mt-0.5">{video.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-brand-indigo">{video.subject}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Grade {video.grade_level}</div>
                    </td>
                    <td className="p-4 font-mono text-xs">{video.duration_minutes} mins</td>
                    <td className="p-4 font-mono text-xs">{video.view_count}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleTogglePublish(video.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${
                          video.is_published
                            ? "bg-brand-success/10 text-brand-success border-brand-success/20 hover:bg-brand-success/20"
                            : "bg-slate-900 text-slate-500 border-slate-700 hover:text-white"
                        }`}
                      >
                        {video.is_published ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            <span>Published</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            <span>Draft</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="p-4 pr-6 text-right shrink-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(video)}
                          className="rounded-lg p-2 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(video.id)}
                          className="rounded-lg p-2 text-slate-500 hover:text-brand-danger hover:bg-brand-danger/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Video Modal */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-2xl animate-fade-in my-8">
            <div className="flex items-center justify-between p-6 border-b border-brand-border">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-brand-primary" />
                <h3 className="font-outfit text-lg font-bold text-white">Cusbooneysii Muuqaalka (Edit Video)</h3>
              </div>
              <button
                onClick={() => setEditingVideo(null)}
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Cinwaanka Muuqaalka (Video Title)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cutubka 1aad: Hordhaca Xisaabta"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Sharaxaadda Muuqaalka (Description)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ku dar sharaxaad kooban oo ku saabsan casharkan..."
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    Maaddada (Subject)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    Fasalka (Grade Level)
                  </label>
                  <select
                    value={editGrade}
                    onChange={(e) => setEditGrade(parseInt(e.target.value))}
                    className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    Url-ka Muuqaalka (Vimeo/HLS/YouTube URL)
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    Muddada (Minutes)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editDuration}
                    onChange={(e) => setEditDuration(parseInt(e.target.value))}
                    className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="rounded-xl border border-brand-border px-5 py-3 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Ka Bax (Cancel)
                </button>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-blue-600 px-6 py-3 text-xs font-semibold text-white transition-all"
                >
                  <Save className="h-4 w-4" />
                  <span>Cusbooneysii (Save)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
