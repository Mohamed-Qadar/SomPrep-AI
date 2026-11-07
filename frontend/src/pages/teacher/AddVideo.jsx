import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { teacherApi } from "../../services/endpoints";
import {
  Video,
  ArrowLeft,
  Check,
  Plus,
  Loader2,
  Sparkles,
} from "lucide-react";

export default function AddVideo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState(12);
  const [videoType, _setVideoType] = useState("link");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [duration, setDuration] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim() || !subject.trim() || !videoUrl.trim()) {
      setError("Fadlan buuxi meelaha loo baahan yahay (Title, Subject, Video URL).");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        subject: subject.trim(),
        grade_level: parseInt(gradeLevel),
        video_type: videoType,
        video_url: videoUrl.trim(),
        thumbnail_url: thumbnailUrl.trim() || null,
        duration_minutes: parseInt(duration) || 0,
        is_published: true,
      };

      await teacherApi.createVideo(payload);
      setSuccess("Muuqaalka cusub waa la daabacay si guul leh!");
      setTimeout(() => {
        navigate("/teacher/videos");
      }, 1500);
    } catch (err) {
      console.error("Error creating video:", err);
      setError(
        err.response?.data?.detail || "Waxaa dhacay qalad intii lagu jiray keydinta muuqaalka."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/teacher/videos")}
          className="rounded-lg p-2 hover:bg-slate-800 border border-transparent hover:border-brand-border transition-all text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-outfit text-2xl font-black text-white">Ku Dar Muuqaal Cusub</h1>
          <p className="text-slate-500 text-xs mt-0.5">Soo geli cashar muuqaal ah oo cusub oo ardaydu daawan karaan.</p>
        </div>
      </div>

      {error && (
        <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm rounded-xl p-4 animate-fade-in">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-brand-success/10 border border-brand-success/20 text-brand-success text-sm rounded-xl p-4 animate-fade-in">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel border border-brand-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl relative">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Cinwaanka Casharka (Video Lesson Title) <span className="text-brand-primary font-bold">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Cutubka 1aad: Hordhaca Xisaabta"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3.5 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Sharaxaadda (Description)
          </label>
          <textarea
            rows={3}
            placeholder="Geli sharraxaad kooban oo ku saabsan casharkan..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3.5 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Maaddada (Subject) <span className="text-brand-primary font-bold">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Mathematics, Physics"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3.5 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Fasalka (Grade Level) <span className="text-brand-primary font-bold">*</span>
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(parseInt(e.target.value))}
              className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3.5 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Vimeo / HLS / YouTube URL <span className="text-brand-primary font-bold">*</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3.5 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Muddada Casharka (Duration in Minutes)
            </label>
            <input
              type="number"
              required
              min={0}
              placeholder="e.g. 15"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3.5 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Thumbnail Image Link (Optional URL)
          </label>
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3.5 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border/40">
          <button
            type="button"
            onClick={() => navigate("/teacher/videos")}
            className="rounded-xl border border-brand-border px-5 py-3 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Ka Bax (Cancel)
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-blue-600 px-6 py-3 text-xs font-semibold text-white transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Publish Video</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
