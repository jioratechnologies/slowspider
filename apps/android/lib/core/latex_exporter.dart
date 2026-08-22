import '../models/models.dart';

String escapeLatex(String text) {
  return text
      .replaceAll(r'\', r'\textbackslash{}')
      .replaceAll('{', r'\{')
      .replaceAll('}', r'\}')
      .replaceAll(r'$', r'\$')
      .replaceAll('&', r'\&')
      .replaceAll('%', r'\%')
      .replaceAll('#', r'\#')
      .replaceAll('_', r'\_')
      .replaceAll('^', r'\textasciicircum{}')
      .replaceAll('~', r'\textasciitilde{}');
}

String exportClusterToLatex({
  required Cluster cluster,
  required List<Task> tasks,
  required Map<int, List<Note>> notesByTask,
  String workspaceName = 'Research Workspace',
}) {
  final now = DateTime.now();
  final dateStr = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';

  final buffer = StringBuffer();
  buffer.writeln(r'\documentclass[11pt,a4paper]{article}');
  buffer.writeln(r'\usepackage[utf8]{inputenc}');
  buffer.writeln(r'\usepackage{amsmath,amssymb,amsfonts}');
  buffer.writeln(r'\usepackage{graphicx}');
  buffer.writeln(r'\usepackage{hyperref}');
  buffer.writeln(r'\usepackage{booktabs}');
  buffer.writeln(r'\usepackage{enumitem}');
  buffer.writeln(r'\usepackage{geometry}');
  buffer.writeln(r'\geometry{margin=1in}');
  buffer.writeln();
  buffer.writeln(r'\title{\textbf{' '${escapeLatex(cluster.name)}' r'}\\\large ' '${escapeLatex(workspaceName)}' r' -- Scientific Progress Report}');
  buffer.writeln(r'\author{Slow Spider Research Suite}');
  buffer.writeln(r'\date{' '$dateStr' r'}');
  buffer.writeln();
  buffer.writeln(r'\begin{document}');
  buffer.writeln(r'\maketitle');
  buffer.writeln();
  buffer.writeln(r'\begin{abstract}');
  buffer.writeln('This research report compiles the active hypotheses, mathematical models, experimental tasks, and laboratory observations under the \\textbf{${escapeLatex(cluster.name)}} investigation cluster.');
  buffer.writeln(r'\end{abstract}');
  buffer.writeln();
  buffer.writeln(r'\section{Cluster Overview}');
  buffer.writeln(r'\textbf{Status:} ' '${cluster.status.name.toUpperCase()}' r'\\');
  buffer.writeln(r'\textbf{Total Tasks:} ' '${tasks.length}' r'\\');
  buffer.writeln(r'\textbf{Completed Tasks:} ' '${tasks.where((t) => t.done).length}');
  buffer.writeln();
  buffer.writeln(r'\section{Tasks \& Scientific Milestones}');

  if (tasks.isEmpty) {
    buffer.writeln(r'\textit{No tasks in this research cluster.}');
    buffer.writeln();
  } else {
    for (final t in tasks) {
      final safeTitle = escapeLatex(t.title.isEmpty ? 'Untitled Investigation' : t.title);
      buffer.writeln(r'\subsection{' '$safeTitle' r'}');
      buffer.writeln(r'\begin{itemize}[leftmargin=*]');
      buffer.writeln(r'  \item \textbf{Status:} ' '${t.done ? r"Completed (\checkmark)" : "In Progress"}');
      buffer.writeln(r'  \item \textbf{Priority:} ' '${t.priority.name.toUpperCase()}');
      if (t.deadline != null) {
        final timePart = t.deadlineTime != null ? ' ${t.deadlineTime}' : '';
        buffer.writeln(r'  \item \textbf{Target Deadline:} ' '${t.deadline}$timePart');
      }
      buffer.writeln(r'\end{itemize}');
      buffer.writeln();

      if (t.notes.isNotEmpty) {
        buffer.writeln('\\paragraph{Research Notes:}\n${t.notes}\n');
      }

      if (t.milestones.isNotEmpty) {
        buffer.writeln('\\paragraph{Milestones:}\n\\begin{itemize}');
        for (final m in t.milestones) {
          final box = m.done ? r'$\boxtimes$' : r'$\square$';
          buffer.writeln('  \\item[$box] ${escapeLatex(m.title)}');
        }
        buffer.writeln('\\end{itemize}\n');
      }

      final notes = notesByTask[t.id] ?? [];
      if (notes.isNotEmpty) {
        buffer.writeln('\\paragraph{Attached Records (Total: ${notes.length}):}\n\\begin{enumerate}');
        for (final n in notes) {
          if (n.kind == NoteKind.link) {
            final targetUrl = n.url ?? '#';
            final textLabel = escapeLatex(n.body.isNotEmpty ? n.body : (n.url ?? 'Link'));
            buffer.writeln('  \\item \\textbf{Reference Link:} \\href{$targetUrl}{$textLabel}');
          } else if (n.kind == NoteKind.code) {
            buffer.writeln('  \\item \\textbf{Code Snippet:}\n\\begin{verbatim}\n${n.body}\n\\end{verbatim}');
          } else {
            buffer.writeln('  \\item \\textbf{${n.kind.name.toUpperCase()}:} ${escapeLatex(n.body)}');
          }
        }
        buffer.writeln('\\end{enumerate}\n');
      }
    }
  }

  buffer.writeln(r'\section{Conclusion \& Next Steps}');
  buffer.writeln(r'This document serves as an immutable research timestamp of results and ongoing derivations for submission to group meetings and manuscript drafts.');
  buffer.writeln();
  buffer.writeln(r'\end{document}');

  return buffer.toString();
}
