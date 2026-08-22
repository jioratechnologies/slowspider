import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_theme.dart';
import '../core/helpers.dart';
import '../core/latex_exporter.dart';
import '../core/session_storage.dart';
import '../models/models.dart';
import '../state/auth_provider.dart';
import '../state/board_provider.dart';
import '../state/theme_provider.dart';
import '../widgets/create_cluster_sheet.dart';
import '../widgets/quick_capture_sheet.dart';
import '../widgets/research/research_suite_modal.dart';
import '../widgets/slow_spider_logo.dart';
import '../widgets/task_card.dart';

class BoardScreen extends ConsumerStatefulWidget {
  const BoardScreen({super.key});

  @override
  ConsumerState<BoardScreen> createState() => _BoardScreenState();
}

class _BoardScreenState extends ConsumerState<BoardScreen> {
  bool _searchOpen = false;
  final _searchCtrl = TextEditingController();
  int? _activeCategory;
  bool _filterExpanded = false;
  final Set<int?> _collapsed = {};

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final currentTheme = ref.watch(themeProvider);

    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? AppColors.muted : AppColors.lightMuted;
    final ink3Color = isDark ? AppColors.ink3 : AppColors.lightInk3;
    final panelBg = isDark ? const Color(0xFF16171E) : Colors.white;
    final pillBorder = isDark ? const Color(0xFF2C2F3D) : AppColors.lightLine;
    final appBarBg = isDark ? const Color(0xFF121318) : Colors.white;

    final board = ref.watch(boardProvider);
    final controller = ref.read(boardProvider.notifier);
    final auth = ref.watch(authProvider);
    final data = board.data;

    if (data == null) {
      if (board.loading) {
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      }
      return Scaffold(
        appBar: AppBar(
          title: const Text('Slow Spider'),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              onPressed: controller.reload,
            ),
            IconButton(
              icon: const Icon(Icons.logout_rounded, color: AppColors.danger),
              onPressed: () => ref.read(authProvider.notifier).signOut(),
            ),
          ],
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off_rounded, size: 48, color: AppColors.ink3),
                const SizedBox(height: 16),
                Text(
                  board.error ?? 'Failed to load board data.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.danger),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: controller.reload,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final query = _searchCtrl.text.trim().toLowerCase();
    bool matches(Task t) => query.isEmpty || displayTitle(t.title).toLowerCase().contains(query) || t.notes.toLowerCase().contains(query);
    final liveTasks = data.tasks.where((t) => isTaskLive(t, data.clusters) && matches(t)).toList();

    final activeClusters = data.clusters.where(isClusterActive).where((c) => _activeCategory == null || c.categoryId == _activeCategory).toList();

    final workspaceName = board.workspaces.where((w) => w.id == data.workspaceId).cast<Workspace?>().firstWhere((_) => true, orElse: () => null)?.name;
    final session = auth.session;
    var userEmail = session?.email ?? '';
    if ((userEmail.isEmpty || !userEmail.contains('@')) && session?.accessToken != null) {
      final extracted = SessionStorage.extractEmailFromJwt(session!.accessToken);
      if (extracted != null && extracted.isNotEmpty) {
        userEmail = extracted;
      }
    }
    if (userEmail.isEmpty || !userEmail.contains('@')) {
      userEmail = 'gaurav@gmail.com';
    }
    final displayEmail = userEmail;
    final userInitials = displayEmail.contains('@')
        ? displayEmail.split('@').first.substring(0, (displayEmail.split('@').first.length >= 2 ? 2 : 1)).toUpperCase()
        : (displayEmail.length >= 2 ? displayEmail.substring(0, 2).toUpperCase() : 'GA');

    final availableCategories = data.categories.where((c) => data.clusters.where(isClusterActive).any((cl) => cl.categoryId == c.id)).toList();

    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        appBar: AppBar(
          toolbarHeight: 54,
          titleSpacing: 10,
          backgroundColor: appBarBg,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(1),
            child: Container(
              height: 1,
              color: isDark ? const Color(0xFF232530) : const Color(0xFFE5E7EB),
            ),
          ),
          title: _searchOpen
              ? Container(
                  height: 38,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E202B) : const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: isDark ? const Color(0xFF2D3040) : const Color(0xFFE5E7EB)),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: Row(
                    children: [
                      Icon(Icons.search_rounded, size: 18, color: ink3Color),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _searchCtrl,
                          autofocus: true,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: 'Search tasks, notes, clusters...',
                            hintStyle: TextStyle(color: ink3Color, fontSize: 13.5),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                          style: TextStyle(color: textColor, fontSize: 13.5),
                        ),
                      ),
                    ],
                  ),
                )
              : Row(
                  children: [
                    const SlowSpiderLogo(size: 28),
                    const SizedBox(width: 8),
                    // Workspace switcher capsule pill
                    InkWell(
                      onTap: () => context.push('/workspace'),
                      borderRadius: BorderRadius.circular(9),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E202B) : const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(9),
                          border: Border.all(color: isDark ? const Color(0xFF2D3040) : const Color(0xFFE2E4EB)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.hub_outlined, size: 14, color: AppColors.accent),
                            const SizedBox(width: 6),
                            ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 125),
                              child: Text(
                                workspaceName ?? 'My Workspace',
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.inter(
                                  color: textColor,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            const SizedBox(width: 4),
                            Icon(Icons.unfold_more_rounded, size: 13.5, color: ink3Color),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
          leading: _searchOpen
              ? IconButton(
                  icon: Icon(Icons.arrow_back_rounded, color: textColor, size: 20),
                  onPressed: () => setState(() {
                    _searchOpen = false;
                    _searchCtrl.clear();
                  }),
                )
              : null,
          actions: _searchOpen
              ? [
                  if (_searchCtrl.text.isNotEmpty)
                    IconButton(
                      icon: Icon(Icons.close_rounded, color: textColor, size: 18),
                      onPressed: () => setState(() => _searchCtrl.clear()),
                    ),
                  const SizedBox(width: 4),
                ]
              : [
                  // 1. Calendar button
                  _navBarButton(
                    context: context,
                    icon: Icons.calendar_month_rounded,
                    tooltip: 'Calendar',
                    color: textColor,
                    onTap: () => context.push('/calendar'),
                  ),
                  const SizedBox(width: 4),

                  // 2. Research Tools button
                  _navBarButton(
                    context: context,
                    icon: Icons.science_outlined,
                    tooltip: 'Scientific Research Suite',
                    color: const Color(0xFFA855F7),
                    onTap: () => showResearchSuiteModal(context),
                  ),
                  const SizedBox(width: 4),

                  // 3. Sort Mode button
                  _navBarButton(
                    context: context,
                    icon: board.sortMode == SortMode.smart ? Icons.auto_awesome_rounded : Icons.sort_rounded,
                    tooltip: 'Sort: ${board.sortMode == SortMode.smart ? 'Smart' : 'Manual'}',
                    color: board.sortMode == SortMode.smart ? const Color(0xFFF59E0B) : textColor,
                    onTap: controller.toggleSortMode,
                  ),
                  const SizedBox(width: 4),

                  // 4. Search toggle button
                  _navBarButton(
                    context: context,
                    icon: Icons.search_rounded,
                    tooltip: 'Search tasks',
                    color: textColor,
                    onTap: () => setState(() => _searchOpen = true),
                  ),
                  const SizedBox(width: 6),

                  // 5. Account Profile Avatar Dropdown
                  PopupMenuButton<String>(
                    offset: const Offset(0, 44),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(
                        color: isDark ? const Color(0xFF2D3040) : const Color(0xFFE5E7EB),
                      ),
                    ),
                    color: isDark ? const Color(0xFF181922) : Colors.white,
                    elevation: 12,
                    onSelected: (v) async {
                      switch (v) {
                        case 'theme':
                          ref.read(themeProvider.notifier).cycleTheme();
                          break;
                        case 'workspaces':
                          context.push('/workspace');
                          break;
                        case 'categories':
                          _manageCategories(context, controller, data);
                          break;
                        case 'sign_out':
                          await ref.read(authProvider.notifier).signOut();
                          break;
                      }
                    },
                    itemBuilder: (ctx) {
                      return [
                        PopupMenuItem(
                          enabled: false,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'SIGNED IN AS',
                                style: GoogleFonts.inter(
                                  color: ink3Color,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                displayEmail,
                                style: GoogleFonts.inter(
                                  color: textColor,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const PopupMenuDivider(),
                        PopupMenuItem(
                          value: 'theme',
                          child: Row(children: [
                            Icon(currentTheme.icon, size: 16, color: AppColors.accent),
                            const SizedBox(width: 10),
                            Text('Theme: ${currentTheme.label}', style: GoogleFonts.inter(color: textColor, fontSize: 13)),
                          ]),
                        ),
                        const PopupMenuDivider(),
                        PopupMenuItem(
                          enabled: false,
                          child: Text(
                            'ORGANIZE',
                            style: GoogleFonts.inter(
                              color: ink3Color,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        PopupMenuItem(
                          value: 'categories',
                          child: Row(children: [
                            Icon(Icons.label_outline_rounded, size: 16, color: textColor),
                            const SizedBox(width: 10),
                            Text('Manage categories...', style: GoogleFonts.inter(color: textColor, fontSize: 13)),
                          ]),
                        ),
                        PopupMenuItem(
                          value: 'workspaces',
                          child: Row(children: [
                            Icon(Icons.hub_outlined, size: 16, color: textColor),
                            const SizedBox(width: 10),
                            Text('Workspaces & Members', style: GoogleFonts.inter(color: textColor, fontSize: 13)),
                          ]),
                        ),
                        const PopupMenuDivider(),
                        PopupMenuItem(
                          value: 'sign_out',
                          child: Row(children: [
                            const Icon(Icons.logout_rounded, size: 16, color: AppColors.danger),
                            const SizedBox(width: 10),
                            Text('Sign out', style: GoogleFonts.inter(color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w600)),
                          ]),
                        ),
                      ];
                    },
                    child: Container(
                      width: 32,
                      height: 32,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: isDark
                              ? [const Color(0xFF2A2D3D), const Color(0xFF1E202B)]
                              : [const Color(0xFFEDE9FE), const Color(0xFFF3F4F6)],
                        ),
                        borderRadius: BorderRadius.circular(9),
                        border: Border.all(
                          color: isDark ? const Color(0xFF3E4358) : const Color(0xFFDDD6FE),
                          width: 1,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: isDark ? Colors.black.withValues(alpha: 0.2) : Colors.black.withValues(alpha: 0.03),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: Text(
                        userInitials,
                        style: GoogleFonts.inter(
                          color: isDark ? Colors.white : const Color(0xFF6D28D9),
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
        ),
        body: RefreshIndicator(
          onRefresh: controller.refresh,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 85),
            children: [
              // Segmented Category Filter Bar (Exact Web Design with Vertical Expand/Collapse)
              if (availableCategories.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xEB16161A) : const Color(0xF5FFFFFF),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isDark ? const Color(0xFF262836) : const Color(0xFFE2E4EB),
                        width: 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: isDark ? Colors.black.withValues(alpha: 0.25) : Colors.black.withValues(alpha: 0.04),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Main Single-Line Row
                        Row(
                          children: [
                            // Interactive Filter Toggle Button (Clicking icon or text toggles vertical collapse)
                            InkWell(
                              onTap: () => setState(() => _filterExpanded = !_filterExpanded),
                              borderRadius: BorderRadius.circular(8),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.tune_rounded, size: 14, color: _filterExpanded ? AppColors.accent : mutedColor),
                                    const SizedBox(width: 4.5),
                                    Text(
                                      'Filter',
                                      style: GoogleFonts.inter(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: _filterExpanded ? textColor : mutedColor,
                                      ),
                                    ),
                                    const SizedBox(width: 3),
                                    Icon(
                                      _filterExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                                      size: 16,
                                      color: _filterExpanded ? AppColors.accent : ink3Color,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            // Divider line
                            Container(
                              height: 18,
                              width: 1,
                              color: isDark ? const Color(0xFF2B2E3D) : const Color(0xFFE2E4EB),
                              margin: const EdgeInsets.symmetric(horizontal: 3),
                            ),

                            // Single-line horizontal scrollable with Active Category on top right of All
                            if (!_filterExpanded)
                              Expanded(
                                child: SingleChildScrollView(
                                  scrollDirection: Axis.horizontal,
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      // All Pill
                                      _webFilterPill(
                                        context: context,
                                        label: 'All',
                                        count: data.clusters.where(isClusterActive).length,
                                        active: _activeCategory == null,
                                        color: null,
                                        onTap: () => setState(() => _activeCategory = null),
                                      ),
                                      // Categories: Active category placed first on right of All, followed by others
                                      for (final cat in _activeCategory != null
                                          ? [
                                              ...availableCategories.where((c) => c.id == _activeCategory),
                                              ...availableCategories.where((c) => c.id != _activeCategory),
                                            ]
                                          : availableCategories)
                                        _webFilterPill(
                                          context: context,
                                          label: cat.name,
                                          color: cat.color,
                                          count: data.clusters.where(isClusterActive).where((c) => c.categoryId == cat.id).length,
                                          active: _activeCategory == cat.id,
                                          onTap: () => setState(() => _activeCategory = _activeCategory == cat.id ? null : cat.id),
                                        ),
                                    ],
                                  ),
                                ),
                              )
                            else ...[
                              // When Expanded Vertically, Top Row shows All Pill
                              _webFilterPill(
                                context: context,
                                label: 'All',
                                count: data.clusters.where(isClusterActive).length,
                                active: _activeCategory == null,
                                color: null,
                                onTap: () => setState(() => _activeCategory = null),
                              ),
                            ],
                          ],
                        ),

                        // If Expanded Vertically: Multi-Line Wrapped Category Grid
                        if (_filterExpanded) ...[
                          const SizedBox(height: 6),
                          Padding(
                            padding: const EdgeInsets.fromLTRB(4, 2, 4, 2),
                            child: Wrap(
                              spacing: 5,
                              runSpacing: 5,
                              children: [
                                for (final cat in availableCategories)
                                  _webFilterPill(
                                    context: context,
                                    label: cat.name,
                                    color: cat.color,
                                    count: data.clusters.where(isClusterActive).where((c) => c.categoryId == cat.id).length,
                                    active: _activeCategory == cat.id,
                                    onTap: () => setState(() => _activeCategory = _activeCategory == cat.id ? null : cat.id),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              if (board.error != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Text(board.error!, style: const TextStyle(color: AppColors.danger, fontSize: 12)),
                ),

              // Floating Drop Target Group
              _group(
                context,
                controller,
                id: null,
                name: 'Floating',
                color: '#787D8A',
                cluster: null,
                tasks: sortTasks(liveTasks.where((t) => t.clusterId == null).toList(), board.sortMode),
                data: data,
                textColor: textColor,
                mutedColor: mutedColor,
                ink3Color: ink3Color,
              ),

              // Cluster Columns / Drop Target Groups
              for (int idx = 0; idx < activeClusters.length; idx++)
                _group(
                  context,
                  controller,
                  id: activeClusters[idx].id,
                  name: activeClusters[idx].name,
                  color: activeClusters[idx].color,
                  cluster: activeClusters[idx],
                  clusterIndex: idx,
                  totalClusters: activeClusters.length,
                  allClusters: activeClusters,
                  tasks: sortTasks(liveTasks.where((t) => t.clusterId == activeClusters[idx].id).toList(), board.sortMode),
                  data: data,
                  textColor: textColor,
                  mutedColor: mutedColor,
                  ink3Color: ink3Color,
                ),
              const SizedBox(height: 4),

              // New Cluster button
              InkWell(
                onTap: () => showCreateClusterSheet(context, onCreate: (name, color) => controller.createCluster(name: name, color: color, categoryId: _activeCategory)),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: panelBg,
                    border: Border.all(color: pillBorder),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.add_rounded, size: 16, color: mutedColor),
                      const SizedBox(width: 5),
                      Text('New cluster', style: TextStyle(color: mutedColor, fontWeight: FontWeight.w600, fontSize: 13)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _webFilterPill({
    required BuildContext context,
    required String label,
    String? color,
    required int count,
    required bool active,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = Theme.of(context).colorScheme.onSurface;
    final mutedColor = isDark ? AppColors.muted : AppColors.lightMuted;
    final catColor = color != null ? colorFromHex(color) : AppColors.accent;

    BoxDecoration decoration;
    Color itemTextColor;

    if (active) {
      if (color == null) {
        // Active "All"
        decoration = BoxDecoration(
          color: isDark ? const Color(0xFF27272A) : const Color(0xFF18181B),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isDark ? Colors.white.withValues(alpha: 0.15) : Colors.transparent,
            width: 1,
          ),
        );
        itemTextColor = Colors.white;
      } else {
        // Active Category
        decoration = BoxDecoration(
          color: catColor.withValues(alpha: 0.18),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: catColor.withValues(alpha: 0.45),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: catColor.withValues(alpha: 0.25),
              blurRadius: 10,
            ),
          ],
        );
        itemTextColor = textColor;
      }
    } else {
      // Inactive
      decoration = BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(8),
      );
      itemTextColor = mutedColor;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 140),
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
          decoration: decoration,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (color != null) ...[
                Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: catColor,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: catColor.withValues(alpha: active ? 0.9 : 0.4),
                        blurRadius: active ? 6 : 3,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: GoogleFonts.inter(
                  color: itemTextColor,
                  fontSize: 12,
                  fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
              const SizedBox(width: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4.5, vertical: 1),
                decoration: BoxDecoration(
                  color: active
                      ? (color == null ? Colors.white.withValues(alpha: 0.2) : (isDark ? Colors.white.withValues(alpha: 0.15) : Colors.black.withValues(alpha: 0.08)))
                      : (isDark ? const Color(0xFF222430) : const Color(0xFFE5E7EB)),
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 9.5,
                    fontWeight: FontWeight.bold,
                    color: active ? (color == null ? Colors.white : itemTextColor) : mutedColor,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _navBarButton({
    required BuildContext context,
    required IconData icon,
    required String tooltip,
    required Color color,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E202B) : const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isDark ? const Color(0xFF2B2E3D) : const Color(0xFFE2E4EB),
              width: 0.8,
            ),
          ),
          alignment: Alignment.center,
          child: Icon(icon, size: 17.5, color: color),
        ),
      ),
    );
  }

  Widget _group(
    BuildContext context,
    BoardController controller, {
    required int? id,
    required String name,
    required String color,
    required Cluster? cluster,
    int clusterIndex = 0,
    int totalClusters = 0,
    List<Cluster> allClusters = const [],
    required List<Task> tasks,
    required BoardPayload data,
    required Color textColor,
    required Color mutedColor,
    required Color ink3Color,
  }) {
    final isCollapsed = _collapsed.contains(id);
    final progress = id != null ? clusterProgress(id, data.tasks) : null;
    final totalCount = tasks.length;
    final doneCount = tasks.where((t) => t.done).length;
    final openCount = totalCount - doneCount;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final clusterColor = cluster != null ? colorFromHex(cluster.color) : AppColors.accent;

    return DragTarget<Task>(
      onWillAcceptWithDetails: (details) => details.data.clusterId != id || details.data.cold || details.data.binned,
      onAcceptWithDetails: (details) {
        controller.moveTask(details.data.id, id);
      },
      builder: (ctx, candidateData, rejectedData) {
        final isHovered = candidateData.isNotEmpty;

        return Container(
          margin: const EdgeInsets.only(bottom: 11),
          padding: const EdgeInsets.fromLTRB(7, 7, 7, 5),
          decoration: BoxDecoration(
            color: isHovered
                ? AppColors.accent.withValues(alpha: 0.12)
                : (isDark ? const Color(0xFF13141D) : const Color(0xFFF3F4F8)),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isHovered
                  ? AppColors.accent
                  : (isDark ? const Color(0xFF222432) : const Color(0xFFE2E4EB)),
              width: isHovered ? 1.4 : 0.9,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Redesigned Modern Cluster Header
              InkWell(
                onTap: () => setState(() => isCollapsed ? _collapsed.remove(id) : _collapsed.add(id)),
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
                  child: Row(
                    children: [
                      // Glowing Cluster Color Dot
                      Container(
                        width: 8.5,
                        height: 8.5,
                        decoration: BoxDecoration(
                          color: cluster != null ? clusterColor : AppColors.accent,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: (cluster != null ? clusterColor : AppColors.accent).withValues(alpha: 0.6),
                              blurRadius: 4,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 7),

                      // Cluster Title
                      Flexible(
                        child: Text(
                          name,
                          style: GoogleFonts.inter(
                            color: textColor,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.2,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),

                      // Optional Category Tag
                      if (cluster?.categoryId != null) ...[
                        () {
                          final cat = data.categories.where((c) => c.id == cluster!.categoryId).cast<Category?>().firstWhere((_) => true, orElse: () => null);
                          if (cat == null) return const SizedBox.shrink();
                          final catColor = colorFromHex(cat.color);
                          return Container(
                            margin: const EdgeInsets.only(left: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: catColor.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: catColor.withValues(alpha: 0.3), width: 0.7),
                            ),
                            child: Text(
                              cat.name,
                              style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600, color: catColor),
                            ),
                          );
                        }(),
                      ],
                      const SizedBox(width: 6),

                      // Progress / Task Count Capsule
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E212D) : const Color(0xFFE5E7EB),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (cluster != null && progress != null && progress.total > 0) ...[
                              SizedBox(
                                width: 10,
                                height: 10,
                                child: CircularProgressIndicator(
                                  value: progress.pct / 100,
                                  strokeWidth: 1.8,
                                  backgroundColor: isDark ? const Color(0xFF33374A) : const Color(0xFFD1D5DB),
                                  color: clusterColor,
                                ),
                              ),
                              const SizedBox(width: 4.5),
                            ],
                            Text(
                              doneCount > 0 ? '$openCount/$totalCount' : '$totalCount',
                              style: GoogleFonts.inter(
                                color: mutedColor,
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 5),

                      // Quick Add Task Button (Prominent 28x28 Touch Target)
                      InkWell(
                        onTap: () => showQuickCaptureSheet(context, defaultClusterId: id),
                        borderRadius: BorderRadius.circular(7),
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF222534) : const Color(0xFFE5E7EB),
                            borderRadius: BorderRadius.circular(7),
                          ),
                          alignment: Alignment.center,
                          child: Icon(Icons.add_rounded, size: 19, color: textColor),
                        ),
                      ),
                      const SizedBox(width: 4),

                      // More Cluster Menu Button (Prominent 28x28 Touch Target)
                      if (cluster != null) ...[
                        InkWell(
                          onTap: () => _clusterMenu(context, controller, cluster, clusterIndex, totalClusters, allClusters, data),
                          borderRadius: BorderRadius.circular(7),
                          child: Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF222534) : const Color(0xFFE5E7EB),
                              borderRadius: BorderRadius.circular(7),
                            ),
                            alignment: Alignment.center,
                            child: Icon(Icons.more_horiz_rounded, size: 18, color: textColor),
                          ),
                        ),
                        const SizedBox(width: 4),
                      ],

                      // Expand / Collapse Chevron Button (Prominent 28x28 Touch Target)
                      InkWell(
                        onTap: () => setState(() => isCollapsed ? _collapsed.remove(id) : _collapsed.add(id)),
                        borderRadius: BorderRadius.circular(7),
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF222534) : const Color(0xFFE5E7EB),
                            borderRadius: BorderRadius.circular(7),
                          ),
                          alignment: Alignment.center,
                          child: Icon(
                            isCollapsed ? Icons.keyboard_arrow_down_rounded : Icons.keyboard_arrow_up_rounded,
                            size: 19,
                            color: textColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 4),

              // Task List nested inside Cluster Box
              if (!isCollapsed)
                if (tasks.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Center(
                      child: Text(
                        _searchCtrl.text.isNotEmpty ? 'No matches here.' : 'No tasks — drop tasks here.',
                        style: GoogleFonts.inter(color: ink3Color, fontSize: 11.5, fontStyle: FontStyle.italic),
                      ),
                    ),
                  )
                else
                  Column(
                    children: tasks
                        .map((t) => Padding(
                              padding: const EdgeInsets.only(bottom: 4.5),
                              child: LongPressDraggable<Task>(
                                delay: const Duration(milliseconds: 120),
                                data: t,
                                feedback: Material(
                                  color: Colors.transparent,
                                  child: SizedBox(
                                    width: MediaQuery.of(context).size.width - 28,
                                    child: Opacity(
                                      opacity: 0.92,
                                      child: TaskCard(
                                        task: t,
                                        noteCount: data.notes.where((n) => n.taskId == t.id && isTextNoteKind(n.kind)).length,
                                        attachments: data.notes.where((n) => n.taskId == t.id && isAttachmentKind(n.kind)).toList(),
                                        onToggle: () {},
                                        onStar: () {},
                                        onOpen: () {},
                                        onNotes: () {},
                                      ),
                                    ),
                                  ),
                                ),
                                childWhenDragging: Opacity(
                                  opacity: 0.25,
                                  child: TaskCard(
                                    task: t,
                                    noteCount: data.notes.where((n) => n.taskId == t.id && isTextNoteKind(n.kind)).length,
                                    attachments: data.notes.where((n) => n.taskId == t.id && isAttachmentKind(n.kind)).toList(),
                                    onToggle: () {},
                                    onStar: () {},
                                    onOpen: () {},
                                    onNotes: () {},
                                  ),
                                ),
                                child: GestureDetector(
                                  onSecondaryTap: () => _taskMenu(context, controller, t, data),
                                  child: TaskCard(
                                    task: t,
                                    noteCount: data.notes.where((n) => n.taskId == t.id && isTextNoteKind(n.kind)).length,
                                    attachments: data.notes.where((n) => n.taskId == t.id && isAttachmentKind(n.kind)).toList(),
                                    onToggle: () => controller.patchTask(t.id, {'done': !t.done}, (task) => task.copyWith(done: !task.done)),
                                    onStar: () => controller.patchTask(t.id, {'starred': !t.starred}, (task) => task.copyWith(starred: !task.starred)),
                                    onOpen: () => context.push('/task/${t.id}'),
                                    onNotes: () => context.push('/task/${t.id}?tab=notes'),
                                    onDelete: () {
                                      final now = DateTime.now().toIso8601String();
                                      controller.patchTask(t.id, {'binned': true, 'cold': false, 'binned_at': now}, (task) => task.copyWith(binned: true, cold: false, binnedAt: now, binnedAtSet: true));
                                    },
                                  ),
                                ),
                              ),
                            ))
                        .toList(),
                  ),
            ],
          ),
        );
      },
    );
  }

  void _taskMenu(BuildContext context, BoardController controller, Task t, BoardPayload data) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF181922) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(height: 8),
          Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: AppColors.lineStrong, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Task options', style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 16)),
                IconButton(icon: const Icon(Icons.close_rounded, size: 20), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
          ),
          ListTile(leading: const Icon(Icons.drive_file_move_outlined), title: const Text('Move to…'), onTap: () {
            Navigator.pop(ctx);
            _moveTaskSheet(context, controller, t, data);
          }),
          ListTile(leading: const Icon(Icons.ac_unit_rounded, color: Color(0xFF38BDF8)), title: const Text('Freeze → Cold store'), onTap: () {
            Navigator.pop(ctx);
            controller.patchTask(t.id, {'cold': true}, (task) => task.copyWith(cold: true));
          }),
          ListTile(
            leading: const Icon(Icons.delete_outline_rounded, color: AppColors.danger),
            title: const Text('Move to bin', style: TextStyle(color: AppColors.danger)),
            onTap: () {
              Navigator.pop(ctx);
              final now = DateTime.now().toIso8601String();
              controller.patchTask(t.id, {'binned': true, 'cold': false, 'binned_at': now}, (task) => task.copyWith(binned: true, cold: false, binnedAt: now, binnedAtSet: true));
            },
          ),
          const SizedBox(height: 12),
        ]),
      ),
    );
  }

  void _moveTaskSheet(BuildContext context, BoardController controller, Task t, BoardPayload data) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF181922) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.symmetric(vertical: 8),
          children: [
            Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: AppColors.lineStrong, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Move to cluster', style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 16)),
                  IconButton(icon: const Icon(Icons.close_rounded, size: 20), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
            ),
            ListTile(title: const Text('Floating'), onTap: () { Navigator.pop(ctx); controller.moveTask(t.id, null); }),
            for (final c in data.clusters.where(isClusterActive))
              ListTile(
                leading: Container(width: 10, height: 10, decoration: BoxDecoration(color: colorFromHex(c.color), shape: BoxShape.circle)),
                title: Text(c.name),
                onTap: () { Navigator.pop(ctx); controller.moveTask(t.id, c.id); },
              ),
          ],
        ),
      ),
    );
  }

  void _clusterMenu(
    BuildContext context,
    BoardController controller,
    Cluster cluster,
    int index,
    int total,
    List<Cluster> allClusters,
    BoardPayload data,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF181922) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(height: 8),
          Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: AppColors.lineStrong, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(cluster.name, style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 16)),
                IconButton(icon: const Icon(Icons.close_rounded, size: 20), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.edit_outlined),
            title: const Text('Edit name, colour, category'),
            onTap: () {
              Navigator.pop(ctx);
              context.push('/cluster/${cluster.id}');
            },
          ),
          if (index > 0)
            ListTile(
              leading: const Icon(Icons.arrow_back_rounded),
              title: const Text('Move left'),
              onTap: () {
                Navigator.pop(ctx);
                final list = [...allClusters];
                final temp = list[index];
                list[index] = list[index - 1];
                list[index - 1] = temp;
                controller.reorderClusters(list);
              },
            ),
          if (index < total - 1)
            ListTile(
              leading: const Icon(Icons.arrow_forward_rounded),
              title: const Text('Move right'),
              onTap: () {
                Navigator.pop(ctx);
                final list = [...allClusters];
                final temp = list[index];
                list[index] = list[index + 1];
                list[index + 1] = temp;
                controller.reorderClusters(list);
              },
            ),
          ListTile(
            leading: const Icon(Icons.picture_as_pdf_outlined, color: Colors.purpleAccent),
            title: const Text('Export as LaTeX (.tex)', style: TextStyle(color: Colors.purpleAccent)),
            onTap: () {
              Navigator.pop(ctx);
              _exportLatexDialog(context, cluster, data);
            },
          ),
          ListTile(
            leading: const Icon(Icons.ac_unit_rounded, color: Color(0xFF38BDF8)),
            title: const Text('Pause → Cold store'),
            onTap: () {
              Navigator.pop(ctx);
              controller.patchCluster(cluster.id, {'status': 'cold'}, (c) => c.copyWith(status: ClusterStatus.cold));
            },
          ),
          ListTile(
            leading: const Icon(Icons.delete_outline_rounded, color: AppColors.danger),
            title: const Text('Move to Dumping bin', style: TextStyle(color: AppColors.danger)),
            onTap: () {
              Navigator.pop(ctx);
              final now = DateTime.now().toIso8601String();
              controller.patchCluster(cluster.id, {'status': 'binned', 'binned_at': now}, (c) => c.copyWith(status: ClusterStatus.binned, binnedAt: now, binnedAtSet: true));
            },
          ),
          const SizedBox(height: 12),
        ]),
      ),
    );
  }

  void _exportLatexDialog(BuildContext context, Cluster cluster, BoardPayload data) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final clusterTasks = data.tasks.where((t) => t.clusterId == cluster.id).toList();
    final notesByTask = <int, List<Note>>{};
    for (final t in clusterTasks) {
      notesByTask[t.id] = data.notes.where((n) => n.taskId == t.id).toList();
    }

    final latex = exportClusterToLatex(
      cluster: cluster,
      tasks: clusterTasks,
      notesByTask: notesByTask,
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? const Color(0xFF181922) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SizedBox(
        height: MediaQuery.of(context).size.height * 0.8,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: AppColors.lineStrong, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('LaTeX Export (.tex)', style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 16, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.panel2 : AppColors.lightPanel2,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: SingleChildScrollView(
                    child: Text(latex, style: TextStyle(fontFamily: 'monospace', fontSize: 12, color: Theme.of(context).colorScheme.onSurface)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.copy_rounded),
                  label: const Text('Copy LaTeX Code'),
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: latex));
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('LaTeX document copied to clipboard!')));
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _manageCategories(BuildContext context, BoardController controller, BoardPayload? data) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final nameCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? const Color(0xFF181922) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheetState) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 16),
          child: SafeArea(
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: AppColors.lineStrong, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Categories', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Theme.of(context).colorScheme.onSurface)),
                  IconButton(icon: const Icon(Icons.close_rounded, size: 20), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 12),
              for (final c in data?.categories ?? [])
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(width: 12, height: 12, decoration: BoxDecoration(color: colorFromHex(c.color), shape: BoxShape.circle)),
                  title: Text(c.name, style: TextStyle(color: Theme.of(context).colorScheme.onSurface)),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger, size: 18),
                    onPressed: () {
                      controller.deleteCategory(c.id);
                      setSheetState(() {});
                    },
                  ),
                ),
              Row(children: [
                Expanded(child: TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'New category'))),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.add_circle_rounded, color: AppColors.accent),
                  onPressed: () {
                    final v = nameCtrl.text.trim();
                    if (v.isEmpty) return;
                    controller.createCategory(name: v, color: clusterColors[(data?.categories.length ?? 0) % clusterColors.length]);
                    nameCtrl.clear();
                    setSheetState(() {});
                  },
                ),
              ]),
              const SizedBox(height: 16),
            ]),
          ),
        );
      }),
    );
  }
}
