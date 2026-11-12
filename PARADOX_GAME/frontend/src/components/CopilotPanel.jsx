
import { useEffect, useState } from "react";
import { authFetch } from "../services/api";
import {
  Bot,
  Lightbulb,
  LoaderCircle,
  ShieldCheck,
  ExternalLink
} from "lucide-react";

const API = "http://127.0.0.1:8000";

export default function CopilotPanel({
  sessionId,
  nodeId,
  active
}) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setResult(null);
    setError("");
    setQuestion("");
  }, [sessionId, nodeId]);

  async function requestHint() {
    if (!sessionId || !active || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await authFetch(
        `${API}/api/copilot/hint`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            session_id: sessionId,
            question
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to retrieve hint"
        );
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-violet-500/30 bg-slate-900 p-6 text-white">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-500/15 p-3">
          <Bot className="text-violet-400" size={24} />
        </div>

        <div>
          <h2 className="text-xl font-bold">
            PARADOX AI Co-Pilot
          </h2>

          <p className="text-xs text-slate-400">
            Scientific guidance without direct answers
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-slate-800 p-3">
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <ShieldCheck size={16} />
          Mission Context Connected
        </div>

        <p className="mt-2 text-xs text-slate-400">
          Current Stage: {nodeId || "Unavailable"}
        </p>
      </div>

      <label className="mt-5 block text-sm text-slate-300">
        Ask an Engineering Question
      </label>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        maxLength={500}
        rows={3}
        disabled={!active || loading}
        placeholder="What should I consider before making a decision?"
        className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-slate-800 p-3 text-sm outline-none focus:border-violet-400"
      />

      <button
        onClick={requestHint}
        disabled={!active || loading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 font-bold text-white disabled:opacity-40"
      >
        {loading ? (
          <>
            <LoaderCircle size={18} className="animate-spin" />
            Thinking...
          </>
        ) : (
          <>
            <Lightbulb size={18} />
            Get Scientific Hint
          </>
        )}
      </button>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
              {result.provider === "ai"
                ? "AI-Generated Hint"
                : "Grounded Rule-Based Hint"}
            </p>

            <p className="mt-3 text-sm leading-7 text-slate-100">
              {result.hint}
            </p>
          </div>

          <div className="rounded-xl bg-slate-800 p-4">
            <p className="text-xs text-slate-400">
              Engineering Concept
            </p>

            <p className="mt-2 text-sm font-medium">
              {result.concept}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">
              Scientific References
            </h3>

            <div className="mt-3 space-y-2">
              {result.references.map((ref) => (
                <a
                  key={ref.url}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-800 p-3 text-xs text-cyan-300 hover:bg-slate-700"
                >
                  <span>
                    {ref.title}
                    <span className="mt-1 block text-slate-400">
                      {ref.source}
                    </span>
                  </span>

                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Hints used: {result.hints_used} / 6
          </p>

          <p className="text-xs text-slate-500">
            {result.disclaimer}
          </p>
        </div>
      )}
    </section>
  );
}
