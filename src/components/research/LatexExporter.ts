import type { Cluster, Task, Note } from "@/lib/types";

export function exportClusterToLatex({
  cluster,
  tasks,
  notesByTask,
  workspaceName = "Research Workspace",
}: {
  cluster: Cluster;
  tasks: Task[];
  notesByTask: Record<number, Note[]>;
  workspaceName?: string;
}): string {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let tex = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{booktabs}
\\usepackage{enumitem}
\\usepackage{geometry}
\\geometry{margin=1in}

\\title{\\textbf{${escapeLatex(cluster.name)}}\\\\\\large ${escapeLatex(workspaceName)} -- Scientific Progress Report}
\\author{Slow Spider Research Suite}
\\date{${dateStr}}

\\begin{document}
\\maketitle

\\begin{abstract}
This research report compiles the active hypotheses, mathematical models, experimental tasks, and laboratory observations under the \\textbf{${escapeLatex(cluster.name)}} investigation cluster.
\\end{abstract}

\\section{Cluster Overview}
\\textbf{Status:} ${cluster.status ? cluster.status.toUpperCase() : "ACTIVE"}\\\\
\\textbf{Total Tasks:} ${tasks.length}\\\\
\\textbf{Completed Tasks:} ${tasks.filter((t) => t.done).length}

\\section{Tasks \\& Scientific Milestones}
`;

  if (tasks.length === 0) {
    tex += `\\textit{No tasks in this research cluster.}\n\n`;
  } else {
    for (const t of tasks) {
      tex += `\\subsection{${escapeLatex(t.title || "Untitled Investigation")}}
\\begin{itemize}[leftmargin=*]
  \\item \\textbf{Status:} ${t.done ? "Completed (\\checkmark)" : "In Progress"}
  \\item \\textbf{Priority:} ${t.priority ? t.priority.toUpperCase() : "Normal"}
  ${t.deadline ? `\\item \\textbf{Target Deadline:} ${t.deadline} ${t.deadline_time || ""}` : ""}
\\end{itemize}
`;

      if (t.notes) {
        tex += `\\paragraph{Research Notes:}\n${t.notes}\n\n`;
      }

      // Check milestones
      if (t.milestones && t.milestones.length > 0) {
        tex += `\\paragraph{Milestones:}\n\\begin{itemize}\n`;
        for (const m of t.milestones) {
          tex += `  \\item[${m.done ? "$\\boxtimes$" : "$\\square$"}] ${escapeLatex(m.title)}\n`;
        }
        tex += `\\end{itemize}\n\n`;
      }

      // Check notes
      const notes = notesByTask[t.id] || [];
      if (notes.length > 0) {
        tex += `\\paragraph{Attached Records (Total: ${notes.length}):}\n\\begin{enumerate}\n`;
        for (const n of notes) {
          if (n.kind === "link") {
            tex += `  \\item \\textbf{Reference Link:} \\href{${n.url || "#"}}{${escapeLatex(n.body || n.url || "Link")}}\n`;
          } else if (n.kind === "code") {
            tex += `  \\item \\textbf{Code Snippet:}\n\\begin{verbatim}\n${n.body}\n\\end{verbatim}\n`;
          } else {
            tex += `  \\item \\textbf{${n.kind.toUpperCase()}:} ${escapeLatex(n.body)}\n`;
          }
        }
        tex += `\\end{enumerate}\n\n`;
      }
    }
  }

  tex += `\\section{Conclusion \\& Next Steps}
This document serves as an immutable research timestamp of results and ongoing derivations for submission to group meetings and manuscript drafts.

\\end{document}
`;

  return tex;
}

export function downloadLatexFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".tex") ? filename : `${filename}.tex`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeLatex(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}
