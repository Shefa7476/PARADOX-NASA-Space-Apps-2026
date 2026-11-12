import { CirclePlay } from "lucide-react";
export default function TutorialReplayButton() {
  return <button type="button" onClick={() => window.dispatchEvent(new Event("paradox:show-tutorial"))} className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 px-4 py-2 text-sm font-bold text-cyan-200 transition hover:bg-cyan-300/10"><CirclePlay size={17} /> Replay game tutorial</button>;
}
