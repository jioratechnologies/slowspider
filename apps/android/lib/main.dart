import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Draw behind the system bars. Paired with the transparent overlay style in
  // SlowSpiderApp, this is what lets the board scroll under the status bar
  // instead of stopping at a grey strip.
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  runApp(const ProviderScope(child: SlowSpiderApp()));
}
