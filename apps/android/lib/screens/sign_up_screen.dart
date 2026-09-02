import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../design/typography.dart';
import '../core/app_theme.dart';
import '../design/tokens.dart';
import '../state/auth_provider.dart';
import '../design/icons.dart';

enum _Step { email, otp, password }

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
    final email = _email.text.trim();
    if (email.isEmpty) {
      setState(() => _error = 'Please enter an email.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authProvider.notifier).requestSignupOtp(email);
      setState(() => _step = _Step.otp);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verifyOtp() async {
    final code = _code.text.trim();
    if (code.isEmpty) {
      setState(() => _error = 'Please enter the verification code.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(authProvider.notifier)
          .verifySignupOtp(_email.text.trim(), code);
      setState(() => _step = _Step.password);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _completeSignup() async {
    final pwd = _password.text;
    if (pwd.length < 6) {
      setState(() => _error = 'Password must be at least 6 characters.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final ok = await ref
        .read(authProvider.notifier)
        .completeSignup(_email.text.trim(), pwd);
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) {
      context.go('/');
    } else {
      setState(() => _error = ref.read(authProvider).error ?? 'Signup failed.');
    }
  }

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final topBarBg = isDark ? AppColors.bg : AppColors.lightBg;
    final topBarBorder = isDark ? AppColors.line : AppColors.lightLine;
    final cardBg = isDark ? AppColors.panel : Colors.white;
    final cardBorder = isDark ? AppColors.panel3 : AppColors.lightLine;
    final inputBg = isDark ? AppColors.panel2 : AppColors.lightPanel2;
    final inputBorder = isDark ? AppColors.line : AppColors.lightLine;
    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? AppColors.muted : AppColors.lightMuted;
    final ink3Color = isDark ? AppColors.ink3 : AppColors.lightInk3;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bg : AppColors.lightBg,
      appBar: AppBar(
        toolbarHeight: 56,
        backgroundColor: topBarBg,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: AppIcon(SpiderIcons.back, color: textColor, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Create Account',
          style: AppType.sans(
            color: textColor,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: topBarBorder),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: cardBorder),
                boxShadow: [
                  BoxShadow(
                    color: isDark
                        ? Colors.black.withValues(alpha: 0.35)
                        : Colors.black.withValues(alpha: 0.04),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_step == _Step.email) ...[
                    Text(
                      'Get started',
                      style: AppType.sans(
                        color: textColor,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Enter your email to receive a verification code.',
                      style: AppType.sans(color: mutedColor, fontSize: 13),
                    ),
                    const SizedBox(height: 18),
                    _buildInput(
                      controller: _email,
                      hint: 'you@example.com',
                      icon: SpiderIcons.mail,
                      inputBg: inputBg,
                      inputBorder: inputBorder,
                      textColor: textColor,
                      ink3Color: ink3Color,
                    ),
                    const SizedBox(height: 18),
                    _buildButton(context,
                      label: 'Send Verification Code',
                      onPressed: _requestOtp,
                      busy: _busy,
                    ),
                  ] else if (_step == _Step.otp) ...[
                    Text(
                      'Enter Verification Code',
                      style: AppType.sans(
                        color: textColor,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Code sent to ${_email.text}. (Dev code: 123456)',
                      style: AppType.sans(color: mutedColor, fontSize: 13),
                    ),
                    const SizedBox(height: 18),
                    _buildInput(
                      controller: _code,
                      hint: '123456',
                      icon: SpiderIcons.pin,
                      inputBg: inputBg,
                      inputBorder: inputBorder,
                      textColor: textColor,
                      ink3Color: ink3Color,
                      isNumber: true,
                    ),
                    const SizedBox(height: 18),
                    _buildButton(context,
                      label: 'Verify Code',
                      onPressed: _verifyOtp,
                      busy: _busy,
                    ),
                  ] else ...[
                    Text(
                      'Set your password',
                      style: AppType.sans(
                        color: textColor,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Choose a secure password (min 6 chars).',
                      style: AppType.sans(color: mutedColor, fontSize: 13),
                    ),
                    const SizedBox(height: 18),
                    _buildInput(
                      controller: _password,
                      hint: '••••••••',
                      icon: SpiderIcons.lock,
                      inputBg: inputBg,
                      inputBorder: inputBorder,
                      textColor: textColor,
                      ink3Color: ink3Color,
                      isPassword: true,
                      onSubmitted: _completeSignup,
                    ),
                    const SizedBox(height: 18),
                    _buildButton(context,
                      label: 'Complete Signup',
                      onPressed: _completeSignup,
                      busy: _busy,
                    ),
                  ],

                  if (_error != null) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 9,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.danger.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: AppColors.danger.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Text(
                        _error!,
                        style: AppType.sans(
                          color: AppColors.danger,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
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

  Widget _buildInput({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    required Color inputBg,
    required Color inputBorder,
    required Color textColor,
    required Color ink3Color,
    bool isNumber = false,
    bool isPassword = false,
    VoidCallback? onSubmitted,
  }) {
    return TextField(
      controller: controller,
      keyboardType: isNumber ? TextInputType.number : TextInputType.text,
      obscureText: isPassword,
      onSubmitted: onSubmitted != null ? (_) => onSubmitted() : null,
      style: AppType.sans(fontSize: 14, color: textColor),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: AppType.sans(fontSize: 13.5, color: ink3Color),
        prefixIcon: AppIcon(icon, size: 19, color: ink3Color),
        filled: true,
        fillColor: inputBg,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 12,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: inputBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: inputBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.accent, width: 1.5),
        ),
      ),
    );
  }

  Widget _buildButton(BuildContext context, {
    required String label,
    required VoidCallback onPressed,
    required bool busy,
  }) {
    final p = context.ink;
    return SizedBox(
      height: 46,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: p.ink,
          foregroundColor: p.onInk,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        onPressed: busy ? null : onPressed,
        child: busy
            ? SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: p.onInk,
                ),
              )
            : Text(
                label,
                style: AppType.sans(
                  color: p.onInk,
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
      ),
    );
  }
}
