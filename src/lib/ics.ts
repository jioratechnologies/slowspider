import type { Cluster, Task } from "./types";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function icsDate(dateStr: string, offsetDays: number): string {
  const d = new Date(dateStr + "T00:00:00");
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
}

function icsStamp(): string {
  const d = new Date();
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function icsEsc(s: string | null | undefined): string {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildICS(tasks: Task[], clusters: Cluster[]): string | null {
  const withDates = tasks.filter((t) => t.deadline);
  if (!withDates.length) return null;
  const clusterName = (id: number | null) => clusters.find((c) => c.id === id)?.name || "Floating";
  const stamp = icsStamp();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Slow Spider//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Slow Spider",
  ];
  withDates.forEach((t) => {
    const pfx =
      t.priority && t.priority !== "none"
        ? `[${t.priority === "med" ? "Medium" : t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}] `
        : "";
    const desc = [t.notes || "", "Cluster: " + clusterName(t.cluster_id), t.done ? "(completed)" : ""]
      .filter(Boolean)
      .join("\n");
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + t.id + "@slow-spider",
      "DTSTAMP:" + stamp,
      "DTSTART;VALUE=DATE:" + icsDate(t.deadline!, 0),
      "DTEND;VALUE=DATE:" + icsDate(t.deadline!, 1),
      "SUMMARY:" + icsEsc(pfx + t.title),
      "DESCRIPTION:" + icsEsc(desc),
      "STATUS:CONFIRMED",
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      "DESCRIPTION:" + icsEsc("Deadline tomorrow: " + t.title),
      "END:VALARM",
      "END:VEVENT"
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICS(tasks: Task[], clusters: Cluster[]): boolean {
  const ics = buildICS(tasks, clusters);
  if (!ics) return false;
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "slowspider.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function readJSONFile<T = unknown>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)) as T);
      } catch {
        reject(new Error("That file isn't valid JSON."));
      }
    };
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsText(file);
  });
}

export function downloadJSON(data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "slowspider-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
