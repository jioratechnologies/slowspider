import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_icons.dart';
import '../core/app_theme.dart';
import '../models/models.dart';
import '../state/auth_provider.dart';
import '../state/board_provider.dart';
import '../state/workspace_members_provider.dart';

Future<void> showWorkspaceDialog(BuildContext context) {
  return showDialog(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.6),
    builder: (ctx) => const _WorkspaceModalDialog(),
  );
}

class WorkspaceScreen extends StatelessWidget {
  const WorkspaceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: _WorkspaceModalDialog(isFullScreen: true),
      ),
    );
  }
}

class _WorkspaceModalDialog extends ConsumerStatefulWidget {
  final bool isFullScreen;
  const _WorkspaceModalDialog({this.isFullScreen = false});

  @override
  ConsumerState<_WorkspaceModalDialog> createState() => _WorkspaceModalDialogState();
}

class _WorkspaceModalDialogState extends ConsumerState<_WorkspaceModalDialog> {
  final _newNameCtrl = TextEditingController();
  final _inviteCtrl = TextEditingController();
  bool _creating = false;
  bool _inviting = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(boardProvider.notifier).loadWorkspaces();
      ref.read(workspaceMembersProvider.notifier).load();
      ref.read(workspaceMembersProvider.notifier).loadMyPendingInvites();
    });
  }

  @override
  void dispose() {
    _newNameCtrl.dispose();
    _inviteCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendInvite(WorkspaceMembersController membersController) async {
    final val = _inviteCtrl.text.trim();
    if (val.isEmpty || _inviting) return;
    setState(() => _inviting = true);
    final ok = await membersController.invite(val);
    if (ok) {
      _inviteCtrl.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Invitation sent to $val'),
            backgroundColor: const Color(0xFF10B981),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
    if (mounted) setState(() => _inviting = false);
  }

  String _computeInitials(String email) {
    final clean = email.split('@').first.trim();
    if (clean.length >= 2) {
      return clean.substring(0, 2).toUpperCase();
    }
    return clean.isNotEmpty ? clean.toUpperCase() : '?';
  }

  Color _avatarColor(String email) {
    const colors = [
      Color(0xFF8B5CF6), // Violet
      Color(0xFF0EA5E9), // Sky
      Color(0xFF10B981), // Emerald
      Color(0xFFF59E0B), // Amber
      Color(0xFFEC4899), // Pink
      Color(0xFF6366F1), // Indigo
      Color(0xFF14B8A6), // Teal
    ];
    final hash = email.codeUnits.fold(0, (prev, elem) => prev + elem);
    return colors[hash % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final dialogBg = isDark ? const Color(0xF2161822) : const Color(0xF7FFFFFF);
    final topBarBorder = isDark ? const Color(0xFF2A2E40) : const Color(0xFFE2E4EB);
    final cardBg = isDark ? const Color(0xFF1D202D) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF2C3044) : const Color(0xFFE2E4EA);
    final inputBg = isDark ? const Color(0xFF1E212E) : const Color(0xFFF3F4F6);
    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? const Color(0xFF949BAE) : const Color(0xFF6B7280);
    final ink3Color = isDark ? AppColors.ink3 : AppColors.lightInk3;

    final board = ref.watch(boardProvider);
    final boardController = ref.read(boardProvider.notifier);
    final members = ref.watch(workspaceMembersProvider);
    final membersController = ref.read(workspaceMembersProvider.notifier);
    final currentId = board.data?.workspaceId;

    final content = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Frosted Modal Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: topBarBorder, width: 1)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(AppIcons.workspace, size: 18, color: AppColors.accent),
                  const SizedBox(width: 8),
                  Text(
                    'Workspaces & Members',
                    style: GoogleFonts.inter(
                      color: textColor,
                      fontSize: 15.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: Icon(Icons.close_rounded, size: 20, color: mutedColor),
                onPressed: () => Navigator.pop(context),
                tooltip: 'Close',
                constraints: const BoxConstraints(),
                padding: const EdgeInsets.all(4),
              ),
            ],
          ),
        ),

        // 2. Scrollable Body
        Flexible(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
            children: [
              // Pending Invitations (if any)
              if (members.myPendingInvites.isNotEmpty) ...[
                _sectionHeader('PENDING INVITATIONS', count: members.myPendingInvites.length, isAlert: true),
                const SizedBox(height: 8),
                for (final inv in members.myPendingInvites)
                  Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF261D36) : const Color(0xFFFAF5FF),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFA855F7).withValues(alpha: 0.35)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: const Color(0xFFA855F7).withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(AppIcons.workspace, color: Color(0xFFA855F7), size: 16),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                inv.workspaceName,
                                style: GoogleFonts.inter(color: textColor, fontWeight: FontWeight.w700, fontSize: 13),
                              ),
                              if (inv.invitedByEmail != null)
                                Text(
                                  'Invited by ${inv.invitedByEmail}',
                                  style: GoogleFonts.inter(color: mutedColor, fontSize: 11),
                                ),
                            ],
                          ),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () async {
                            final wsId = await membersController.acceptInvite(inv.token);
                            if (wsId != null) await boardController.switchWorkspace(wsId);
                            await boardController.loadWorkspaces();
                          },
                          child: const Text('Accept', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600)),
                        ),
                        const SizedBox(width: 4),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, size: 16, color: AppColors.danger),
                          onPressed: () => membersController.declineMyInvite(inv.id),
                          constraints: const BoxConstraints(),
                          padding: const EdgeInsets.all(4),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 14),
              ],

              // Your Workspaces Section
              _sectionHeader('YOUR WORKSPACES', count: board.workspaces.length),
              const SizedBox(height: 8),

              if (board.workspaces.isEmpty && board.workspacesLoading)
                const Padding(padding: EdgeInsets.all(20), child: Center(child: CircularProgressIndicator()))
              else
                for (final w in board.workspaces) ...[
                  _buildWorkspaceCard(
                    context: context,
                    workspace: w,
                    isActive: w.id == currentId,
                    cardBg: cardBg,
                    cardBorder: cardBorder,
                    textColor: textColor,
                    mutedColor: mutedColor,
                    ink3Color: ink3Color,
                    isDark: isDark,
                    onSwitch: () async {
                      await boardController.switchWorkspace(w.id);
                      await membersController.load();
                      if (context.mounted) Navigator.pop(context);
                    },
                    onRename: () => _renameDialog(context, boardController, w.id, w.name),
                  ),
                  const SizedBox(height: 6),
                ],

              const SizedBox(height: 6),

              // New Workspace Creator
              if (_creating)
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.accent, width: 1.2),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _newNameCtrl,
                          autofocus: true,
                          style: GoogleFonts.inter(color: textColor, fontSize: 13),
                          decoration: InputDecoration(
                            hintText: 'Enter workspace name...',
                            hintStyle: GoogleFonts.inter(color: ink3Color, fontSize: 13),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                          onSubmitted: (v) async {
                            final val = v.trim();
                            if (val.isEmpty) return;
                            await boardController.createWorkspace(val);
                            await boardController.loadWorkspaces();
                            _newNameCtrl.clear();
                            setState(() => _creating = false);
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: () async {
                          final v = _newNameCtrl.text.trim();
                          if (v.isEmpty) return;
                          await boardController.createWorkspace(v);
                          await boardController.loadWorkspaces();
                          _newNameCtrl.clear();
                          setState(() => _creating = false);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: AppColors.accent,
                            borderRadius: BorderRadius.circular(7),
                          ),
                          child: Text('Create', style: GoogleFonts.inter(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w600)),
                        ),
                      ),
                      const SizedBox(width: 4),
                      IconButton(
                        icon: Icon(Icons.close_rounded, size: 16, color: mutedColor),
                        onPressed: () => setState(() => _creating = false),
                        constraints: const BoxConstraints(),
                        padding: const EdgeInsets.all(4),
                      ),
                    ],
                  ),
                )
              else
                InkWell(
                  onTap: () => setState(() => _creating = true),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E212E) : const Color(0xFFF3F4F8),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: cardBorder),
                    ),
                    alignment: Alignment.center,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(AppIcons.quickAdd, size: 15, color: AppColors.accent),
                        const SizedBox(width: 5),
                        Text(
                          'New workspace',
                          style: GoogleFonts.inter(
                            color: AppColors.accent,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              const SizedBox(height: 18),

              // Collaborators Section
              _sectionHeader('COLLABORATORS & INVITES', count: members.members.length),
              const SizedBox(height: 8),

              // Redesigned Clean Single-Outline Invite Email Field with Inline Action Pill
              TextField(
                controller: _inviteCtrl,
                keyboardType: TextInputType.emailAddress,
                style: GoogleFonts.inter(color: textColor, fontSize: 13.5),
                decoration: InputDecoration(
                  hintText: 'Invite collaborator by email...',
                  hintStyle: GoogleFonts.inter(color: ink3Color, fontSize: 13),
                  prefixIcon: Icon(Icons.mail_outline_rounded, size: 19, color: ink3Color),
                  suffixIcon: Padding(
                    padding: const EdgeInsets.only(right: 6, top: 4, bottom: 4),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accent,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        minimumSize: const Size(0, 34),
                      ),
                      onPressed: _inviting ? null : () => _sendInvite(membersController),
                      child: _inviting
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text('Invite', style: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w700)),
                                const SizedBox(width: 4),
                                const Icon(Icons.arrow_forward_rounded, size: 13),
                              ],
                            ),
                    ),
                  ),
                  filled: true,
                  fillColor: inputBg,
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: cardBorder),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: cardBorder),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.accent, width: 1.5),
                  ),
                ),
                onSubmitted: (_) => _sendInvite(membersController),
              ),
              const SizedBox(height: 10),

              // Members List
              if (members.members.isEmpty && members.loading)
                const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator()))
              else ...[
                for (final m in members.members) ...[
                  _buildMemberCard(
                    context: context,
                    email: m.email ?? m.userId,
                    role: m.role,
                    isOwner: m.role == 'owner',
                    cardBg: cardBg,
                    cardBorder: cardBorder,
                    textColor: textColor,
                    mutedColor: mutedColor,
                    isDark: isDark,
                    onRemove: m.role != 'owner' ? () => _confirmRemoveMember(context, membersController, m.userId, m.email ?? m.userId) : null,
                  ),
                  const SizedBox(height: 6),
                ],
              ],

              const SizedBox(height: 18),

              // Sign Out Button
              SizedBox(
                height: 42,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.danger,
                    side: BorderSide(color: const Color(0xFFEF4444).withValues(alpha: 0.35)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () async {
                    Navigator.pop(context);
                    await ref.read(authProvider.notifier).signOut();
                  },
                  icon: const Icon(AppIcons.signOut, size: 16, color: AppColors.danger),
                  label: Text('Sign out', style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ],
    );

    if (widget.isFullScreen) {
      return Scaffold(
        backgroundColor: isDark ? const Color(0xFF0F1016) : const Color(0xFFF9FAFC),
        body: SafeArea(child: content),
      );
    }

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440, maxHeight: 650),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
            child: Container(
              decoration: BoxDecoration(
                color: dialogBg,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: cardBorder),
                boxShadow: [
                  BoxShadow(
                    color: isDark ? Colors.black.withValues(alpha: 0.45) : Colors.black.withValues(alpha: 0.08),
                    blurRadius: 28,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: content,
            ),
          ),
        ),
      ),
    );
  }

  Widget _sectionHeader(String title, {int? count, bool isAlert = false}) {
    return Row(
      children: [
        Text(
          title,
          style: GoogleFonts.inter(
            color: isAlert ? const Color(0xFFA855F7) : const Color(0xFF8B92A7),
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.4,
          ),
        ),
        if (count != null) ...[
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
            decoration: BoxDecoration(
              color: isAlert
                  ? const Color(0xFFA855F7).withValues(alpha: 0.2)
                  : const Color(0xFF26293A),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              '$count',
              style: GoogleFonts.inter(
                color: isAlert ? const Color(0xFFA855F7) : const Color(0xFF949BAE),
                fontSize: 10.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildWorkspaceCard({
    required BuildContext context,
    required Workspace workspace,
    required bool isActive,
    required Color cardBg,
    required Color cardBorder,
    required Color textColor,
    required Color mutedColor,
    required Color ink3Color,
    required bool isDark,
    required VoidCallback onSwitch,
    required VoidCallback onRename,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isActive
            ? (isDark ? const Color(0xFF232038) : const Color(0xFFFAF5FF))
            : cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isActive
              ? const Color(0xFF8B5CF6).withValues(alpha: 0.5)
              : cardBorder,
          width: isActive ? 1.4 : 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onSwitch,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: (isActive ? AppColors.accent : (isDark ? const Color(0xFF2A2D3E) : const Color(0xFFE5E7EB))).withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    AppIcons.workspace,
                    size: 16,
                    color: isActive ? AppColors.accent : mutedColor,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            workspace.name,
                            style: GoogleFonts.inter(
                              color: textColor,
                              fontSize: 13.5,
                              fontWeight: isActive ? FontWeight.w700 : FontWeight.w600,
                            ),
                          ),
                          if (isActive) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFF8B5CF6).withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'ACTIVE',
                                style: GoogleFonts.inter(
                                  color: const Color(0xFF8B5CF6),
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      Text(
                        workspace.role.toUpperCase(),
                        style: GoogleFonts.inter(color: mutedColor, fontSize: 10.5),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(AppIcons.edit, size: 15, color: ink3Color),
                  tooltip: 'Rename',
                  onPressed: onRename,
                  constraints: const BoxConstraints(),
                  padding: const EdgeInsets.all(6),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMemberCard({
    required BuildContext context,
    required String email,
    required String role,
    required bool isOwner,
    required Color cardBg,
    required Color cardBorder,
    required Color textColor,
    required Color mutedColor,
    required bool isDark,
    VoidCallback? onRemove,
  }) {
    final initials = _computeInitials(email);
    final avatarColor = _avatarColor(email);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardBorder),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 14,
            backgroundColor: avatarColor.withValues(alpha: 0.2),
            child: Text(
              initials,
              style: GoogleFonts.inter(
                color: avatarColor,
                fontSize: 10.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  email,
                  style: GoogleFonts.inter(color: textColor, fontSize: 13, fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  role,
                  style: GoogleFonts.inter(color: mutedColor, fontSize: 10.5),
                ),
              ],
            ),
          ),
          if (onRemove != null)
            IconButton(
              icon: const Icon(Icons.person_remove_outlined, size: 16, color: AppColors.danger),
              tooltip: 'Remove collaborator',
              onPressed: onRemove,
              constraints: const BoxConstraints(),
              padding: const EdgeInsets.all(4),
            ),
        ],
      ),
    );
  }

  void _renameDialog(BuildContext context, BoardController controller, int id, String current) {
    final ctrl = TextEditingController(text: current);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Rename Workspace', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700)),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Workspace name'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              final v = ctrl.text.trim();
              if (v.isNotEmpty) {
                controller.renameWorkspace(id, v);
                Navigator.pop(ctx);
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _confirmRemoveMember(BuildContext context, WorkspaceMembersController controller, String userId, String email) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Remove Collaborator', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700)),
        content: Text('Remove $email from this workspace?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () {
              controller.removeMember(userId);
              Navigator.pop(ctx);
            },
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }
}
