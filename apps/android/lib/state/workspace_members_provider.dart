import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../models/models.dart';

/// Collaborator/invite management for the active workspace — separate from BoardController
/// since it's only ever needed on the dedicated "Workspace" screen, not the main board load.
/// Mirrors apps/web/src/lib/workspace-actions.ts (listCollaborators/inviteCollaborator/etc.)
/// and apps/backend's WorkspaceController.
class WorkspaceMembersState {
  final List<MemberRow> members;
  final List<InviteRow> invites;
  final List<PendingInviteForUser> myPendingInvites;
  final bool loading;
  final String? error;

  const WorkspaceMembersState({
    this.members = const [],
    this.invites = const [],
    this.myPendingInvites = const [],
    this.loading = false,
    this.error,
  });

  WorkspaceMembersState copyWith({
    List<MemberRow>? members,
    List<InviteRow>? invites,
    List<PendingInviteForUser>? myPendingInvites,
    bool? loading,
    String? error,
    bool clearError = false,
  }) =>
      WorkspaceMembersState(
        members: members ?? this.members,
        invites: invites ?? this.invites,
        myPendingInvites: myPendingInvites ?? this.myPendingInvites,
        loading: loading ?? this.loading,
        error: clearError ? null : (error ?? this.error),
      );
}

class WorkspaceMembersController extends StateNotifier<WorkspaceMembersState> {
  WorkspaceMembersController() : super(const WorkspaceMembersState());

  final _api = ApiClient.instance;

  Future<void> load() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final res = await _api.listMembers();
      final members = ((res['members'] as List?) ?? []).map((m) => MemberRow.fromJson(m as Map<String, dynamic>)).toList();
      final invites = ((res['invites'] as List?) ?? []).map((i) => InviteRow.fromJson(i as Map<String, dynamic>)).toList();
      state = state.copyWith(members: members, invites: invites);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    } finally {
      state = state.copyWith(loading: false);
    }
  }

  Future<void> loadMyPendingInvites() async {
    try {
      final invites = await _api.myInvites();
      state = state.copyWith(myPendingInvites: invites);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<bool> invite(String email) async {
    try {
      await _api.inviteMember(email.trim());
      await load();
      return true;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }

  Future<void> revokeInvite(int id) async {
    try {
      await _api.revokeInvite(id);
      await load();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> removeMember(String userId) async {
    try {
      await _api.removeMember(userId);
      await load();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<int?> acceptInvite(String token) async {
    try {
      final res = await _api.acceptInvite(token);
      return res['workspaceId'] as int?;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }

  Future<void> declineMyInvite(int id) async {
    try {
      await _api.declineMyInvite(id);
      await loadMyPendingInvites();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}

final workspaceMembersProvider = StateNotifierProvider<WorkspaceMembersController, WorkspaceMembersState>(
  (ref) => WorkspaceMembersController(),
);
