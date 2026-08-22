import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/app_theme.dart';
import 'screens/archive_screen.dart';
import 'screens/calendar_screen.dart';
import 'screens/cluster_detail_screen.dart';
import 'screens/reset_password_screen.dart';
import 'screens/sign_in_screen.dart';
import 'screens/sign_up_screen.dart';
import 'screens/task_detail_screen.dart';
import 'screens/workspace_screen.dart';
import 'state/auth_provider.dart';
import 'state/theme_provider.dart';
import 'widgets/app_shell.dart';

final _routerListenable = ValueNotifier<AuthStatus>(AuthStatus.restoring);

final routerProvider = Provider<GoRouter>((ref) {
  ref.listen(authProvider, (prev, next) => _routerListenable.value = next.status);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: _routerListenable,
    redirect: (context, state) {
      final status = ref.read(authProvider).status;
      final loggingIn = state.matchedLocation == '/sign-in' || state.matchedLocation == '/sign-up' || state.matchedLocation == '/reset-password';
      if (status == AuthStatus.restoring) return null;
      if (status == AuthStatus.signedOut && !loggingIn) return '/sign-in';
      if (status == AuthStatus.signedIn && loggingIn) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (context, state) => const AppShell()),
      GoRoute(path: '/calendar', builder: (context, state) => const CalendarScreen()),
      GoRoute(path: '/archive', builder: (context, state) => const ArchiveScreen()),
      GoRoute(path: '/sign-in', builder: (context, state) => const SignInScreen()),
      GoRoute(path: '/sign-up', builder: (context, state) => const SignUpScreen()),
      GoRoute(path: '/reset-password', builder: (context, state) => const ResetPasswordScreen()),
      GoRoute(path: '/workspace', builder: (context, state) => const WorkspaceScreen()),
      GoRoute(
        path: '/task/:id',
        builder: (context, state) => TaskDetailScreen(
          taskId: int.parse(state.pathParameters['id']!),
          initialNotesTab: state.uri.queryParameters['tab'] == 'notes',
        ),
      ),
      GoRoute(
        path: '/cluster/:id',
        builder: (context, state) => ClusterDetailScreen(clusterId: int.parse(state.pathParameters['id']!)),
      ),
    ],
  );
});

class SlowSpiderApp extends ConsumerWidget {
  const SlowSpiderApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authStatus = ref.watch(authProvider).status;
    final themeMode = ref.watch(themeProvider);
    final router = ref.watch(routerProvider);

    return Builder(
      builder: (context) {
        final platformBrightness = MediaQuery.maybePlatformBrightnessOf(context) ?? Brightness.dark;
        final theme = buildAppTheme(mode: themeMode, platformBrightness: platformBrightness);

        if (authStatus == AuthStatus.restoring) {
          return MaterialApp(
            theme: theme,
            home: const Scaffold(body: Center(child: CircularProgressIndicator())),
          );
        }

        return MaterialApp.router(
          title: 'Slow Spider',
          debugShowCheckedModeBanner: false,
          theme: theme,
          routerConfig: router,
        );
      },
    );
  }
}
