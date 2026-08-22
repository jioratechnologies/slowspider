// Port of the one constant BoardService needs from apps/web's src/lib/board-helpers.ts —
// the rest of that file is pure UI/formatting logic (sort orders, date labels, etc.) that
// belongs to the web app's presentation layer, not the API surface being ported here.
export const BIN_MS = 14 * 86400000; // 2 weeks
