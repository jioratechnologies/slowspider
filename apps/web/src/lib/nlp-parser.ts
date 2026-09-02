import type { Cluster, Priority } from "@/lib/types";

export interface ParsedToken {
  type: "priority" | "date" | "time" | "cluster";
  raw: string;
  value: string;
}

export interface ParsedTaskInput {
  cleanTitle: string;
  priority: Priority;
  deadline: string | null; // YYYY-MM-DD
  deadlineTime: string | null; // HH:MM
  clusterId: number | null;
  clusterName: string | null;
  tokens: ParsedToken[];
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

export function parseTaskInput(text: string, availableClusters: Cluster[] = []): ParsedTaskInput {
  let workingText = text;
  const tokens: ParsedToken[] = [];
  let priority: Priority = "none";
  let deadline: string | null = null;
  let deadlineTime: string | null = null;
  let clusterId: number | null = null;
  let clusterName: string | null = null;

  const now = new Date();

  // 1. Priority parsing: !high, !urgent, !p1, !med, !medium, !p2, !low, !p3, !none
  const priorityRegex = /(?:^|\s)!([a-zA-Z0-9]+)\b/i;
  const prioMatch = workingText.match(priorityRegex);
  if (prioMatch) {
    const rawTag = prioMatch[0].trim();
    const tagVal = prioMatch[1].toLowerCase();
    let foundPrio: Priority | null = null;

    if (["high", "urgent", "h", "p1"].includes(tagVal)) {
      foundPrio = "high";
    } else if (["med", "medium", "m", "p2"].includes(tagVal)) {
      foundPrio = "med";
    } else if (["low", "l", "p3"].includes(tagVal)) {
      foundPrio = "low";
    } else if (["none", "clear", "p4"].includes(tagVal)) {
      foundPrio = "none";
    }

    if (foundPrio) {
      priority = foundPrio;
      tokens.push({ type: "priority", raw: rawTag, value: foundPrio });
      workingText = workingText.replace(prioMatch[0], " ");
    }
  }

  // 2. Time parsing: @14:30, @2:30pm, @9am, @09:00, @5pm
  const timeRegex = /(?:^|\s)@(\d{1,2}(?::\d{2})?(?:am|pm)?|\d{1,2}:\d{2})\b/i;
  const timeMatch = workingText.match(timeRegex);
  if (timeMatch) {
    const rawTime = timeMatch[0].trim();
    const timeVal = timeMatch[1].toLowerCase();
    
    let hours = 0;
    let minutes = 0;
    let validTime = false;

    if (timeVal.includes("am") || timeVal.includes("pm")) {
      const isPm = timeVal.includes("pm");
      const clean = timeVal.replace(/am|pm/, "");
      const [hStr, mStr] = clean.split(":");
      let h = parseInt(hStr, 10);
      const m = mStr ? parseInt(mStr, 10) : 0;
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      hours = h;
      minutes = m;
      validTime = true;
    } else if (timeVal.includes(":")) {
      const [hStr, mStr] = timeVal.split(":");
      hours = parseInt(hStr, 10);
      minutes = parseInt(mStr, 10);
      validTime = true;
    }

    if (validTime && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      deadlineTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      tokens.push({ type: "time", raw: rawTime, value: deadlineTime });
      workingText = workingText.replace(timeMatch[0], " ");
    }
  }

  // 3. Date parsing:
  // - "today", "tomorrow", "tmrw"
  // - "in X days"
  // - "next week"
  // - "on monday", "this friday", "next monday", "monday", "tue", etc.
  // - explicit "YYYY-MM-DD"
  const isoDateRegex = /(?:^|\s)(\d{4}-\d{2}-\d{2})\b/;
  const isoMatch = workingText.match(isoDateRegex);
  if (isoMatch) {
    deadline = isoMatch[1];
    tokens.push({ type: "date", raw: isoMatch[0].trim(), value: deadline });
    workingText = workingText.replace(isoMatch[0], " ");
  } else {
    const todayRegex = /(?:^|\s)\b(today)\b/i;
    const tomorrowRegex = /(?:^|\s)\b(tomorrow|tmrw)\b/i;
    const inDaysRegex = /(?:^|\s)\bin\s+(\d+)\s+days?\b/i;
    const nextWeekRegex = /(?:^|\s)\b(next\s+week)\b/i;
    const weekdayRegex = /(?:^|\s)(?:on\s+|this\s+|next\s+)?\b(monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)\b/i;

    if (todayRegex.test(workingText)) {
      const m = workingText.match(todayRegex)!;
      deadline = formatDateISO(now);
      tokens.push({ type: "date", raw: m[0].trim(), value: deadline });
      workingText = workingText.replace(m[0], " ");
    } else if (tomorrowRegex.test(workingText)) {
      const m = workingText.match(tomorrowRegex)!;
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      deadline = formatDateISO(d);
      tokens.push({ type: "date", raw: m[0].trim(), value: deadline });
      workingText = workingText.replace(m[0], " ");
    } else if (inDaysRegex.test(workingText)) {
      const m = workingText.match(inDaysRegex)!;
      const daysToAdd = parseInt(m[1], 10);
      const d = new Date(now);
      d.setDate(d.getDate() + daysToAdd);
      deadline = formatDateISO(d);
      tokens.push({ type: "date", raw: m[0].trim(), value: deadline });
      workingText = workingText.replace(m[0], " ");
    } else if (nextWeekRegex.test(workingText)) {
      const m = workingText.match(nextWeekRegex)!;
      const d = new Date(now);
      d.setDate(d.getDate() + 7);
      deadline = formatDateISO(d);
      tokens.push({ type: "date", raw: m[0].trim(), value: deadline });
      workingText = workingText.replace(m[0], " ");
    } else if (weekdayRegex.test(workingText)) {
      const m = workingText.match(weekdayRegex)!;
      const dayName = m[1].toLowerCase();
      const targetDay = WEEKDAYS[dayName];
      if (targetDay !== undefined) {
        const d = new Date(now);
        const currentDay = d.getDay();
        let distance = targetDay - currentDay;
        if (distance <= 0) distance += 7; // Next occurrence
        d.setDate(d.getDate() + distance);
        deadline = formatDateISO(d);
        tokens.push({ type: "date", raw: m[0].trim(), value: deadline });
        workingText = workingText.replace(m[0], " ");
      }
    }
  }

  // 4. Cluster parsing: #cluster or #cluster-name or #"cluster name"
  const clusterQuotedRegex = /(?:^|\s)#"([^"]+)"/;
  const clusterWordRegex = /(?:^|\s)#([a-zA-Z0-9_\-]+)\b/;
  
  const quoteMatch = workingText.match(clusterQuotedRegex);
  if (quoteMatch) {
    const rawTag = quoteMatch[0].trim();
    const query = quoteMatch[1].toLowerCase();
    const matched = availableClusters.find(
      (c) => c.name.toLowerCase() === query || c.name.toLowerCase().includes(query)
    );
    if (matched) {
      clusterId = matched.id;
      clusterName = matched.name;
    } else {
      clusterName = quoteMatch[1];
    }
    tokens.push({ type: "cluster", raw: rawTag, value: clusterName });
    workingText = workingText.replace(quoteMatch[0], " ");
  } else {
    const wordMatch = workingText.match(clusterWordRegex);
    if (wordMatch) {
      const rawTag = wordMatch[0].trim();
      const query = wordMatch[1].toLowerCase().replace(/[-_]/g, " ");
      const matched = availableClusters.find(
        (c) => c.name.toLowerCase() === query || c.name.toLowerCase().replace(/[-_\s]/g, "") === wordMatch[1].toLowerCase()
      );
      if (matched) {
        clusterId = matched.id;
        clusterName = matched.name;
      } else {
        clusterName = wordMatch[1];
      }
      tokens.push({ type: "cluster", raw: rawTag, value: clusterName });
      workingText = workingText.replace(wordMatch[0], " ");
    }
  }

  const cleanTitle = workingText.replace(/\s+/g, " ").trim();

  return {
    cleanTitle,
    priority,
    deadline,
    deadlineTime,
    clusterId,
    clusterName,
    tokens,
  };
}

