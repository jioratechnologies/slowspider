import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../design/icons.dart';
import '../core/app_theme.dart';
import '../design/tokens.dart';
import '../core/helpers.dart';
import '../core/latex_exporter.dart';
import '../core/session_storage.dart';
import '../core/upload_helper.dart';
import '../models/models.dart';
import '../state/auth_provider.dart';
import '../state/board_provider.dart';
import '../state/theme_provider.dart';
import '../widgets/atom_icon.dart';
import '../widgets/create_cluster_sheet.dart';
import '../widgets/quick_capture_sheet.dart';
import '../widgets/research/research_suite_modal.dart';
import '../widgets/slow_spider_logo.dart';
import '../widgets/task_card.dart';
import 'workspace_screen.dart';

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
    final p = context.ink;

    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? const Color(0xFF949BAE) : const Color(0xFF6B7280);
    final ink3Color = isDark ? AppColors.ink3 : AppColors.lightInk3;
    final panelBg = isDark ? const Color(0xFF16171E) : Colors.white;
    final pillBorder = isDark ? const Color(0xFF2C2F3D) : AppColors.lightLine;
    final topBarBg = isDark ? const Color(0xE6181926) : const Color(0xF2FFFFFF);
    final topBarBorder = isDark ? const Color(0xFF2C3042) : const Color(0xFFE2E4EB);

    final board = ref.watch(boardProvider);
    final controller = ref.read(boardProvider.notifier);
    final auth = ref.watch(authProvider);
    final data = board.data;

    if (data == null) {
      if (board.loading || auth.status == AuthStatus.restoring || board.error == null) {
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      }
      final isAuthError = (board.error ?? '').toLowerCase().contains('token') ||
          (board.error ?? '').toLowerCase().contains('expired') ||
          (board.error ?? '').toLowerCase().contains('not signed in') ||
          (board.error ?? '').toLowerCase().contains('401');

      return Scaffold(
        backgroundColor: isDark ? const Color(0xFF0F1015) : const Color(0xFFF9FAFC),
        appBar: AppBar(
          toolbarHeight: 56,
          backgroundColor: topBarBg,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          title: Row(
            children: [
              const SlowSpiderLogo(size: 28),
              const SizedBox(width: 8),
              Text(
                'Slow Spider',
                style: GoogleFonts.inter(color: textColor, fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: Icon(Icons.refresh_rounded, color: textColor),
              tooltip: 'Reload',
              onPressed: controller.reload,
            ),
            IconButton(
              icon: const Icon(SpiderIcons.signOut, color: AppColors.danger),
              tooltip: 'Sign out',
              onPressed: () => ref.read(authProvider.notifier).signOut(),
            ),
            const SizedBox(width: 8),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(1),
            child: Container(height: 1, color: topBarBorder),
          ),
        ),
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF181A24) : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isDark ? const Color(0xFF2B2E40) : const Color(0xFFE5E7EB)),
                  boxShadow: [
                    BoxShadow(
                      color: isDark ? Colors.black.withValues(alpha: 0.35) : Colors.black.withValues(alpha: 0.05),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Icon Badge
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: (isAuthError ? const Color(0xFFF43F5E) : AppColors.accent).withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: (isAuthError ? const Color(0xFFF43F5E) : AppColors.accent).withValues(alpha: 0.3),
                        ),
                      ),
                      child: Icon(
                        isAuthError ? Icons.lock_clock_outlined : Icons.cloud_off_rounded,
                        size: 26,
                        color: isAuthError ? const Color(0xFFF43F5E) : AppColors.accent,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Title
                    Text(
                      isAuthError ? 'Session Expired' : 'Connection Problem',
                      style: GoogleFonts.inter(
                        color: textColor,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),

                    // Error description
                    Text(
                      isAuthError
                          ? 'Your login session has expired. Please sign in again to access your tasks and workspaces.'
                          : (board.error ?? 'Could not connect to Slow Spider server.'),
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        color: mutedColor,
                        fontSize: 13,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Actions
                    if (isAuthError) ...[
                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accent,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            elevation: 0,
                          ),
                          onPressed: () => ref.read(authProvider.notifier).signOut(),
                          icon: const Icon(Icons.login_rounded, size: 18),
                          label: Text(
                            'Sign In Again',
                            style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14),
                          ),
                        ),
                      ),
                    ] else ...[
                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accent,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            elevation: 0,
                          ),
                          onPressed: controller.reload,
                          icon: const Icon(Icons.refresh_rounded, size: 18),
                          label: Text(
                            'Retry Connection',
                            style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        height: 40,
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: mutedColor,
                            side: BorderSide(color: isDark ? const Color(0xFF2E3244) : const Color(0xFFE2E4EB)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () => ref.read(authProvider.notifier).signOut(),
                          icon: const Icon(SpiderIcons.signOut, size: 16, color: AppColors.danger),
                          label: Text(
                            'Sign Out',
                            style: GoogleFonts.inter(color: AppColors.danger, fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    final query = _searchCtrl.text.trim().toLowerCase();
    bool matches(Task t) => query.isEmpty || displayTitle(t.title).toLowerCase().contains(query) || t.notes.toLowerCase().contains(query);
    final liveTasks = data.tasks.where((t) => isTaskLive(t, data.clusters) && matches(t)).toList();

    final activeClusters = data.clusters.where(isClusterActive).where((c) => _activeCategory == null || c.categoryId == _activeCategory).toList();

    if (board.sortMode == SortMode.smart) {
      activeClusters.sort((a, b) {
        final aTasks = liveTasks.where((t) => t.clusterId == a.id && !t.done).toList();
        final bTasks = liveTasks.where((t) => t.clusterId == b.id && !t.done).toList();

        // 1. Clusters with most starred open tasks first
        final aStarred = aTasks.where((t) => t.starred).length;
        final bStarred = bTasks.where((t) => t.starred).length;
        if (aStarred != bStarred) return bStarred.compareTo(aStarred);

        // 2. Earliest upcoming deadline in cluster
        int aMinDiff = 1 << 30;
        for (final t in aTasks) {
          if (t.deadline != null) {
            final diff = dayDiff(t.deadline);
            if (diff != null && diff < aMinDiff) aMinDiff = diff;
          }
        }

        int bMinDiff = 1 << 30;
        for (final t in bTasks) {
          if (t.deadline != null) {
            final diff = dayDiff(t.deadline);
            if (diff != null && diff < bMinDiff) bMinDiff = diff;
          }
        }

        if (aMinDiff != bMinDiff) return aMinDiff.compareTo(bMinDiff);

        // 3. Highest priority task in cluster
        int aMaxPrio = aTasks.fold(0, (m, t) => (prioRank[t.priority] ?? 0) > m ? (prioRank[t.priority] ?? 0) : m);
        int bMaxPrio = bTasks.fold(0, (m, t) => (prioRank[t.priority] ?? 0) > m ? (prioRank[t.priority] ?? 0) : m);
        if (aMaxPrio != bMaxPrio) return bMaxPrio.compareTo(aMaxPrio);

        // 4. Default position
        return a.pos.compareTo(b.pos);
      });
    }

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
          toolbarHeight: 56,
          titleSpacing: 6,
          backgroundColor: topBarBg,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(1),
            child: Container(
              height: 1,
              color: topBarBorder,
            ),
          ),
          title: _searchOpen
              ? Container(
                  height: 38,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF202332) : const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: topBarBorder),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: Row(
                    children: [
                      Icon(SpiderIcons.search, size: 18, color: ink3Color),
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
              : LayoutBuilder(
                  builder: (context, constraints) {
                    final showPill = constraints.maxWidth > 60;
                    return Row(
                      children: [
                        const SlowSpiderLogo(size: 26),
                        if (showPill) ...[
                          const SizedBox(width: 6),
                          // Workspace switcher capsule pill
                          Flexible(
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () {
                                  HapticFeedback.lightImpact();
                                  showWorkspaceDialog(context);
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                                  clipBehavior: Clip.hardEdge,
                                  decoration: BoxDecoration(
                                    color: p.surface,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: p.line,
                                      width: 0.9,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      AppIcon(SpiderIcons.workspace, size: 12, color: p.ink),
                                      const SizedBox(width: 3),
                                      Flexible(
                                        child: Text(
                                          workspaceName ?? 'Workspace',
                                          overflow: TextOverflow.ellipsis,
                                          maxLines: 1,
                                          style: GoogleFonts.inter(
                                            color: textColor,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 2),
                                      AppIcon(SpiderIcons.workspaceSelector, size: 11, color: p.inkMuted),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ],
                    );
                  },
                ),
          leading: _searchOpen
              ? IconButton(
                  icon: Icon(SpiderIcons.back, color: textColor, size: 20),
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
                      icon: Icon(SpiderIcons.close, color: textColor, size: 18),
                      onPressed: () => setState(() => _searchCtrl.clear()),
                    ),
                  const SizedBox(width: 4),
                ]
              : [
                  // 1. Unified Action Toolbar — redesigned pill
                  Container(
                    height: 40,
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                    decoration: BoxDecoration(
                      color: p.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: p.line, width: 1),
                      boxShadow: [
                        BoxShadow(
                          color: isDark ? Colors.black.withValues(alpha: 0.22) : const Color(0xFF0F172A).withValues(alpha: 0.06),
                          blurRadius: 12,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Research Tools
                        _navBarItem(
                          customIcon: AtomIcon(size: 18, color: p.inkMuted, strokeWidth: 1.8),
                          tooltip: 'Research Tools',
                          onTap: () {
                            HapticFeedback.lightImpact();
                            showResearchSuiteModal(context);
                          },
                        ),
                        _navDivider(isDark),
                        // Sort Mode
                        _navBarItem(
                          icon: board.sortMode == SortMode.smart ? SpiderIcons.smartSort : SpiderIcons.manualSort,
                          tooltip: 'Sort: ${board.sortMode == SortMode.smart ? 'Smart' : 'Manual'}',
                          color: p.inkMuted,
                          onTap: () {
                            HapticFeedback.selectionClick();
                            controller.toggleSortMode();
                          },
                        ),
                        _navDivider(isDark),
                        // Calendar
                        _navBarItem(
                          icon: SpiderIcons.calendar,
                          tooltip: 'Calendar',
                          color: p.inkMuted,
                          onTap: () {
                            HapticFeedback.lightImpact();
                            context.push('/calendar');
                          },
                        ),
                        _navDivider(isDark),
                        // New Cluster — circular + with p.ink bg
                        Tooltip(
                          message: 'New Cluster',
                          waitDuration: const Duration(milliseconds: 200),
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () {
                                HapticFeedback.lightImpact();
                                showCreateClusterSheet(context, onCreate: (name, color) => controller.createCluster(name: name, color: color, categoryId: _activeCategory));
                              },
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                width: 30,
                                height: 30,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: p.ink,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: p.lineStrong, width: 1),
                                ),
                                child: AppIcon(SpiderIcons.plus, size: 14, color: p.onInk),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Notifications — outside pill, as in screenshot
                  Container(
                    height: 38,
                    width: 38,
                    decoration: BoxDecoration(
                      color: p.surface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: p.line, width: 1),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                      child: InkWell(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('No new notifications or invites.'), duration: Duration(seconds: 2)),
                          );
                        },
                        borderRadius: BorderRadius.circular(10),
                        child: Center(
                          child: AppIcon(SpiderIcons.notifications, size: 18, color: p.inkMuted),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // 2. Account Profile Avatar Dropdown
                  PopupMenuButton<String>(
                    offset: const Offset(0, 48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                      side: BorderSide(
                        color: isDark ? const Color(0xFF2E3244) : const Color(0xFFE2E8F0),
                        width: 1.2,
                      ),
                    ),
                    color: isDark ? const Color(0xFF161824) : Colors.white,
                    elevation: 18,
                    onSelected: (v) async {
                      switch (v) {
                        case 'theme':
                          ref.read(themeProvider.notifier).cycleTheme();
                          break;
                        case 'workspaces':
                          showWorkspaceDialog(context);
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
                      const quotaBytes = 10 * 1024 * 1024 * 1024; // 10 GB
                      final usedBytes = data.storageUsed;
                      final remainingBytes = (quotaBytes - usedBytes).clamp(0, quotaBytes);

                      return [
                        PopupMenuItem(
                          enabled: false,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
                                  alignment: Alignment.center,
                                  decoration: const BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                                    ),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Text(
                                    userInitials,
                                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'SIGNED IN AS',
                                        style: GoogleFonts.inter(
                                          color: ink3Color,
                                          fontSize: 9.5,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        displayEmail,
                                        style: GoogleFonts.inter(
                                          color: textColor,
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        // Storage Quota Progress Card
                        PopupMenuItem(
                          enabled: false,
                          child: Container(
                            margin: const EdgeInsets.symmetric(vertical: 2),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E2130) : const Color(0xFFF1F4F9),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isDark ? const Color(0xFF2B3044) : const Color(0xFFE2E8F0),
                                width: 0.9,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        const Icon(Icons.cloud_outlined, size: 14, color: Color(0xFF38BDF8)),
                                        const SizedBox(width: 5),
                                        Text(
                                          'Storage',
                                          style: GoogleFonts.inter(
                                            color: textColor,
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                    Text(
                                      '${formatBytes(remainingBytes)} left',
                                      style: GoogleFonts.inter(
                                        color: const Color(0xFF10B981),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: LinearProgressIndicator(
                                    value: (usedBytes / quotaBytes).clamp(0.01, 1.0),
                                    minHeight: 4.5,
                                    backgroundColor: isDark ? const Color(0xFF2A2E42) : const Color(0xFFE2E8F0),
                                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF38BDF8)),
                                  ),
                                ),
                                const SizedBox(height: 5),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '${formatBytes(usedBytes)} used',
                                      style: GoogleFonts.inter(
                                        color: mutedColor,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    Text(
                                      '${formatBytes(quotaBytes)} total',
                                      style: GoogleFonts.inter(
                                        color: mutedColor,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                        const PopupMenuDivider(),
                        PopupMenuItem(
                          value: 'theme',
                          child: Row(
                            children: [
                              Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: p.ink.withValues(alpha: 0.10),
                                  borderRadius: BorderRadius.circular(7),
                                  border: Border.all(color: p.line),
                                ),
                                child: AppIcon(currentTheme.icon, size: 15, color: p.ink),
                              ),
                              const SizedBox(width: 10),
                              Text('Theme: ${currentTheme.label}', style: GoogleFonts.inter(color: textColor, fontSize: 13, fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),
                        const PopupMenuDivider(),
                        PopupMenuItem(
                          enabled: false,
                          child: Text(
                            'ORGANIZE',
                            style: GoogleFonts.inter(
                              color: ink3Color,
                              fontSize: 9.5,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        PopupMenuItem(
                          value: 'categories',
                          child: Row(
                            children: [
                              Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0EA5E9).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(7),
                                ),
                                child: const Icon(SpiderIcons.manageCategories, size: 14.5, color: Color(0xFF0EA5E9)),
                              ),
                              const SizedBox(width: 10),
                              Text('Manage categories...', style: GoogleFonts.inter(color: textColor, fontSize: 13, fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),
                        PopupMenuItem(
                          value: 'workspaces',
                          child: Row(
                            children: [
                              Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF8B5CF6).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(7),
                                ),
                                child: const Icon(SpiderIcons.members, size: 14.5, color: Color(0xFF8B5CF6)),
                              ),
                              const SizedBox(width: 10),
                              Text('Workspaces & Members', style: GoogleFonts.inter(color: textColor, fontSize: 13, fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),
                        const PopupMenuDivider(),
                        PopupMenuItem(
                          value: 'sign_out',
                          child: Row(
                            children: [
                              Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: AppColors.danger.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(7),
                                ),
                                child: const Icon(SpiderIcons.signOut, size: 14.5, color: AppColors.danger),
                              ),
                              const SizedBox(width: 10),
                              Text('Sign out', style: GoogleFonts.inter(color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ];
                    },
                    child: Container(
                      width: 35,
                      height: 35,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                        ),
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF6366F1).withValues(alpha: 0.35),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                        border: Border.all(
                          color: isDark ? Colors.white.withValues(alpha: 0.2) : Colors.white,
                          width: 1.2,
                        ),
                      ),
                      child: Text(
                        userInitials,
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.2,
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
              // Segmented Category Filter Bar (Glassmorphic Floating Capsule)
              if (availableCategories.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xEB161824) : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isDark ? const Color(0xFF282B3D) : const Color(0xFFE2E6F0),
                        width: 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: isDark ? Colors.black.withValues(alpha: 0.28) : const Color(0xFF64748B).withValues(alpha: 0.06),
                          blurRadius: 12,
                          offset: const Offset(0, 3),
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
                            // Interactive Filter Toggle Button — redesigned for light/dark contrast
                            Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () {
                                  HapticFeedback.lightImpact();
                                  setState(() => _filterExpanded = !_filterExpanded);
                                },
                                borderRadius: BorderRadius.circular(9),
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 180),
                                  curve: Curves.easeOutCubic,
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: _filterExpanded ? p.ink : Colors.transparent,
                                    borderRadius: BorderRadius.circular(9),
                                    border: _filterExpanded
                                        ? Border.all(color: p.ink.withValues(alpha: 0.12), width: 1)
                                        : null,
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      AppIcon(
                                        SpiderIcons.sliders,
                                        size: 14,
                                        color: _filterExpanded ? p.onInk : mutedColor,
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        'Filter',
                                        style: GoogleFonts.inter(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: _filterExpanded ? p.onInk : mutedColor,
                                          letterSpacing: -0.1,
                                        ),
                                      ),
                                      const SizedBox(width: 3),
                                      AppIcon(
                                        _filterExpanded ? SpiderIcons.chevronUp : SpiderIcons.chevronDown,
                                        size: 14,
                                        color: _filterExpanded ? p.onInk : mutedColor,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),

                            // Divider line
                            Container(
                              height: 18,
                              width: 1,
                              color: isDark ? const Color(0xFF2B2E3D) : const Color(0xFFE2E4EB),
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                            ),

                            // Single-line horizontal scrollable with Active Category first
                            if (!_filterExpanded)
                              Expanded(
                                child: SingleChildScrollView(
                                  scrollDirection: Axis.horizontal,
                                  physics: const BouncingScrollPhysics(),
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
                                        onTap: () {
                                          HapticFeedback.selectionClick();
                                          setState(() => _activeCategory = null);
                                        },
                                      ),
                                      // Categories
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
                                          onTap: () {
                                            HapticFeedback.selectionClick();
                                            setState(() => _activeCategory = _activeCategory == cat.id ? null : cat.id);
                                          },
                                        ),
                                    ],
                                  ),
                                ),
                              )
                            else ...[
                              // When Expanded Vertically
                              _webFilterPill(
                                context: context,
                                label: 'All',
                                count: data.clusters.where(isClusterActive).length,
                                active: _activeCategory == null,
                                color: null,
                                onTap: () {
                                  HapticFeedback.selectionClick();
                                  setState(() => _activeCategory = null);
                                },
                              ),
                            ],
                          ],
                        ),

                        // If Expanded Vertically: Multi-Line Wrapped Category Grid
                        if (_filterExpanded) ...[
                          const SizedBox(height: 6),
                          Padding(
                            padding: const EdgeInsets.fromLTRB(4, 2, 4, 4),
                            child: Wrap(
                              spacing: 5,
                              runSpacing: 6,
                              children: [
                                for (final cat in availableCategories)
                                  _webFilterPill(
                                    context: context,
                                    label: cat.name,
                                    color: cat.color,
                                    count: data.clusters.where(isClusterActive).where((c) => c.categoryId == cat.id).length,
                                    active: _activeCategory == cat.id,
                                    onTap: () {
                                      HapticFeedback.selectionClick();
                                      setState(() => _activeCategory = _activeCategory == cat.id ? null : cat.id);
                                    },
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

              // Cluster Columns / Drop Target Groups (Responsive Tablet Multi-Column Support)
              LayoutBuilder(
                builder: (ctx, constraints) {
                  final isTablet = constraints.maxWidth >= 720;
                  if (isTablet) {
                    final colCount = constraints.maxWidth >= 1050 ? 3 : 2;
                    final colWidth = (constraints.maxWidth - (colCount - 1) * 10) / colCount;
                    return Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      crossAxisAlignment: WrapCrossAlignment.start,
                      children: [
                        for (int idx = 0; idx < activeClusters.length; idx++)
                          SizedBox(
                            width: colWidth,
                            child: _group(
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
                          ),
                      ],
                    );
                  }

                  return Column(
                    children: [
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
                    ],
                  );
                },
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
    final p = context.ink;
    final textColor = isDark ? const Color(0xFFF3F4F6) : const Color(0xFF1E293B);
    final mutedColor = isDark ? const Color(0xFF949BAE) : const Color(0xFF64748B);
    final catColor = color != null ? colorFromHex(color) : AppColors.accent;

    BoxDecoration decoration;
    Color itemTextColor;
    Color badgeBg;
    Color badgeText;

    if (active) {
      if (color == null) {
        // Active "All" — Sleek Obsidian Glass / Deep Slate Accent Pill
        decoration = BoxDecoration(
          color: isDark ? const Color(0xFF262938) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(9),
          border: Border.all(
            color: isDark ? Colors.white.withValues(alpha: 0.16) : Colors.transparent,
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.12),
              blurRadius: 6,
              offset: const Offset(0, 1.5),
            ),
          ],
        );
        itemTextColor = Colors.white;
        badgeBg = isDark ? Colors.white.withValues(alpha: 0.18) : Colors.white.withValues(alpha: 0.22);
        badgeText = Colors.white;
      } else {
        // Active Category — Luminous Color-Tinted Capsule
        decoration = BoxDecoration(
          color: catColor.withValues(alpha: isDark ? 0.22 : 0.14),
          borderRadius: BorderRadius.circular(9),
          border: Border.all(
            color: catColor.withValues(alpha: isDark ? 0.55 : 0.45),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: catColor.withValues(alpha: 0.22),
              blurRadius: 8,
              offset: const Offset(0, 1.5),
            ),
          ],
        );
        itemTextColor = isDark ? Colors.white : textColor;
        badgeBg = catColor.withValues(alpha: isDark ? 0.35 : 0.25);
        badgeText = isDark ? Colors.white : catColor;
      }
    } else {
      // Inactive Category Pill
      decoration = BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.04) : const Color(0xFFF4F6FB),
        borderRadius: BorderRadius.circular(9),
        border: Border.all(
          color: isDark ? Colors.white.withValues(alpha: 0.06) : const Color(0xFFE2E8F0),
          width: 0.8,
        ),
      );
      itemTextColor = mutedColor;
      badgeBg = isDark ? const Color(0xFF222533) : const Color(0xFFE2E8F0);
      badgeText = mutedColor;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2.5),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(9),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            curve: Curves.easeOutCubic,
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
            decoration: decoration,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (color != null) ...[
                  Container(
                    width: 7.5,
                    height: 7.5,
                    decoration: BoxDecoration(
                      color: catColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: catColor.withValues(alpha: active ? 0.8 : 0.35),
                          blurRadius: active ? 5 : 2.5,
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
                    fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
                const SizedBox(width: 5.5),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: badgeBg,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '$count',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: badgeText,
                      height: 1.05,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _navDivider(bool isDark) {
    final p = context.ink;
    return Container(
      width: 1,
      height: 18,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: p.line,
        borderRadius: BorderRadius.circular(1),
      ),
    );
  }

  Widget _navBarItem({
    IconData? icon,
    Widget? customIcon,
    required String tooltip,
    Color? color,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      waitDuration: const Duration(milliseconds: 200),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(7),
          child: Container(
            width: 32,
            height: 32,
            alignment: Alignment.center,
            child: customIcon ?? (icon != null ? Icon(icon, size: 18, color: color) : const SizedBox.shrink()),
          ),
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
    final p = context.ink;
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
                          color: clusterColor,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: clusterColor.withValues(alpha: 0.8),
                              blurRadius: 7,
                              spreadRadius: 0.5,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 7),

                      // Cluster Name & Category Badge (Flexible/Expanded)
                      Expanded(
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Flexible(
                              child: Text(
                                name,
                                style: GoogleFonts.inter(
                                  color: textColor,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: -0.2,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (cluster != null && cluster.categoryId != null) ...[
                              const SizedBox(width: 4),
                              Flexible(
                                child: () {
                                  final cat = data.categories.where((c) => c.id == cluster.categoryId).cast<Category?>().firstWhere((_) => true, orElse: () => null);
                                  if (cat == null) return const SizedBox.shrink();
                                  final catColor = colorFromHex(cat.color);
                                  return Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: catColor.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(4),
                                      border: Border.all(color: catColor.withValues(alpha: 0.35), width: 0.7),
                                    ),
                                    child: Text(
                                      cat.name,
                                      style: GoogleFonts.inter(
                                        color: catColor,
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w600,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  );
                                }(),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 4),

                      // Progress / Task Count Capsule
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.panel2 : AppColors.lightPanel2,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: p.line,
                            width: 0.8,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (progress != null && progress.total > 0) ...[
                              SizedBox(
                                width: 11,
                                height: 11,
                                child: CircularProgressIndicator(
                                  value: progress.pct / 100,
                                  strokeWidth: 1.8,
                                  backgroundColor: isDark ? AppColors.line : AppColors.lightLine,
                                  color: isDark ? AppColors.ink : AppColors.lightInk,
                                ),
                              ),
                              const SizedBox(width: 4.5),
                            ],
                            Text(
                              doneCount > 0 ? '$openCount/$totalCount' : '$totalCount',
                              style: GoogleFonts.inter(
                                color: mutedColor,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 6),

                      // Quick Add Task Button
                      InkWell(
                        onTap: () => showQuickCaptureSheet(context, defaultClusterId: id),
                        borderRadius: BorderRadius.circular(6),
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.panel2 : AppColors.lightPanel2,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: p.line,
                              width: 0.8,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Icon(SpiderIcons.quickAdd, size: 17, color: textColor),
                        ),
                      ),
                      const SizedBox(width: 4),

                      // More Cluster Menu Button
                      if (cluster != null) ...[
                        InkWell(
                          onTap: () => _clusterMenu(context, controller, cluster, clusterIndex, totalClusters, allClusters, data),
                          borderRadius: BorderRadius.circular(6),
                          child: Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.panel2 : AppColors.lightPanel2,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: p.line,
                                width: 0.8,
                              ),
                            ),
                            alignment: Alignment.center,
                            child: Icon(SpiderIcons.moreHoriz, size: 16, color: textColor),
                          ),
                        ),
                        const SizedBox(width: 4),
                      ],

                      // Expand / Collapse Chevron Button
                      InkWell(
                        onTap: () => setState(() => isCollapsed ? _collapsed.remove(id) : _collapsed.add(id)),
                        borderRadius: BorderRadius.circular(6),
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.panel2 : AppColors.lightPanel2,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: p.line,
                              width: 0.8,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Icon(
                            isCollapsed ? SpiderIcons.expandChevron : SpiderIcons.collapseChevron,
                            size: 17,
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
                                delay: const Duration(milliseconds: 300),
                                data: t,
                                feedback: Material(
                                  color: Colors.transparent,
                                  child: SizedBox(
                                    width: MediaQuery.of(context).size.width - 28,
                                    child: Opacity(
                                      opacity: 0.95,
                                      child: TaskCard(
                                        task: t,
                                        noteCount: data.notes.where((n) => n.taskId == t.id && isTextNoteKind(n.kind)).length,
                                        attachments: data.notes.where((n) => n.taskId == t.id && isAttachmentKind(n.kind)).toList(),
                                        onToggle: () {},
                                        onStar: () {},
                                        onOpen: () {},
                                        onNotes: () {},
                                        onCold: () {},
                                        onDelete: () {},
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
                                    onCold: () {},
                                    onDelete: () {},
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
                                    onCold: () {
                                      controller.patchTask(t.id, {'cold': true, 'binned': false}, (task) => task.copyWith(cold: true, binned: false));
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text('Moved "${displayTitle(t.title)}" to Cold store ❄️'),
                                          backgroundColor: const Color(0xFF0EA5E9),
                                          duration: const Duration(seconds: 2),
                                        ),
                                      );
                                    },
                                    onDelete: () {
                                      final now = DateTime.now().toIso8601String();
                                      controller.patchTask(t.id, {'binned': true, 'cold': false, 'binned_at': now}, (task) => task.copyWith(binned: true, cold: false, binnedAt: now, binnedAtSet: true));
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text('Moved "${displayTitle(t.title)}" to Dumping bin 🗑️'),
                                          backgroundColor: const Color(0xFFEF4444),
                                          duration: const Duration(seconds: 2),
                                        ),
                                      );
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

  Widget _actionTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required Color tileBg,
    required Color tileBorder,
    required Color textColor,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
          decoration: BoxDecoration(
            color: tileBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: tileBorder, width: 0.9),
          ),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Icon(icon, size: 17, color: iconColor),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.inter(
                    color: textColor,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _taskMenu(BuildContext context, BoardController controller, Task t, BoardPayload data) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF161824) : Colors.white;
    final tileBg = isDark ? const Color(0xFF1F2232) : const Color(0xFFF6F8FC);
    final tileBorder = isDark ? const Color(0xFF2C3044) : const Color(0xFFE5E9F2);
    final textColor = isDark ? const Color(0xFFF3F4F6) : const Color(0xFF1E293B);

    showModalBottomSheet(
      context: context,
      backgroundColor: cardBg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF373B50) : const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      displayTitle(t.title),
                      style: GoogleFonts.inter(
                        color: textColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 16.5,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => Navigator.pop(ctx),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                          color: tileBg,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.close_rounded, size: 18, color: textColor),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _actionTile(
                icon: Icons.drive_file_move_outlined,
                iconColor: const Color(0xFF8B5CF6),
                title: 'Move to another cluster...',
                tileBg: tileBg,
                tileBorder: tileBorder,
                textColor: textColor,
                onTap: () {
                  Navigator.pop(ctx);
                  _moveTaskSheet(context, controller, t, data);
                },
              ),
              const SizedBox(height: 8),
              _actionTile(
                icon: Icons.ac_unit_rounded,
                iconColor: const Color(0xFF0EA5E9),
                title: 'Freeze → Cold store',
                tileBg: tileBg,
                tileBorder: tileBorder,
                textColor: const Color(0xFF0EA5E9),
                onTap: () {
                  Navigator.pop(ctx);
                  controller.patchTask(t.id, {'cold': true}, (task) => task.copyWith(cold: true));
                },
              ),
              const SizedBox(height: 8),
              _actionTile(
                icon: Icons.delete_outline_rounded,
                iconColor: const Color(0xFFEF4444),
                title: 'Move to Dumping bin',
                tileBg: tileBg,
                tileBorder: tileBorder,
                textColor: const Color(0xFFEF4444),
                onTap: () {
                  Navigator.pop(ctx);
                  final now = DateTime.now().toIso8601String();
                  controller.patchTask(t.id, {'binned': true, 'cold': false, 'binned_at': now}, (task) => task.copyWith(binned: true, cold: false, binnedAt: now, binnedAtSet: true));
                },
              ),
            ],
          ),
        ),
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
            ListTile(title: Text('Floating'), onTap: () { Navigator.pop(ctx); controller.moveTask(t.id, null); }),
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
    final catColor = colorFromHex(cluster.color);
    final cardBg = isDark ? const Color(0xFF161824) : Colors.white;
    final tileBg = isDark ? const Color(0xFF1F2232) : const Color(0xFFF6F8FC);
    final tileBorder = isDark ? const Color(0xFF2C3044) : const Color(0xFFE5E9F2);
    final textColor = isDark ? const Color(0xFFF3F4F6) : const Color(0xFF1E293B);

    showModalBottomSheet(
      context: context,
      backgroundColor: cardBg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Pull indicator
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF373B50) : const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Header Row: Cluster Color Dot + Cluster Name + Close button
              Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: catColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: catColor.withValues(alpha: 0.5),
                          blurRadius: 6,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      cluster.name,
                      style: GoogleFonts.inter(
                        color: textColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 16.5,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => Navigator.pop(ctx),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                          color: tileBg,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.close_rounded, size: 18, color: textColor),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Action 1: Edit Cluster
              _actionTile(
                icon: Icons.edit_outlined,
                iconColor: const Color(0xFF8B5CF6),
                title: 'Edit name, colour, category',
                tileBg: tileBg,
                tileBorder: tileBorder,
                textColor: textColor,
                onTap: () {
                  Navigator.pop(ctx);
                  context.push('/cluster/${cluster.id}');
                },
              ),

              // Action 2: Reorder Move Left / Right
              if (index > 0 || index < total - 1) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (index > 0)
                      Expanded(
                        child: _actionTile(
                          icon: Icons.arrow_back_rounded,
                          iconColor: const Color(0xFF64748B),
                          title: 'Move left',
                          tileBg: tileBg,
                          tileBorder: tileBorder,
                          textColor: textColor,
                          onTap: () {
                            Navigator.pop(ctx);
                            final list = [...allClusters];
                            final temp = list[index];
                            list[index] = list[index - 1];
                            list[index - 1] = temp;
                            controller.reorderClusters(list);
                          },
                        ),
                      ),
                    if (index > 0 && index < total - 1) const SizedBox(width: 8),
                    if (index < total - 1)
                      Expanded(
                        child: _actionTile(
                          icon: Icons.arrow_forward_rounded,
                          iconColor: const Color(0xFF64748B),
                          title: 'Move right',
                          tileBg: tileBg,
                          tileBorder: tileBorder,
                          textColor: textColor,
                          onTap: () {
                            Navigator.pop(ctx);
                            final list = [...allClusters];
                            final temp = list[index];
                            list[index] = list[index + 1];
                            list[index + 1] = temp;
                            controller.reorderClusters(list);
                          },
                        ),
                      ),
                  ],
                ),
              ],

              const SizedBox(height: 8),

              // Action 3: Export as LaTeX
              _actionTile(
                icon: Icons.picture_as_pdf_outlined,
                iconColor: const Color(0xFFEC4899),
                title: 'Export as LaTeX (.tex)',
                tileBg: tileBg,
                tileBorder: tileBorder,
                textColor: const Color(0xFFEC4899),
                onTap: () {
                  Navigator.pop(ctx);
                  _exportLatexDialog(context, cluster, data);
                },
              ),

              const SizedBox(height: 8),

              // Action 4: Cold Store
              _actionTile(
                icon: Icons.ac_unit_rounded,
                iconColor: const Color(0xFF0EA5E9),
                title: 'Pause → Cold store',
                tileBg: tileBg,
                tileBorder: tileBorder,
                textColor: const Color(0xFF0EA5E9),
                onTap: () {
                  Navigator.pop(ctx);
                  controller.patchCluster(cluster.id, {'status': 'cold'}, (c) => c.copyWith(status: ClusterStatus.cold));
                },
              ),

              const SizedBox(height: 8),

              // Action 5: Dumping Bin
              _actionTile(
                icon: Icons.delete_outline_rounded,
                iconColor: const Color(0xFFEF4444),
                title: 'Move to Dumping bin',
                tileBg: tileBg,
                tileBorder: tileBorder,
                textColor: const Color(0xFFEF4444),
                onTap: () {
                  Navigator.pop(ctx);
                  final now = DateTime.now().toIso8601String();
                  controller.patchCluster(cluster.id, {'status': 'binned', 'binned_at': now}, (c) => c.copyWith(status: ClusterStatus.binned, binnedAt: now, binnedAtSet: true));
                },
              ),
            ],
          ),
        ),
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
                  label: Text('Copy LaTeX Code'),
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
