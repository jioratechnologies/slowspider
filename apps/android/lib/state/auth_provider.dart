import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../core/session_storage.dart';

enum AuthStatus { restoring, signedOut, signedIn }

class AuthState {
  final AuthStatus status;
  final Session? session;
  final String? error;

  const AuthState({required this.status, this.session, this.error});

  const AuthState.restoring() : this(status: AuthStatus.restoring);
  const AuthState.signedOut({String? error}) : this(status: AuthStatus.signedOut, error: error);
  const AuthState.signedIn(Session session) : this(status: AuthStatus.signedIn, session: session);
}

/// Auth/session lifecycle: restore-on-launch, login, signup (OTP), password reset (OTP),
/// sign-out. Mirrors apps/mobile's App.tsx session bootstrap + SignInScreen +
/// apps/backend's AuthController (dev mode's OTP is the fixed "123456").
class AuthController extends StateNotifier<AuthState> {
  AuthController() : super(const AuthState.restoring()) {
    _restore();
  }

  final _api = ApiClient.instance;
  final _storage = SessionStorage.instance;

  Future<void> _restore() async {
    final session = await _storage.load();
    state = session != null ? AuthState.signedIn(session) : const AuthState.signedOut();
  }

  Future<bool> login(String email, String password) async {
    try {
      final res = await _api.login(email.trim(), password);
      final session = Session(
        accessToken: res['token'] as String,
        refreshToken: res['refreshToken'] as String?,
        workspaceId: null,
        userId: (res['user'] as Map<String, dynamic>)['id'] as String,
      );
      await _storage.save(session);
      state = AuthState.signedIn(session);
      return true;
    } catch (e) {
      state = AuthState.signedOut(error: e.toString());
      return false;
    }
  }

  Future<void> requestSignupOtp(String email) => _api.signupOtp(email.trim());

  Future<void> verifySignupOtp(String email, String code) => _api.signupVerify(email.trim(), code.trim());

  Future<bool> completeSignup(String email, String password) async {
    try {
      final res = await _api.signupComplete(email.trim(), password);
      final session = Session(
        accessToken: res['token'] as String,
        refreshToken: res['refreshToken'] as String?,
        workspaceId: null,
        userId: (res['user'] as Map<String, dynamic>)['id'] as String,
      );
      await _storage.save(session);
      state = AuthState.signedIn(session);
      return true;
    } catch (e) {
      state = AuthState.signedOut(error: e.toString());
      return false;
    }
  }

  Future<void> requestResetOtp(String email) => _api.resetOtp(email.trim());

  Future<void> verifyResetOtp(String email, String code) => _api.resetVerify(email.trim(), code.trim());

  Future<bool> completeReset(String email, String password) async {
    try {
      final res = await _api.resetComplete(email.trim(), password);
      final session = Session(
        accessToken: res['token'] as String,
        refreshToken: res['refreshToken'] as String?,
        workspaceId: null,
        userId: (res['user'] as Map<String, dynamic>)['id'] as String,
      );
      await _storage.save(session);
      state = AuthState.signedIn(session);
      return true;
    } catch (e) {
      state = AuthState.signedOut(error: e.toString());
      return false;
    }
  }

  Future<void> signOut() async {
    await _storage.clear();
    state = const AuthState.signedOut();
  }
}

final authProvider = StateNotifierProvider<AuthController, AuthState>((ref) => AuthController());
