import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../models/models.dart';
import 'session_storage.dart';

/// Thin REST client mirroring apps/mobile/src/api.ts's request() pattern: bearer token +
/// x-workspace-id header, {ok,data}/{ok,error} envelope, same /v1/** paths through Kong.
/// Also covers the auth/workspace/category/cluster-reorder endpoints that exist on
/// apps/backend but weren't yet wired into the RN app's api.ts (see
/// apps/backend/src/{auth,workspace,board}/*.controller.ts for the source of truth).
class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  /// Kong's local dev proxy port by default. Override with --dart-define=API_BASE_URL=...
  static const String base = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:8000');

  Future<T> _request<T>(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? body,
    bool auth = true,
  }) async {
    final headers = <String, String>{'content-type': 'application/json'};
    if (auth) {
      final session = SessionStorage.instance.current;
      if (session == null) throw ApiException('Not signed in.');
      headers['authorization'] = 'Bearer ${session.accessToken}';
      if (session.workspaceId != null) headers['x-workspace-id'] = session.workspaceId.toString();
    }

    final uri = Uri.parse('$base$path');
    http.Response res;
    switch (method) {
      case 'POST':
        res = await http.post(uri, headers: headers, body: body != null ? jsonEncode(body) : null);
        break;
      case 'PATCH':
        res = await http.patch(uri, headers: headers, body: body != null ? jsonEncode(body) : null);
        break;
      case 'DELETE':
        res = await http.delete(uri, headers: headers, body: body != null ? jsonEncode(body) : null);
        break;
      default:
        res = await http.get(uri, headers: headers);
    }

    Map<String, dynamic>? json;
    try {
      json = res.body.isNotEmpty ? jsonDecode(res.body) as Map<String, dynamic> : null;
    } catch (_) {
      json = null;
    }

    if (res.statusCode < 200 || res.statusCode >= 300 || json?['ok'] != true) {
      throw ApiException((json?['error'] as String?) ?? 'Request failed (${res.statusCode}).');
    }
    return json?['data'] as T;
  }

  // ---- Auth (POST /v1/auth/**, all public) ----

  Future<Map<String, dynamic>> login(String email, String password) => _request<Map<String, dynamic>>(
        '/v1/auth/login',
        method: 'POST',
        body: {'email': email, 'password': password},
        auth: false,
      );

  Future<void> signupOtp(String email) => _request<void>('/v1/auth/signup/otp', method: 'POST', body: {'email': email}, auth: false);

  Future<void> signupVerify(String email, String code) =>
      _request<void>('/v1/auth/signup/verify', method: 'POST', body: {'email': email, 'code': code}, auth: false);

  Future<Map<String, dynamic>> signupComplete(String email, String password) => _request<Map<String, dynamic>>(
        '/v1/auth/signup/complete',
        method: 'POST',
        body: {'email': email, 'password': password},
        auth: false,
      );

  Future<void> resetOtp(String email) => _request<void>('/v1/auth/reset/otp', method: 'POST', body: {'email': email}, auth: false);

  Future<void> resetVerify(String email, String code) =>
      _request<void>('/v1/auth/reset/verify', method: 'POST', body: {'email': email, 'code': code}, auth: false);

  Future<Map<String, dynamic>> resetComplete(String email, String password) => _request<Map<String, dynamic>>(
        '/v1/auth/reset/complete',
        method: 'POST',
        body: {'email': email, 'password': password},
        auth: false,
      );

  // ---- Board ----

  Future<BoardPayload> board() async {
    final data = await _request<Map<String, dynamic>>('/v1/board');
    return BoardPayload.fromJson(data);
  }

  Future<void> saveSortMode(SortMode mode) =>
      _request<void>('/v1/settings/sort-mode', method: 'PATCH', body: {'sortMode': mode.name});

  // ---- Tasks ----

  Future<Task> createTask({required String title, required int? clusterId, required int pos}) async {
    final data = await _request<Map<String, dynamic>>(
      '/v1/tasks',
      method: 'POST',
      body: {'title': title, 'cluster_id': clusterId, 'pos': pos},
    );
    return Task.fromJson(data);
  }

  Future<void> updateTask(int id, Map<String, dynamic> patch) => _request<void>('/v1/tasks/$id', method: 'PATCH', body: patch);

  Future<void> deleteTaskForever(int id) => _request<void>('/v1/tasks/$id', method: 'DELETE');

  Future<Milestone> addMilestone(int taskId, String title, int pos) async {
    final data = await _request<Map<String, dynamic>>(
      '/v1/tasks/$taskId/milestones',
      method: 'POST',
      body: {'title': title, 'pos': pos},
    );
    return Milestone.fromJson(data);
  }

  Future<void> updateMilestone(int taskId, int id, Map<String, dynamic> patch) =>
      _request<void>('/v1/tasks/$taskId/milestones/$id', method: 'PATCH', body: patch);

  Future<void> deleteMilestone(int taskId, int id) => _request<void>('/v1/tasks/$taskId/milestones/$id', method: 'DELETE');

  // ---- Clusters ----

  Future<Cluster> createCluster({required String name, required String color, required int? categoryId, required int pos}) async {
    final data = await _request<Map<String, dynamic>>(
      '/v1/clusters',
      method: 'POST',
      body: {'name': name, 'color': color, 'category_id': categoryId, 'pos': pos},
    );
    return Cluster.fromJson(data);
  }

  Future<void> updateCluster(int id, Map<String, dynamic> patch) => _request<void>('/v1/clusters/$id', method: 'PATCH', body: patch);

  Future<void> deleteClusterForever(int id) => _request<void>('/v1/clusters/$id', method: 'DELETE');

  Future<void> reorderClusters(List<Map<String, int>> updates) =>
      _request<void>('/v1/clusters/reorder', method: 'POST', body: {'updates': updates});

  // ---- Categories ----

  Future<Category> createCategory({required String name, required String color, required int pos}) async {
    final data = await _request<Map<String, dynamic>>(
      '/v1/categories',
      method: 'POST',
      body: {'name': name, 'color': color, 'pos': pos},
    );
    return Category.fromJson(data);
  }

  Future<void> updateCategory(int id, Map<String, dynamic> patch) => _request<void>('/v1/categories/$id', method: 'PATCH', body: patch);

  Future<void> deleteCategory(int id) => _request<void>('/v1/categories/$id', method: 'DELETE');

  // ---- Notes ----

  Future<Note> createNote(Map<String, dynamic> input) async {
    final data = await _request<Map<String, dynamic>>('/v1/notes', method: 'POST', body: input);
    return Note.fromJson(data);
  }

  Future<void> updateNote(int id, Map<String, dynamic> patch) => _request<void>('/v1/notes/$id', method: 'PATCH', body: patch);

  Future<void> deleteNote(int id) => _request<void>('/v1/notes/$id', method: 'DELETE');

  Future<Map<String, dynamic>> uploadUrl(String filename, int sizeBytes) => _request<Map<String, dynamic>>(
        '/v1/notes/media',
        method: 'POST',
        body: {'filename': filename, 'sizeBytes': sizeBytes},
      );

  Future<String> mediaUrl(String path) async {
    final data = await _request<Map<String, dynamic>>('/v1/notes/media?path=${Uri.encodeComponent(path)}');
    return data['url'] as String;
  }

  Future<Map<String, dynamic>> quota() => _request<Map<String, dynamic>>('/v1/notes/media');

  Future<Map<String, dynamic>> notePreview(String url) =>
      _request<Map<String, dynamic>>('/v1/notes/preview', method: 'POST', body: {'url': url});

  /// Uploads raw bytes straight to Supabase Storage using a short-lived signed URL from
  /// our own API, same two-step flow as apps/mobile/src/api.ts's uploadMedia().
  Future<String> uploadMedia(Uint8List bytes, String filename, String mime, int sizeBytes) async {
    final res = await uploadUrl(filename, sizeBytes);
    final path = res['path'] as String;
    final signedUrl = res['signedUrl'] as String;
    final put = await http.put(Uri.parse(signedUrl), headers: {'content-type': mime}, body: bytes);
    if (put.statusCode < 200 || put.statusCode >= 300) {
      throw ApiException('Upload failed (${put.statusCode}).');
    }
    return path;
  }

  // ---- Workspaces ----

  Future<List<Workspace>> workspaces() async {
    final data = await _request<Map<String, dynamic>>('/v1/workspace');
    return ((data['workspaces'] as List?) ?? []).map((w) => Workspace.fromJson(w as Map<String, dynamic>)).toList();
  }

  Future<Workspace> createWorkspace(String name) async {
    final data = await _request<Map<String, dynamic>>('/v1/workspace', method: 'POST', body: {'name': name});
    return Workspace.fromJson(data);
  }

  Future<void> renameWorkspace(int id, String name) => _request<void>('/v1/workspace/$id', method: 'PATCH', body: {'name': name});

  Future<Map<String, dynamic>> acceptInvite(String token) =>
      _request<Map<String, dynamic>>('/v1/workspace/accept', method: 'POST', body: {'token': token});

  Future<void> inviteMember(String email) => _request<void>('/v1/workspace/invite', method: 'POST', body: {'email': email});

  Future<void> revokeInvite(int id) => _request<void>('/v1/workspace/invite/$id', method: 'DELETE');

  Future<Map<String, dynamic>> listMembers() => _request<Map<String, dynamic>>('/v1/workspace/members');

  Future<void> removeMember(String userId) => _request<void>('/v1/workspace/members/$userId', method: 'DELETE');

  Future<List<PendingInviteForUser>> myInvites() async {
    final data = await _request<Map<String, dynamic>>('/v1/workspace/my-invites');
    return ((data['invites'] as List?) ?? []).map((i) => PendingInviteForUser.fromJson(i as Map<String, dynamic>)).toList();
  }

  Future<void> declineMyInvite(int id) => _request<void>('/v1/workspace/my-invites/$id/decline', method: 'POST');
}
