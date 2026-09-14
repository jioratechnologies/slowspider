import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../design/typography.dart';

import '../core/api_client.dart';
import '../core/app_theme.dart';
import '../design/tokens.dart';
import '../core/session_storage.dart';
import '../state/auth_provider.dart';
import '../widgets/slow_spider_logo.dart';
import '../design/icons.dart';

class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  late final TextEditingController _apiUrlCtrl;
  bool _showPassword = false;
  bool _busy = false;
  bool _showDevOptions = false;
  bool _testingConnection = false;
  bool? _connectionOk;
  String? _pingMessage;
  String? _error;

  @override
  void initState() {
    super.initState();
    _apiUrlCtrl = TextEditingController(text: ApiClient.base);
    SessionStorage.instance.getCustomApiUrl().then((url) {
      if (url != null && url.isNotEmpty && mounted) {
        _apiUrlCtrl.text = url;
        ApiClient.setCustomBase(url);
      }
    });
  }

  Future<void> _testApiUrl() async {
    final url = _apiUrlCtrl.text.trim();
    if (url.isEmpty) return;
    setState(() {
      _testingConnection = true;
      _pingMessage = null;
    });
    final ok = await ApiClient.testConnection(url);
    if (!mounted) return;
    setState(() {
      _testingConnection = false;
      _connectionOk = ok;
      _pingMessage = ok
          ? 'Server is reachable & online!'
          : 'Connection failed. Check URL.';
    });
  }

  Future<void> _saveApiUrl() async {
    final url = _apiUrlCtrl.text.trim();
    ApiClient.setCustomBase(url);
    await SessionStorage.instance.setCustomApiUrl(url);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('API Base URL updated to: ${ApiClient.base}'),
        backgroundColor: AppColors.muted,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _submit() async {
    final email = _email.text.trim();
    final password = _password.text;
    if (email.isEmpty || password.isEmpty) {
      setState(() => _error = 'Please enter both email and password.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    final ok = await ref.read(authProvider.notifier).login(email, password);
    if (!mounted) return;
    setState(() => _busy = false);
    if (!ok) {
      setState(
        () => _error =
            ref.read(authProvider).error ??
            'Sign in failed. Check credentials.',
      );
    }
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _apiUrlCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final p = context.ink;

    final bg = isDark ? AppColors.bg : AppColors.lightBg;
    final cardBg = isDark ? AppColors.panel : Colors.white;
    final cardBorder = isDark ? AppColors.panel3 : AppColors.lightLine;
    final inputBg = isDark ? AppColors.panel2 : AppColors.lightPanel2;
    final inputBorder = isDark ? AppColors.line : AppColors.lightLine;
    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? AppColors.muted : AppColors.lightMuted;
    final ink3Color = isDark ? AppColors.ink3 : AppColors.lightInk3;

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Logo & App Branding Header
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.panel2
                            : AppColors.lightPanel2,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.ink.withValues(
                              alpha: isDark ? 0.25 : 0.15,
                            ),
                            blurRadius: 20,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: const SlowSpiderLogo(size: 40),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Slow Spider',
                    textAlign: TextAlign.center,
                    style: AppType.sans(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: textColor,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Focus on what matters. Minimalist workflow.',
                    textAlign: TextAlign.center,
                    style: AppType.sans(
                      color: mutedColor,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 28),

                  // 2. Auth Container Card
                  Container(
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
                        // Email Field
                        Text(
                          'Email Address',
                          style: AppType.sans(
                            color: textColor,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          autocorrect: false,
                          style: AppType.sans(fontSize: 14, color: textColor),
                          decoration: InputDecoration(
                            hintText: 'you@example.com',
                            hintStyle: AppType.sans(
                              fontSize: 13.5,
                              color: ink3Color,
                            ),
                            prefixIcon: AppIcon(
                              SpiderIcons.mail,
                              size: 19,
                              color: ink3Color,
                            ),
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
                              borderSide: const BorderSide(
                                color: AppColors.accent,
                                width: 1.5,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Password Field
                        Text(
                          'Password',
                          style: AppType.sans(
                            color: textColor,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _password,
                          obscureText: !_showPassword,
                          onSubmitted: (_) => _submit(),
                          style: AppType.sans(fontSize: 14, color: textColor),
                          decoration: InputDecoration(
                            hintText: '••••••••',
                            hintStyle: AppType.sans(
                              fontSize: 13.5,
                              color: ink3Color,
                            ),
                            prefixIcon: AppIcon(
                              SpiderIcons.lock,
                              size: 19,
                              color: ink3Color,
                            ),
                            suffixIcon: IconButton(
                              icon: AppIcon(
                                _showPassword
                                    ? SpiderIcons.eyeOff
                                    : SpiderIcons.eye,
                                size: 19,
                                color: ink3Color,
                              ),
                              onPressed: () => setState(
                                () => _showPassword = !_showPassword,
                              ),
                            ),
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
                              borderSide: const BorderSide(
                                color: AppColors.accent,
                                width: 1.5,
                              ),
                            ),
                          ),
                        ),

                        // Error Banner (if any)
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
                            child: Row(
                              children: [
                                const AppIcon(
                                  SpiderIcons.error,
                                  size: 16,
                                  color: AppColors.danger,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
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
                            ),
                          ),
                        ],

                        const SizedBox(height: 20),

                        // Sign In Button
                        SizedBox(
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
                            onPressed: _busy ? null : _submit,
                            child: _busy
                                ? SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: p.onInk,
                                    ),
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        'Sign in',
                                        style: AppType.sans(
                                          color: p.onInk,
                                          fontSize: 14.5,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      AppIcon(
                                        SpiderIcons.arrowRight,
                                        size: 16,
                                        color: p.onInk,
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // 3. Navigation Footers (Create account & Forgot password)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      TextButton(
                        onPressed: () => context.push('/sign-up'),
                        child: Text(
                          'Create account',
                          style: AppType.sans(
                            color: AppColors.accent,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      Text('•', style: TextStyle(color: ink3Color)),
                      TextButton(
                        onPressed: () => context.push('/reset-password'),
                        child: Text(
                          'Forgot password?',
                          style: AppType.sans(
                            color: mutedColor,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 18),

                  // 4. Developer Options / Custom API Endpoint Setting
                  Container(
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: cardBorder, width: 0.9),
                    ),
                    child: Column(
                      children: [
                        InkWell(
                          onTap: () => setState(
                            () => _showDevOptions = !_showDevOptions,
                          ),
                          borderRadius: BorderRadius.circular(16),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 10,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(5),
                                      decoration: BoxDecoration(
                                        color: AppColors.gold.withValues(
                                          alpha: 0.14,
                                        ),
                                        borderRadius: BorderRadius.circular(7),
                                      ),
                                      child: const AppIcon(
                                        SpiderIcons.code,
                                        size: 15,
                                        color: AppColors.gold,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Developer Options',
                                      style: AppType.sans(
                                        color: textColor,
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                                AppIcon(
                                  _showDevOptions
                                      ? SpiderIcons.chevronUp
                                      : SpiderIcons.chevronDown,
                                  size: 18,
                                  color: mutedColor,
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (_showDevOptions) ...[
                          Divider(height: 1, color: cardBorder),
                          Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Text(
                                  'API Base URL',
                                  style: AppType.sans(
                                    color: mutedColor,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                TextField(
                                  controller: _apiUrlCtrl,
                                  style: AppType.sans(
                                    fontSize: 13,
                                    color: textColor,
                                  ),
                                  decoration: InputDecoration(
                                    hintText: 'http://localhost:8000',
                                    hintStyle: AppType.sans(
                                      fontSize: 12.5,
                                      color: ink3Color,
                                    ),
                                    prefixIcon: AppIcon(
                                      SpiderIcons.server,
                                      size: 17,
                                      color: ink3Color,
                                    ),
                                    filled: true,
                                    fillColor: inputBg,
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 10,
                                    ),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10),
                                      borderSide: BorderSide(
                                        color: inputBorder,
                                      ),
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10),
                                      borderSide: BorderSide(
                                        color: inputBorder,
                                      ),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10),
                                      borderSide: const BorderSide(
                                        color: AppColors.gold,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 10),
                                // Preset chips
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 6,
                                  children: [
                                    _presetChip(
                                      'Kong :8000',
                                      'http://localhost:8000',
                                      inputBg,
                                      inputBorder,
                                      isDark,
                                    ),
                                    _presetChip(
                                      'Backend :3000',
                                      'http://localhost:3000',
                                      inputBg,
                                      inputBorder,
                                      isDark,
                                    ),
                                    _presetChip(
                                      'Production',
                                      'https://api.slowspider.com',
                                      inputBg,
                                      inputBorder,
                                      isDark,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                // Test Connection status banner
                                if (_pingMessage != null) ...[
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color:
                                          (_connectionOk == true
                                                  ? AppColors.muted
                                                  : AppColors.danger)
                                              .withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color:
                                            (_connectionOk == true
                                                    ? AppColors.muted
                                                    : AppColors.danger)
                                                .withValues(alpha: 0.3),
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        AppIcon(
                                          _connectionOk == true
                                              ? SpiderIcons.checkCircleFilled
                                              : SpiderIcons.closeCircle,
                                          size: 15,
                                          color: _connectionOk == true
                                              ? AppColors.muted
                                              : AppColors.danger,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            _pingMessage!,
                                            style: AppType.sans(
                                              color: _connectionOk == true
                                                  ? AppColors.muted
                                                  : AppColors.danger,
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                ],
                                Row(
                                  children: [
                                    Expanded(
                                      child: OutlinedButton.icon(
                                        style: OutlinedButton.styleFrom(
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 9,
                                          ),
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              10,
                                            ),
                                          ),
                                          side: BorderSide(color: inputBorder),
                                        ),
                                        icon: _testingConnection
                                            ? SizedBox(
                                                width: 14,
                                                height: 14,
                                                child:
                                                    CircularProgressIndicator(
                                                      strokeWidth: 2,
                                                    ),
                                              )
                                            : const AppIcon(
                                                SpiderIcons.bolt,
                                                size: 16,
                                              ),
                                        label: Text(
                                          _testingConnection
                                              ? 'Testing...'
                                              : 'Test Connection',
                                          style: AppType.sans(
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        onPressed: _testingConnection
                                            ? null
                                            : _testApiUrl,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.gold,
                                          foregroundColor: Colors.black,
                                          elevation: 0,
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 9,
                                          ),
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              10,
                                            ),
                                          ),
                                        ),
                                        onPressed: _saveApiUrl,
                                        child: Text(
                                          'Save & Apply',
                                          style: AppType.sans(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),
                  Text(
                    'Powered by JIORATECH',
                    textAlign: TextAlign.center,
                    style: AppType.sans(
                      color: ink3Color,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _presetChip(
    String label,
    String url,
    Color bg,
    Color border,
    bool isDark,
  ) {
    final isSelected = _apiUrlCtrl.text.trim() == url;
    return InkWell(
      onTap: () {
        setState(() {
          _apiUrlCtrl.text = url;
          _pingMessage = null;
        });
      },
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.gold.withValues(alpha: isDark ? 0.25 : 0.15)
              : bg,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: isSelected ? AppColors.gold : border,
            width: isSelected ? 1.2 : 0.8,
          ),
        ),
        child: Text(
          label,
          style: AppType.sans(
            fontSize: 11,
            color: isSelected
                ? AppColors.gold
                : (isDark ? Colors.white70 : Colors.black87),
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
