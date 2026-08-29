import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

/// Mirrors apps/mobile/src/components/VoiceRecorder.tsx (built on expo-audio there; `record`
/// package here). Records to a local m4a file, then hands (path, durationMs) to the caller
/// on stop — the caller is responsible for uploading it, same split as the RN version.
class VoiceRecorder extends StatefulWidget {
  final void Function(String path, int durationMs) onRecorded;
  final bool disabled;
  final bool compact;

  const VoiceRecorder({super.key, required this.onRecorded, this.disabled = false, this.compact = false});

  @override
  State<VoiceRecorder> createState() => _VoiceRecorderState();
}

class _VoiceRecorderState extends State<VoiceRecorder> {
  final _recorder = AudioRecorder();
  bool _recording = false;
  DateTime? _startedAt;
  Timer? _ticker;
  Duration _elapsed = Duration.zero;
  String? _path;

  @override
  void dispose() {
    _ticker?.cancel();
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    if (!await _recorder.hasPermission()) return;
    final dir = await getTemporaryDirectory();
    _path = '${dir.path}/voice-${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _recorder.start(const RecordConfig(encoder: AudioEncoder.aacLc), path: _path!);
    _startedAt = DateTime.now();
    setState(() {
      _recording = true;
      _elapsed = Duration.zero;
    });
    _ticker = Timer.periodic(const Duration(milliseconds: 200), (_) {
      if (_startedAt != null && mounted) setState(() => _elapsed = DateTime.now().difference(_startedAt!));
    });
  }

  Future<void> _stop() async {
    final path = await _recorder.stop();
    _ticker?.cancel();
    setState(() => _recording = false);
    final durationMs = _elapsed.inMilliseconds;
    final finalPath = path ?? _path;
    if (finalPath != null && File(finalPath).existsSync() && durationMs > 300) {
      widget.onRecorded(finalPath, durationMs);
    }
  }

  String _fmt(Duration d) {
    final s = d.inSeconds;
    return '${s ~/ 60}:${(s % 60).toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final cardBorder = isDark ? const Color(0xFF282B3C) : const Color(0xFFE2E4EA);
    final inputBg = isDark ? const Color(0xFF1E212E) : const Color(0xFFF3F4F6);
    final textColor = theme.colorScheme.onSurface;

    if (_recording) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: widget.disabled ? null : _stop,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFEF4444).withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFEF4444)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.stop_circle_rounded, size: 16, color: Color(0xFFEF4444)),
                const SizedBox(width: 6),
                Text(
                  _fmt(_elapsed),
                  style: GoogleFonts.inter(color: const Color(0xFFEF4444), fontSize: 12.5, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (widget.compact) {
      return IconButton(
        icon: const Icon(Icons.mic_none_rounded),
        color: textColor,
        onPressed: widget.disabled ? null : _start,
      );
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: widget.disabled ? null : _start,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: inputBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: cardBorder),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.mic_rounded, size: 16, color: Color(0xFF10B981)),
              const SizedBox(width: 6),
              Text(
                'Record voice',
                style: GoogleFonts.inter(color: textColor, fontSize: 12.5, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
