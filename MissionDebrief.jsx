
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { authFetch } from "../services/api";
import {
  ArrowLeft,
  Award,
  Download,
  FileJson,
  FileText,
  Satellite,
  Activity,
  CircleCheckBig,
  TriangleAlert,
  BookOpen
} from "lucide-react";

const API = (import.meta.env.VITE_API_BASE_URL === "same-origin" ? "" : (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"));
const LEARNING_FACTS = {
  1: ["Spacecraft use radio waves to send messages across huge distances.", "Antennas need to point in the right direction and the radio system needs power."],
  2: ["A spacecraft crew needs oxygen and safe cabin pressure.", "Life-support systems monitor air and can isolate a leaking section."],
  3: ["Solar flares are sudden bursts of energy from the Sun.", "Spacecraft can use safe modes and shielding to reduce radiation risk."],
  4: ["Rovers explore using wheels, cameras and navigation sensors.", "Engineers use backup systems when a sensor or motor stops working."],
  5: ["A spacecraft follows a planned path called a trajectory.", "Small, carefully checked engine burns can correct a spacecraft's route."],
  6: ["Fire behaves differently in microgravity, but smoke and heat are still dangerous.", "Crews isolate the affected area and follow a tested emergency plan."],
  7: ["Spacecraft need to balance solar power, batteries and electricity use.", "Essential systems get priority when available power becomes limited."],
  8: ["Landing on Mars requires a carefully planned descent.", "Sensors, parachutes and engines work together to help a lander touch down safely."],
};

function ScoreCard({ label, value, maximum }) {
  return (
    <div className="rounded-xl bg-slate-800 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">
        {value}
        <span className="text-sm text-slate-400">
          /{maximum}
        </span>
      </p>
    </div>
  );
}

export default function MissionDebrief() {
  const { sessionId } = useParams();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadReport() {
      setLoading(true);
      setError("");
      setReport(null);

      try {
        const response = await authFetch(
          `${API}/api/debrief/${encodeURIComponent(sessionId)}`,
          { signal: controller.signal }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : "Unable to load report"
          );
        }

        setReport(data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => controller.abort();
  }, [sessionId]);

  async function downloadReport(format) {
    if (downloading) return;

    setDownloading(format);
    setError("");

    try {
      const response = await authFetch(
        `${API}/api/debrief/${encodeURIComponent(sessionId)}/${format}`
      );

      if (!response.ok) {
        throw new Error("Report download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `PARADOX_Mission_Report.${format}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading("");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Loading scientific mission report...
      </main>
    );
  }

  if (error && !report) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <p className="text-red-400">{error}</p>
        <Link to="/branching" className="mt-5 block text-cyan-400">
          Return to Mission
        </Link>
      </main>
    );
  }

  if (!report) return null;

  const score = report.score;
  const success = report.status === "SUCCESS";

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-white">
      <Link
        to="/branching"
        className="flex items-center gap-2 text-cyan-400"
      >
        <ArrowLeft size={18} />
        Back to Mission
      </Link>

      <header className="mt-8">
        <div className="flex items-center gap-3">
          <Award size={34} className="text-cyan-400" />
          <div>
            <h1 className="text-3xl font-bold">
              Scientific Mission Debrief
            </h1>
            <p className="mt-1 text-slate-400">
              {report.mission_title}
            </p>
          </div>
        </div>
      </header>

      <section className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-950/30 p-6">
        <div className="flex items-center gap-2 text-cyan-200"><BookOpen size={20}/><h2 className="text-xl font-black">Today you learned</h2></div>
        <p className="mt-2 text-sm text-slate-300">Every mission is a chance to practise real science and engineering thinking.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">{(LEARNING_FACTS[report.mission_id] || ["Scientists use evidence to understand space.", "Engineers test systems and plan safe backup actions."]).map((fact) => <li key={fact} className="rounded-xl bg-slate-950/50 p-4 text-sm leading-6 text-slate-200">⭐ {fact}</li>)}</ul>
        <p className="mt-3 text-xs text-cyan-100/70">Classroom connections: space science · engineering design · evidence-based decisions.</p>
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              {success ? (
                <CircleCheckBig className="text-green-400" />
              ) : (
                <TriangleAlert className="text-red-400" />
              )}

              <span className="text-xl font-bold">
                Mission {report.status}
              </span>
            </div>

            <p className="mt-3 text-slate-400">
              Difficulty: {report.difficulty}
            </p>
          </div>

          <div className="text-right">
            <p className="text-5xl font-bold text-cyan-400">
              {score.total}
              <span className="text-xl text-slate-400">/100</span>
            </p>
            <p className="mt-2 text-lg">
              Grade: {score.grade}
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <ScoreCard
            label="Mission Outcome"
            value={score.outcome}
            maximum={30}
          />
          <ScoreCard
            label="Decision Quality"
            value={score.decisions}
            maximum={45}
          />
          <ScoreCard
            label="Resource Management"
            value={score.resources}
            maximum={25}
          />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-slate-900 p-6">
          <div className="flex items-center gap-2">
            <Satellite className="text-cyan-400" />
            <h2 className="text-xl font-bold">
              NASA Solar Flare Event
            </h2>
          </div>

          <div className="mt-5 space-y-3 text-sm text-slate-300">
            <p>Event ID: {report.nasa_event.event_id}</p>
            <p>Flare Class: {report.nasa_event.class_type}</p>
            <p>Begin: {report.nasa_event.begin_time}</p>
            <p>Peak: {report.nasa_event.peak_time}</p>
            <p>End: {report.nasa_event.end_time || "Unknown"}</p>
          </div>
        </section>

        <section className="rounded-2xl bg-slate-900 p-6">
          <div className="flex items-center gap-2">
            <Activity className="text-cyan-400" />
            <h2 className="text-xl font-bold">
              Resource Analysis
            </h2>
          </div>

          <div className="mt-5 space-y-4">
            {report.resources.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-sm">
                  <span className="capitalize">
                    {item.name}
                  </span>

                  <span>
                    {item.initial} → {item.final}
                    {" "}
                    ({item.change > 0 ? "+" : ""}
                    {item.change})
                  </span>
                </div>

                <div className="mt-2 h-2 rounded-full bg-slate-700">
                  <div
                    className={`h-2 rounded-full ${
                      item.final <= 25
                        ? "bg-red-400"
                        : item.final <= 50
                        ? "bg-amber-400"
                        : "bg-cyan-400"
                    }`}
                    style={{
                      width: `${item.final}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl bg-slate-900 p-6">
        <h2 className="text-xl font-bold">
          Decision Timeline
        </h2>

        <div className="mt-5 space-y-4">
          {report.decisions.map((decision) => (
            <div
              key={decision.step}
              className="rounded-xl bg-slate-800 p-5"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <h3 className="font-bold">
                  Decision {decision.step}
                </h3>

                <span className={`text-sm font-semibold ${
                  decision.assessment === "RECOMMENDED"
                    ? "text-green-400"
                    : "text-amber-400"
                }`}>
                  {decision.assessment}
                </span>
              </div>

              <p className="mt-3 text-sm text-cyan-300">
                {decision.from_node} → {decision.to_node}
              </p>

              <p className="mt-3">
                {decision.action}
              </p>

              <p className="mt-3 text-sm text-slate-400">
                {decision.feedback}
              </p>

              <p className="mt-3 text-sm text-slate-500">
                Engineering Principle:{" "}
                {decision.scientific_principle}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-slate-900 p-6">
        <h2 className="text-xl font-bold">
          Mission Recommendations
        </h2>

        <ul className="mt-4 list-disc space-y-3 pl-5 text-slate-300">
          {report.recommendations.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl bg-slate-900 p-6">
        <h2 className="text-xl font-bold">
          Scientific References
        </h2>

        <div className="mt-4 space-y-3">
          {report.references.map((ref) => (
            <a
              key={ref.url}
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg bg-slate-800 p-4 text-cyan-300 hover:bg-slate-700"
            >
              {ref.title}
              <span className="mt-1 block text-xs text-slate-400">
                {ref.organization}
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-cyan-500/20 bg-slate-900 p-6">
        <h2 className="text-xl font-bold">
          Download Mission Report
        </h2>

        <div className="mt-5 flex flex-wrap gap-4">
          <button
            onClick={() => downloadReport("pdf")}
            disabled={Boolean(downloading)}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 font-bold text-slate-950 disabled:opacity-50"
          >
            <FileText size={18} />
            <Download size={16} />
            {downloading === "pdf" ? "Preparing..." : "Download PDF"}
          </button>

          <button
            onClick={() => downloadReport("json")}
            disabled={Boolean(downloading)}
            className="flex items-center gap-2 rounded-xl bg-slate-700 px-6 py-3 font-bold disabled:opacity-50"
          >
            <FileJson size={18} />
            <Download size={16} />
            {downloading === "json" ? "Preparing..." : "Download JSON"}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-red-400">
            {error}
          </p>
        )}

        <p className="mt-5 text-xs leading-6 text-slate-400">
          {report.scientific_disclaimer}
        </p>
      </section>
    </main>
  );
}
