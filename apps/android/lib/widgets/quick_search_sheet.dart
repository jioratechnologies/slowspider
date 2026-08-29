import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_icons.dart';
import '../core/app_theme.dart';
import '../core/helpers.dart';
import '../models/models.dart';
import '../state/board_provider.dart';

enum _SearchFilter { all, tasks, clusters, notes }

Future<void> showQuickSearchSheet(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black.withValues(alpha: 0.55),
    builder: (ctx) => const _AppleMusicSearchSheet(),
  );
}

class _AppleMusicSearchSheet extends ConsumerStatefulWidget {
  const _AppleMusicSearchSheet();

  @override
  ConsumerState<_AppleMusicSearchSheet> createState() => _AppleMusicSearchSheetState();
}

class _AppleMusicSearchSheetState extends ConsumerState<_AppleMusicSearchSheet> {
  final _searchCtrl = TextEditingController();
  _SearchFilter _filter = _SearchFilter.all;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final sheetBg = isDark ? const Color(0xE6141620) : const Color(0xF7FFFFFF);
    final sheetBorder = isDark ? const Color(0xFF2A2D3D) : const Color(0xFFE2E4EB);
    final searchBg = isDark ? const Color(0xFF222534) : const Color(0xFFECEEF2);
    final cardBg = isDark ? const Color(0xFF1B1D28) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF292C3D) : const Color(0xFFE5E7EB);
    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? const Color(0xFF949BAE) : const Color(0xFF6B7280);
    final ink3Color = isDark ? AppColors.ink3 : AppColors.lightInk3;

    final board = ref.watch(boardProvider);
    final data = board.data;
    final query = _searchCtrl.text.trim().toLowerCase();

    List<Task> matchedTasks = [];
    List<Cluster> matchedClusters = [];
    List<Note> matchedNotes = [];

    if (data != null && query.isNotEmpty) {
      if (_filter == _SearchFilter.all || _filter == _SearchFilter.tasks) {
        matchedTasks = data.tasks.where((t) {
          return displayTitle(t.title).toLowerCase().contains(query) ||
              t.notes.toLowerCase().contains(query);
        }).toList();
      }

      if (_filter == _SearchFilter.all || _filter == _SearchFilter.clusters) {
        matchedClusters = data.clusters.where((c) {
          return c.name.toLowerCase().contains(query);
        }).toList();
      }

      if (_filter == _SearchFilter.all || _filter == _SearchFilter.notes) {
        matchedNotes = data.notes.where((n) {
          return n.body.toLowerCase().contains(query);
        }).toList();
      }
    }

    final totalMatches = matchedTasks.length + matchedClusters.length + matchedNotes.length;

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(26)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          decoration: BoxDecoration(
            color: sheetBg,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(26)),
            border: Border(top: BorderSide(color: sheetBorder, width: 1.2)),
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 18,
            left: 16,
            right: 16,
            top: 10,
          ),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.82,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. Apple Music Grabber Pill
                Center(
                  child: Container(
                    width: 36,
                    height: 4.5,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF383C50) : const Color(0xFFD1D5DB),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // 2. Apple Music Search Input Row with Cancel Button
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchCtrl,
                        autofocus: true,
                        onChanged: (_) => setState(() {}),
                        style: GoogleFonts.inter(color: textColor, fontSize: 14.5, fontWeight: FontWeight.w500),
                        decoration: InputDecoration(
                          hintText: 'Search tasks, clusters, notes...',
                          hintStyle: GoogleFonts.inter(color: ink3Color, fontSize: 14),
                          prefixIcon: Icon(Icons.search_rounded, size: 20, color: ink3Color),
                          suffixIcon: _searchCtrl.text.isNotEmpty
                              ? IconButton(
                                  icon: Icon(Icons.cancel_rounded, size: 18, color: ink3Color),
                                  onPressed: () => setState(() => _searchCtrl.clear()),
                                )
                              : null,
                          filled: true,
                          fillColor: searchBg,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide.none,
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide.none,
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: const BorderSide(color: Color(0xFF8B5CF6), width: 1.2),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    TextButton(
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        foregroundColor: AppColors.accent,
                        textStyle: GoogleFonts.inter(fontSize: 14.5, fontWeight: FontWeight.w600),
                      ),
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 3. Apple Music Filter Capsule Pills
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('All', _SearchFilter.all, isDark),
                      const SizedBox(width: 6),
                      _buildFilterChip('Tasks', _SearchFilter.tasks, isDark),
                      const SizedBox(width: 6),
                      _buildFilterChip('Clusters', _SearchFilter.clusters, isDark),
                      const SizedBox(width: 6),
                      _buildFilterChip('Notes', _SearchFilter.notes, isDark),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 4. Results List / Empty State / Quick Suggestions
                if (query.isEmpty)
                  _buildSuggestionsView(context, data, textColor, mutedColor, ink3Color, cardBg, cardBorder, isDark)
                else if (totalMatches == 0)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 40),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(Icons.search_off_rounded, size: 40, color: ink3Color),
                          const SizedBox(height: 10),
                          Text(
                            'No results for "$query"',
                            style: GoogleFonts.inter(color: textColor, fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Try searching with different keywords.',
                            style: GoogleFonts.inter(color: mutedColor, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  Flexible(
                    child: ListView(
                      shrinkWrap: true,
                      padding: const EdgeInsets.only(bottom: 12),
                      children: [
                        // Matched Clusters
                        if (matchedClusters.isNotEmpty) ...[
                          _buildSectionHeader('CLUSTERS (${matchedClusters.length})', ink3Color),
                          const SizedBox(height: 6),
                          for (final c in matchedClusters) ...[
                            _buildResultCard(
                              leading: Container(
                                width: 14,
                                height: 14,
                                decoration: BoxDecoration(
                                  color: colorFromHex(c.color),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                              title: c.name,
                              subtitle: '${data?.tasks.where((t) => t.clusterId == c.id).length ?? 0} tasks',
                              cardBg: cardBg,
                              cardBorder: cardBorder,
                              textColor: textColor,
                              mutedColor: mutedColor,
                              onTap: () {
                                Navigator.pop(context);
                                context.push('/cluster/${c.id}');
                              },
                            ),
                            const SizedBox(height: 6),
                          ],
                          const SizedBox(height: 10),
                        ],

                        // Matched Tasks
                        if (matchedTasks.isNotEmpty) ...[
                          _buildSectionHeader('TASKS (${matchedTasks.length})', ink3Color),
                          const SizedBox(height: 6),
                          for (final t in matchedTasks) ...[
                            _buildResultCard(
                              leading: Icon(
                                t.done ? AppIcons.taskCheck : Icons.radio_button_unchecked_rounded,
                                size: 18,
                                color: t.done ? const Color(0xFF10B981) : mutedColor,
                              ),
                              title: displayTitle(t.title),
                              subtitle: t.notes.isNotEmpty ? t.notes : 'Task in board',
                              isDone: t.done,
                              cardBg: cardBg,
                              cardBorder: cardBorder,
                              textColor: textColor,
                              mutedColor: mutedColor,
                              onTap: () {
                                Navigator.pop(context);
                                context.push('/task/${t.id}');
                              },
                            ),
                            const SizedBox(height: 6),
                          ],
                          const SizedBox(height: 10),
                        ],

                        // Matched Notes
                        if (matchedNotes.isNotEmpty) ...[
                          _buildSectionHeader('NOTES (${matchedNotes.length})', ink3Color),
                          const SizedBox(height: 6),
                          for (final n in matchedNotes) ...[
                            _buildResultCard(
                              leading: Icon(AppIcons.notes, size: 18, color: const Color(0xFF38BDF8)),
                              title: displayTitle(n.body),
                              subtitle: '${n.sizeBytes} B • ${n.kind.name}',
                              cardBg: cardBg,
                              cardBorder: cardBorder,
                              textColor: textColor,
                              mutedColor: mutedColor,
                              onTap: () {
                                Navigator.pop(context);
                                if (n.taskId != null) {
                                  context.push('/task/${n.taskId}?tab=notes');
                                }
                              },
                            ),
                            const SizedBox(height: 6),
                          ],
                        ],
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, _SearchFilter value, bool isDark) {
    final active = _filter == value;
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: active
              ? const Color(0xFF8B5CF6)
              : (isDark ? const Color(0xFF222534) : const Color(0xFFECEEF2)),
          borderRadius: BorderRadius.circular(999),
          border: active
              ? null
              : Border.all(color: isDark ? const Color(0xFF2D3142) : const Color(0xFFE2E4EB)),
          boxShadow: active
              ? [
                  BoxShadow(
                    color: const Color(0xFF8B5CF6).withValues(alpha: 0.35),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            color: active ? Colors.white : (isDark ? const Color(0xFF949BAE) : const Color(0xFF4B5563)),
            fontSize: 12,
            fontWeight: active ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, Color ink3Color) {
    return Text(
      title,
      style: GoogleFonts.inter(
        color: ink3Color,
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.4,
      ),
    );
  }

  Widget _buildResultCard({
    required Widget leading,
    required String title,
    required String subtitle,
    required Color cardBg,
    required Color cardBorder,
    required Color textColor,
    required Color mutedColor,
    required VoidCallback onTap,
    bool isDone = false,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                leading,
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title.isNotEmpty ? title : 'Untitled',
                        style: GoogleFonts.inter(
                          color: isDone ? mutedColor : textColor,
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          decoration: isDone ? TextDecoration.lineThrough : null,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: GoogleFonts.inter(color: mutedColor, fontSize: 11.5),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded, size: 18, color: mutedColor.withValues(alpha: 0.6)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSuggestionsView(
    BuildContext context,
    BoardPayload? data,
    Color textColor,
    Color mutedColor,
    Color ink3Color,
    Color cardBg,
    Color cardBorder,
    bool isDark,
  ) {
    final recentTasks = (data?.tasks ?? []).take(3).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (recentTasks.isNotEmpty) ...[
          _buildSectionHeader('RECENT TASKS', ink3Color),
          const SizedBox(height: 8),
          for (final t in recentTasks) ...[
            _buildResultCard(
              leading: Icon(
                t.done ? AppIcons.taskCheck : Icons.radio_button_unchecked_rounded,
                size: 18,
                color: t.done ? const Color(0xFF10B981) : mutedColor,
              ),
              title: displayTitle(t.title),
              subtitle: t.notes.isNotEmpty ? t.notes : 'Task in board',
              isDone: t.done,
              cardBg: cardBg,
              cardBorder: cardBorder,
              textColor: textColor,
              mutedColor: mutedColor,
              onTap: () {
                Navigator.pop(context);
                context.push('/task/${t.id}');
              },
            ),
            const SizedBox(height: 6),
          ],
        ],
      ],
    );
  }
}
