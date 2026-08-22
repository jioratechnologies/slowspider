import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

import '../core/app_theme.dart';

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
    if (_recording) {
      return InkWell(
        onTap: widget.disabled ? null : _stop,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          decoration: BoxDecoration(
            color: AppColors.danger.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.danger),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.stop_circle, size: 16, color: AppColors.danger),
            const SizedBox(width: 6),
            Text(_fmt(_elapsed), style: const TextStyle(color: AppColors.danger, fontSize: 13)),
          ]),
        ),
      );
    }

    if (widget.compact) {
      return IconButton(
        icon: const Icon(Icons.mic_none),
        color: AppColors.ink,
        onPressed: widget.disabled ? null : _start,
      );
    }

    return InkWell(
      onTap: widget.disabled ? null : _start,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(border: Border.all(color: AppColors.lineStrong), borderRadius: BorderRadius.circular(10)),
        child: const Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.mic_none, size: 15, color: AppColors.ink),
          SizedBox(width: 6),
          Text('Record voice', style: TextStyle(color: AppColors.ink, fontSize: 13)),
        ]),
      ),
    );
  }
}
