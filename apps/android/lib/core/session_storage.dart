import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Mirrors apps/mobile/src/api.ts's Session + loadSession/saveSession/clearSession/
/// setActiveWorkspace, backed by flutter_secure_storage (Android Keystore / iOS Keychain)
/// instead of expo-secure-store.
class Session {
  final String accessToken;
  final String? refreshToken;
  final int? workspaceId;
  final String? userId;
  final String? email;
  final String? name;

  const Session({
    required this.accessToken,
    this.refreshToken,
    this.workspaceId,
    this.userId,
    this.email,
    this.name,
  });

  Session copyWith({
    String? accessToken,
    String? refreshToken,
    int? workspaceId,
    String? userId,
    String? email,
    String? name,
  }) => Session(
    accessToken: accessToken ?? this.accessToken,
    refreshToken: refreshToken ?? this.refreshToken,
    workspaceId: workspaceId ?? this.workspaceId,
    userId: userId ?? this.userId,
    email: email ?? this.email,
    name: name ?? this.name,
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
  static const _emailKey = 'ss_user_email';
  static const _nameKey = 'ss_user_name';

  Session? _cached;
  Session? get current => _cached;

  Future<Session?> load() async {
    final accessToken = await _storage.read(key: _tokenKey);
    if (accessToken == null) return null;
    final refreshToken = await _storage.read(key: _refreshKey);
    final ws = await _storage.read(key: _workspaceKey);
    final userId = await _storage.read(key: _userKey);
    var email = await _storage.read(key: _emailKey);
    final name = await _storage.read(key: _nameKey);

    if (email == null || email.isEmpty) {
      email = extractEmailFromJwt(accessToken);
      if (email != null && email.isNotEmpty) {
        await _storage.write(key: _emailKey, value: email);
      }
    }

    _cached = Session(
      accessToken: accessToken,
      refreshToken: refreshToken,
      workspaceId: ws != null ? int.tryParse(ws) : null,
      userId: userId,
      email: email,
      name: name,
    );
    return _cached;
  }

  static String? extractEmailFromJwt(String token) {
    try {
      final parts = token.split('.');
      if (parts.length < 2) return null;
      var normalized = parts[1].replaceAll('-', '+').replaceAll('_', '/');
      while (normalized.length % 4 != 0) {
        normalized += '=';
      }
      final decodedBytes = base64.decode(normalized);
      final jsonStr = utf8.decode(decodedBytes);
      final map = jsonDecode(jsonStr) as Map<String, dynamic>;
      final email = map['email'] as String?;
      if (email != null && email.isNotEmpty) return email;
      final userMeta = map['user_metadata'] as Map<String, dynamic>?;
      return userMeta?['email'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<void> save(Session session) async {
    _cached = session;
    await _storage.write(key: _tokenKey, value: session.accessToken);
    if (session.refreshToken != null) {
      await _storage.write(key: _refreshKey, value: session.refreshToken);
    }
    if (session.workspaceId != null) {
      await _storage.write(
        key: _workspaceKey,
        value: session.workspaceId.toString(),
      );
    }
    if (session.userId != null) {
      await _storage.write(key: _userKey, value: session.userId);
    }
    if (session.email != null) {
      await _storage.write(key: _emailKey, value: session.email);
    }
    if (session.name != null) {
      await _storage.write(key: _nameKey, value: session.name);
    }
  }

  Future<void> setActiveWorkspace(int workspaceId) async {
    if (_cached == null) return;
    await save(_cached!.copyWith(workspaceId: workspaceId));
  }

  static const _apiUrlKey = 'ss_custom_api_url';

  Future<String?> getCustomApiUrl() async {
    return await _storage.read(key: _apiUrlKey);
  }

  Future<void> setCustomApiUrl(String? url) async {
    if (url == null || url.trim().isEmpty) {
      await _storage.delete(key: _apiUrlKey);
    } else {
      await _storage.write(key: _apiUrlKey, value: url.trim());
    }
  }

  Future<void> clear() async {
    _cached = null;
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _workspaceKey);
    await _storage.delete(key: _userKey);
    await _storage.delete(key: _emailKey);
    await _storage.delete(key: _nameKey);
  }
}
