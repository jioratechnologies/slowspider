import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/app_theme.dart';
import '../state/auth_provider.dart';

enum _Step { email, otp, password }

/// Password reset via email OTP (POST /v1/auth/reset/{otp,verify,complete}). Same shape as
/// signup's OTP flow — see sign_up_screen.dart.
class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  ConsumerState<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  _Step _step = _Step.email;
  final _email = TextEditingController();
  final _code = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  Future<void> _requestOtp() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authProvider.notifier).requestResetOtp(_email.text.trim());
      setState(() => _step = _Step.otp);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verifyOtp() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authProvider.notifier).verifyResetOtp(_email.text.trim(), _code.text.trim());
      setState(() => _step = _Step.password);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _completeReset() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final ok = await ref.read(authProvider.notifier).completeReset(_email.text.trim(), _password.text);
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) {
      context.go('/');
    } else {
      setState(() => _error = ref.read(authProvider).error ?? 'Reset failed.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_step == _Step.email) ...[
                const Text('Enter your account email', style: TextStyle(color: AppColors.ink, fontSize: 16)),
                const SizedBox(height: 12),
                TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
                const SizedBox(height: 16),
                ElevatedButton(onPressed: _busy ? null : _requestOtp, child: _busy ? const _Spinner() : const Text('Send code')),
              ] else if (_step == _Step.otp) ...[
                Text('Enter the code sent to ${_email.text}', style: const TextStyle(color: AppColors.ink, fontSize: 16)),
                const SizedBox(height: 6),
                const Text('Dev mode: the code is 123456 (no email is actually sent).', style: TextStyle(color: AppColors.muted, fontSize: 12)),
                const SizedBox(height: 12),
                TextField(controller: _code, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Verification code')),
                const SizedBox(height: 16),
                ElevatedButton(onPressed: _busy ? null : _verifyOtp, child: _busy ? const _Spinner() : const Text('Verify')),
              ] else ...[
                const Text('Choose a new password', style: TextStyle(color: AppColors.ink, fontSize: 16)),
                const SizedBox(height: 12),
                TextField(controller: _password, obscureText: true, onSubmitted: (_) => _completeReset(), decoration: const InputDecoration(labelText: 'New password')),
                const SizedBox(height: 16),
                ElevatedButton(onPressed: _busy ? null : _completeReset, child: _busy ? const _Spinner() : const Text('Reset password')),
              ],
              if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: const TextStyle(color: AppColors.danger))),
            ],
          ),
        ),
      ),
    );
  }
}

class _Spinner extends StatelessWidget {
  const _Spinner();
  @override
  Widget build(BuildContext context) => const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accentInk));
}
