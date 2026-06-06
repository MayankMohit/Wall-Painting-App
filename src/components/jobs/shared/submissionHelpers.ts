export function relativeTime(dateString: string): string {
  const secs = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (secs < 60) return "Just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 172800) return "Yesterday";
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function shortId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}

export function formatSubmissionDate(dateString: string): { date: string; time: string } {
  const d = new Date(dateString);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}
