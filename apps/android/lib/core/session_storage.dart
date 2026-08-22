import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Mirrors apps/mobile/src/api.ts's Session + loadSession/saveSession/clearSession/
/// setActiveWorkspace, backed by flutter_secure_storage (Android Keystore / iOS Keychain)
/// instead of expo-secure-store.
class Session {
  final String accessToken;
  final String? refreshToken;
  final int? workspaceId;
  final String? userId;

  const Session({required this.accessToken, this.refreshToken, this.workspaceId, this.userId});

  Session copyWith({String? accessToken, String? refreshToken, int? workspaceId, String? userId}) => Session(
        accessToken: accessToken ?? this.accessToken,
        refreshToken: refreshToken ?? this.refreshToken,
        workspaceId: workspaceId ?? this.workspaceId,
        userId: userId ?? this.userId,
      );
}

class SessionStorage {
  SessionStorage._();
  static final SessionStorage instance = SessionStorage._();

  final _storage = const FlutterSecureStorage();

  static const _tokenKey = 'ss_access_token';
  static const _refreshKey = 'ss_refresh_token';
  static const _workspaceKey = 'ss_workspace_id';
  static const _userKey = 'ss_user_id';

  Session? _cached;
  Session? get current => _cached;

  Future<Session?> load() async {
    final accessToken = await _storage.read(key: _tokenKey);
    if (accessToken == null) return null;
    final refreshToken = await _storage.read(key: _refreshKey);
    final ws = await _storage.read(key: _workspaceKey);
    final userId = await _storage.read(key: _userKey);
    _cached = Session(
      accessToken: accessToken,
      refreshToken: refreshToken,
      workspaceId: ws != null ? int.tryParse(ws) : null,
      userId: userId,
    );
    return _cached;
  }

  Future<void> save(Session session) async {
    _cached = session;
    await _storage.write(key: _tokenKey, value: session.accessToken);
    if (session.refreshToken != null) await _storage.write(key: _refreshKey, value: session.refreshToken);
    if (session.workspaceId != null) await _storage.write(key: _workspaceKey, value: session.workspaceId.toString());
    if (session.userId != null) await _storage.write(key: _userKey, value: session.userId);
  }

  Future<void> setActiveWorkspace(int workspaceId) async {
    if (_cached == null) return;
    _cached = _cached!.copyWith(workspaceId: workspaceId);
    await _storage.write(key: _workspaceKey, value: workspaceId.toString());
  }

  Future<void> clear() async {
    _cached = null;
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _workspaceKey);
    await _storage.delete(key: _userKey);
  }
}
