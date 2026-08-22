import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/app_theme.dart';
import '../state/auth_provider.dart';
import '../state/board_provider.dart';
import '../state/workspace_members_provider.dart';

/// Combines apps/mobile's WorkspaceSheet.tsx (switch/rename/create workspaces, sign out) with
/// the web-only collaborator management (invite/list/remove members, revoke invites, accept/
/// decline invites addressed to you) since apps/backend already exposes all of it and the
/// full feature checklist asks for it.
class WorkspaceScreen extends ConsumerStatefulWidget {
  const WorkspaceScreen({super.key});

  @override
  ConsumerState<WorkspaceScreen> createState() => _WorkspaceScreenState();
}

class _WorkspaceScreenState extends ConsumerState<WorkspaceScreen> {
  final _newNameCtrl = TextEditingController();
  final _inviteCtrl = TextEditingController();
  bool _creating = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
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

  @override
  Widget build(BuildContext context) {
    final board = ref.watch(boardProvider);
    final boardController = ref.read(boardProvider.notifier);
    final members = ref.watch(workspaceMembersProvider);
    final membersController = ref.read(workspaceMembersProvider.notifier);
    final currentId = board.data?.workspaceId;

    return Scaffold(
      appBar: AppBar(title: const Text('Workspaces')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (members.myPendingInvites.isNotEmpty) ...[
            const Text('PENDING INVITES', style: TextStyle(color: AppColors.muted, fontSize: 11, letterSpacing: 0.6)),
            const SizedBox(height: 8),
            for (final inv in members.myPendingInvites)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AppColors.panel2, borderRadius: BorderRadius.circular(12)),
                child: Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(inv.workspaceName, style: const TextStyle(color: AppColors.ink, fontWeight: FontWeight.w600)),
                      if (inv.invitedByEmail != null) Text('from ${inv.invitedByEmail}', style: const TextStyle(color: AppColors.ink3, fontSize: 12)),
                    ]),
                  ),
                  TextButton(
                    onPressed: () async {
                      final wsId = await membersController.acceptInvite(inv.token);
                      if (wsId != null) await boardController.switchWorkspace(wsId);
                      await boardController.loadWorkspaces();
                    },
                    child: const Text('Accept'),
                  ),
                  TextButton(onPressed: () => membersController.declineMyInvite(inv.id), child: const Text('Decline', style: TextStyle(color: AppColors.ink3))),
                ]),
              ),
            const SizedBox(height: 12),
          ],
          const Text('YOUR WORKSPACES', style: TextStyle(color: AppColors.muted, fontSize: 11, letterSpacing: 0.6)),
          const SizedBox(height: 8),
          if (board.workspacesLoading) const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())),
          for (final w in board.workspaces)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(w.role == 'owner' ? Icons.apartment : Icons.groups_outlined, color: AppColors.ink),
              title: Text(w.name, style: const TextStyle(color: AppColors.ink)),
              subtitle: Text(w.role, style: const TextStyle(color: AppColors.ink3, fontSize: 12)),
              trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                if (w.id == currentId) const Icon(Icons.check, color: AppColors.accent),
                if (w.role == 'owner')
                  IconButton(icon: const Icon(Icons.edit, size: 17), onPressed: () => _renameDialog(context, boardController, w.id, w.name)),
              ]),
              onTap: () => boardController.switchWorkspace(w.id),
            ),
          const SizedBox(height: 8),
          if (_creating)
            Row(children: [
              Expanded(child: TextField(controller: _newNameCtrl, autofocus: true, decoration: const InputDecoration(labelText: 'Workspace name'))),
              IconButton(
                icon: const Icon(Icons.check),
                onPressed: () {
                  final v = _newNameCtrl.text.trim();
                  if (v.isEmpty) return;
                  boardController.createWorkspace(v);
                  _newNameCtrl.clear();
                  setState(() => _creating = false);
                },
              ),
            ])
          else
            OutlinedButton.icon(onPressed: () => setState(() => _creating = true), icon: const Icon(Icons.add), label: const Text('New workspace')),

          const Divider(height: 32, color: AppColors.lineStrong),
          const Text('COLLABORATORS', style: TextStyle(color: AppColors.muted, fontSize: 11, letterSpacing: 0.6)),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: TextField(controller: _inviteCtrl, decoration: const InputDecoration(labelText: 'Invite by email'), keyboardType: TextInputType.emailAddress)),
            IconButton(
              icon: const Icon(Icons.send, color: AppColors.accent),
              onPressed: () async {
                final v = _inviteCtrl.text.trim();
                if (v.isEmpty) return;
                final ok = await membersController.invite(v);
                if (ok) _inviteCtrl.clear();
              },
            ),
          ]),
          if (members.loading) const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Center(child: CircularProgressIndicator())),
          for (final m in members.members)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.person_outline, color: AppColors.ink),
              title: Text(m.email ?? m.userId, style: const TextStyle(color: AppColors.ink)),
              subtitle: Text(m.role, style: const TextStyle(color: AppColors.ink3, fontSize: 12)),
              trailing: m.role != 'owner'
                  ? IconButton(icon: const Icon(Icons.person_remove_outlined, size: 18, color: AppColors.danger), onPressed: () => membersController.removeMember(m.userId))
                  : null,
            ),
          for (final inv in members.invites)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.hourglass_empty, color: AppColors.ink3),
              title: Text(inv.email, style: const TextStyle(color: AppColors.ink)),
              subtitle: Text('Invite ${inv.status}', style: const TextStyle(color: AppColors.ink3, fontSize: 12)),
              trailing: IconButton(icon: const Icon(Icons.close, size: 18, color: AppColors.danger), onPressed: () => membersController.revokeInvite(inv.id)),
            ),

          const Divider(height: 32, color: AppColors.lineStrong),
          TextButton.icon(
            onPressed: () => ref.read(authProvider.notifier).signOut(),
            icon: const Icon(Icons.logout, color: AppColors.danger),
            label: const Text('Sign out', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
  }

  void _renameDialog(BuildContext context, BoardController controller, int id, String currentName) {
    final ctrl = TextEditingController(text: currentName);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.panel,
        title: const Text('Rename workspace'),
        content: TextField(controller: ctrl, autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              final v = ctrl.text.trim();
              if (v.isNotEmpty) controller.renameWorkspace(id, v);
              Navigator.pop(ctx);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}
