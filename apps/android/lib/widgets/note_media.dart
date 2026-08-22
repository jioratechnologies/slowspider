import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/api_client.dart';
import '../core/app_theme.dart';
import '../models/models.dart';

/// Storage objects are private, so the stored path is traded for a short-lived signed URL
/// at render time rather than being linked directly. Mirrors apps/mobile's NoteMedia.tsx.
class NoteMedia extends StatefulWidget {
  final Note note;
  const NoteMedia({super.key, required this.note});

  @override
  State<NoteMedia> createState() => _NoteMediaState();
}

class _NoteMediaState extends State<NoteMedia> {
  String? _signed;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (widget.note.url == null) return;
    try {
      final url = await ApiClient.instance.mediaUrl(widget.note.url!);
      if (mounted) setState(() => _signed = url);
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) return const Text("Couldn't load this file.", style: TextStyle(color: AppColors.ink3, fontSize: 12));
    if (_signed == null) return const Text('Loading…', style: TextStyle(color: AppColors.ink3, fontSize: 12));

    if (widget.note.kind == NoteKind.voice) return _VoicePlayer(url: _signed!, durationMs: widget.note.durationMs);
    if (widget.note.kind == NoteKind.image) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.network(_signed!, height: 190, width: double.infinity, fit: BoxFit.cover),
      );
    }

    return InkWell(
      onTap: () => launchUrl(Uri.parse(_signed!), mode: LaunchMode.externalApplication),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(widget.note.kind == NoteKind.video ? Icons.play_circle_outline : Icons.open_in_new, size: 18, color: AppColors.low),
          const SizedBox(width: 8),
          Text(widget.note.kind == NoteKind.video ? 'Play video' : 'Open file', style: const TextStyle(color: AppColors.low, fontSize: 14)),
        ],
      ),
    );
  }
}

class _VoicePlayer extends StatefulWidget {
  final String url;
  final int? durationMs;
  const _VoicePlayer({required this.url, required this.durationMs});

  @override
  State<_VoicePlayer> createState() => _VoicePlayerState();
}

class _VoicePlayerState extends State<_VoicePlayer> {
  final _player = AudioPlayer();
  bool _playing = false;
  Duration _position = Duration.zero;
  Duration _total = Duration.zero;

  @override
  void initState() {
    super.initState();
    _total = Duration(milliseconds: widget.durationMs ?? 0);
    _player.onPlayerStateChanged.listen((s) {
      if (mounted) setState(() => _playing = s == PlayerState.playing);
    });
    _player.onPositionChanged.listen((p) {
      if (mounted) setState(() => _position = p);
    });
    _player.onDurationChanged.listen((d) {
      if (mounted && widget.durationMs == null) setState(() => _total = d);
    });
    _player.onPlayerComplete.listen((_) {
      if (mounted) setState(() => _position = Duration.zero);
    });
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _toggle() async {
    if (_playing) {
      await _player.pause();
    } else {
      if (_total.inMilliseconds > 0 && _position >= _total - const Duration(milliseconds: 250)) {
        await _player.seek(Duration.zero);
      }
      await _player.play(UrlSource(widget.url));
    }
  }

  String _fmt(Duration d) {
    final total = d.inSeconds.clamp(0, 1 << 30);
    return '${total ~/ 60}:${(total % 60).toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final remaining = _total > _position ? _total - _position : Duration.zero;
    final pct = _total.inMilliseconds > 0 ? (_position.inMilliseconds / _total.inMilliseconds).clamp(0.0, 1.0) : 0.0;
    return Row(
      children: [
        IconButton(
          icon: Icon(_playing ? Icons.pause_circle : Icons.play_circle, size: 30, color: AppColors.accent),
          onPressed: _toggle,
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: LinearProgressIndicator(value: pct, minHeight: 4, backgroundColor: AppColors.panel2, color: AppColors.accent),
          ),
        ),
        const SizedBox(width: 8),
        Text(_fmt(remaining), style: const TextStyle(color: AppColors.ink3, fontSize: 11)),
      ],
    );
  }
}
