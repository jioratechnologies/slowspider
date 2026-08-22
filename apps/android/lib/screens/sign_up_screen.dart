import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/app_theme.dart';
import '../state/auth_provider.dart';

enum _Step { email, otp, password }

/// Email + OTP signup flow, per apps/backend's AuthController (POST /v1/auth/signup/{otp,
/// verify,complete}). Dev mode's OTP is a fixed "123456" (AUTH_MODE=dev, no email sent) —
/// shown as a hint here since apps/mobile never built a signup UI to reference.
class SignUpScreen extends ConsumerStatefulWidget {
  const SignUpScreen({super.key});

  @override
  ConsumerState<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends ConsumerState<SignUpScreen> {
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
      await ref.read(authProvider.notifier).requestSignupOtp(_email.text.trim());
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
      await ref.read(authProvider.notifier).verifySignupOtp(_email.text.trim(), _code.text.trim());
      setState(() => _step = _Step.password);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _completeSignup() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final ok = await ref.read(authProvider.notifier).completeSignup(_email.text.trim(), _password.text);
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) {
      context.go('/');
    } else {
      setState(() => _error = ref.read(authProvider).error ?? 'Signup failed.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_step == _Step.email) ...[
                const Text('What email should we use?', style: TextStyle(color: AppColors.ink, fontSize: 16)),
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
                const Text('Choose a password', style: TextStyle(color: AppColors.ink, fontSize: 16)),
                const SizedBox(height: 12),
                TextField(controller: _password, obscureText: true, onSubmitted: (_) => _completeSignup(), decoration: const InputDecoration(labelText: 'Password')),
                const SizedBox(height: 16),
                ElevatedButton(onPressed: _busy ? null : _completeSignup, child: _busy ? const _Spinner() : const Text('Create account')),
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
