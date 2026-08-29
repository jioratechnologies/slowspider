import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

import '../core/api_client.dart';
import '../core/app_theme.dart';
import '../core/upload_helper.dart';
import '../models/models.dart';
import '../state/board_provider.dart';

Future<void> showQuickCaptureSheet(
  BuildContext context, {
  int? defaultClusterId,
  String? initialAction,
}) {
  final isDark = Theme.of(context).brightness == Brightness.dark;
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: isDark ? const Color(0xFF161824) : Colors.white,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (ctx) => _QuickCaptureSheet(
      defaultClusterId: defaultClusterId,
      initialAction: initialAction,
    ),
  );
}

class _QuickCaptureSheet extends ConsumerStatefulWidget {
  final int? defaultClusterId;
  final String? initialAction;
  const _QuickCaptureSheet({this.defaultClusterId, this.initialAction});

  @override
  ConsumerState<_QuickCaptureSheet> createState() => _QuickCaptureSheetState();
}

class _StagedFile {
  final PickedFile? picked;
  final String? voicePath;
  final int? durationMs;
  final String name;
  final String mime;
  final int size;

  _StagedFile.picked(this.picked)
      : voicePath = null,
        durationMs = null,
        name = picked!.name,
        mime = picked.mime,
        size = picked.size;

  _StagedFile.voice(this.voicePath, this.durationMs)
      : picked = null,
        name = 'voice-${DateTime.now().millisecondsSinceEpoch}.m4a',
        mime = 'audio/m4a',
        size = 0;
}

class _QuickCaptureSheetState extends ConsumerState<_QuickCaptureSheet> with SingleTickerProviderStateMixin {
  final _titleCtrl = TextEditingController();
  int? _clusterId;
  final List<_StagedFile> _staged = [];
  bool _busy = false;
  String? _error;

  // Voice recording state
  final _audioRecorder = AudioRecorder();
  bool _isRecording = false;
  DateTime? _recordStartTime;
  Timer? _recordTimer;
  Duration _recordDuration = Duration.zero;
  String? _recordPath;

  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _clusterId = widget.defaultClusterId;
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);

    if (widget.initialAction != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        if (widget.initialAction == 'voice') {
          _startVoiceRecording();
        } else if (widget.initialAction == 'camera') {
          _stage(pickImageFromCamera);
        } else if (widget.initialAction == 'gallery') {
          _stage(pickImageFromGallery);
        } else if (widget.initialAction == 'file') {
          _stage(pickDocument);
        }
      });
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _pulseController.dispose();
    _recordTimer?.cancel();
    _audioRecorder.dispose();
    super.dispose();
  }

  Future<void> _startVoiceRecording() async {
    if (_busy || _isRecording) return;
    try {
      final hasPerm = await _audioRecorder.hasPermission();
      if (hasPerm != true) {
        setState(() => _error = 'Microphone permission denied.');
        return;
      }
      String path = '';
      if (!kIsWeb) {
        final dir = await getTemporaryDirectory();
        path = '${dir.path}/voice-${DateTime.now().millisecondsSinceEpoch}.m4a';
      }
      _recordPath = path;
      await _audioRecorder.start(const RecordConfig(encoder: AudioEncoder.aacLc), path: path);
      _recordStartTime = DateTime.now();
      setState(() {
        _isRecording = true;
        _recordDuration = Duration.zero;
        _error = null;
      });
      _recordTimer = Timer.periodic(const Duration(milliseconds: 200), (_) {
        if (_recordStartTime != null && mounted) {
          setState(() => _recordDuration = DateTime.now().difference(_recordStartTime!));
        }
      });
      HapticFeedback.heavyImpact();
    } catch (e) {
      setState(() => _error = 'Could not start recording: $e');
    }
  }

  Future<void> _stopVoiceRecording({bool discard = false}) async {
    if (!_isRecording) return;
    _recordTimer?.cancel();
    final path = await _audioRecorder.stop();
    final durationMs = _recordDuration.inMilliseconds;
    setState(() => _isRecording = false);
    HapticFeedback.mediumImpact();

    if (discard) return;

    final finalPath = path ?? _recordPath;
    if (finalPath != null && durationMs > 300) {
      setState(() {
        _staged.add(_StagedFile.voice(finalPath, durationMs));
      });
    }
  }

  Future<void> _stage(Future<PickedFile?> Function() pick) async {
    setState(() => _error = null);
    try {
      final file = await pick();
      if (file != null) {
        setState(() => _staged.add(_StagedFile.picked(file)));
      }
    } catch (e) {
      setState(() => _error = "Couldn't open the picker: $e");
    }
  }

  void _showImageOptions() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF1B1D2C) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF33374C) : const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'Add Photo',
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0EA5E9).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: Color(0xFF0EA5E9), size: 20),
                ),
                title: Text('Take Photo with Camera', style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14)),
                onTap: () {
                  Navigator.pop(ctx);
                  _stage(pickImageFromCamera);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF8B5CF6).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.photo_library_rounded, color: Color(0xFF8B5CF6), size: 20),
                ),
                title: Text('Select from Gallery', style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14)),
                onTap: () {
                  Navigator.pop(ctx);
                  _stage(pickImageFromGallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showPreviewDialog(_StagedFile file) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isVoice = kindForMime(file.mime) == NoteKind.voice;
    final isImage = kindForMime(file.mime) == NoteKind.image;

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: isDark ? const Color(0xFF191B28) : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      file.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.pop(ctx),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (isImage && file.picked != null && file.picked!.bytes.isNotEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 280),
                    child: Image.memory(
                      file.picked!.bytes,
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  formatBytes(file.size),
                  style: GoogleFonts.inter(color: isDark ? const Color(0xFF949BAE) : const Color(0xFF64748B), fontSize: 12),
                ),
              ] else if (isVoice) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.mic_rounded, size: 44, color: Color(0xFFEF4444)),
                      const SizedBox(height: 12),
                      Text(
                        'Voice Note Recording',
                        style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        file.durationMs != null ? '${(file.durationMs! / 1000).toStringAsFixed(1)}s recorded' : 'Audio note',
                        style: GoogleFonts.inter(color: const Color(0xFFEF4444), fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: const Color(0xFF8B5CF6).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF8B5CF6).withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.insert_drive_file_rounded, size: 44, color: Color(0xFF8B5CF6)),
                      const SizedBox(height: 12),
                      Text(
                        file.name,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${file.mime} • ${formatBytes(file.size)}',
                        style: GoogleFonts.inter(color: isDark ? const Color(0xFF949BAE) : const Color(0xFF64748B), fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isDark ? const Color(0xFF282B3C) : const Color(0xFFF1F3F9),
                    foregroundColor: isDark ? Colors.white : const Color(0xFF1E293B),
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Close Preview'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _save() async {
    final board = ref.read(boardProvider.notifier);
    final text = _titleCtrl.text.trim();
    if (text.isEmpty && _staged.isEmpty) return;

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final task = await board.addTask(text.isNotEmpty ? text : 'Attached files', _clusterId);
      if (task == null) throw Exception("Couldn't create that task.");

      for (var i = 0; i < _staged.length; i++) {
        final f = _staged[i];
        String path;
        int size;
        if (f.picked != null) {
          final result = await uploadPicked(f.picked!);
          path = result.path;
          size = result.size;
        } else {
          final bytes = f.voicePath != null && !kIsWeb
              ? await File(f.voicePath!).readAsBytes()
              : Uint8List(0);
          path = await ApiClient.instance.uploadMedia(bytes, f.name, f.mime, bytes.length);
          size = bytes.length;
        }
        await board.addNote({
          'task_id': task.id,
          'cluster_id': null,
          'kind': noteKindToString(kindForMime(f.mime)),
          'visibility': 'workspace',
          'body': f.name,
          'url': path,
          'mime': f.mime,
          'size_bytes': size,
          'duration_ms': f.durationMs,
          'pos': i.toDouble(),
        });
      }
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = "Couldn't save that: $e");
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _formatDuration(Duration d) {
    final s = d.inSeconds;
    return '${s ~/ 60}:${(s % 60).toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final textColor = theme.colorScheme.onSurface;
    final mutedColor = isDark ? const Color(0xFF949BAE) : const Color(0xFF64748B);
    final inputBg = isDark ? const Color(0xFF1E2130) : const Color(0xFFF8FAFC);
    final inputBorder = isDark ? const Color(0xFF2E3248) : const Color(0xFFE2E8F0);

    final board = ref.watch(boardProvider);
    final clusters = (board.data?.clusters ?? []).where((c) => c.status == ClusterStatus.active).toList();
    final canSave = (_titleCtrl.text.trim().isNotEmpty || _staged.isNotEmpty) && !_busy;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Top Drag Handle
            Center(
              child: Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF373B50) : const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Header Title + Close Button
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'New task',
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: textColor,
                  ),
                ),
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => Navigator.of(context).pop(),
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: inputBg,
                        shape: BoxShape.circle,
                        border: Border.all(color: inputBorder, width: 0.8),
                      ),
                      child: Icon(Icons.close_rounded, size: 17, color: mutedColor),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Redesigned Text Input Box (Spacious Single Card with Subtle Glow on Focus)
            TextField(
              controller: _titleCtrl,
              autofocus: widget.initialAction == null,
              maxLines: 4,
              minLines: 2,
              onChanged: (_) => setState(() {}),
              style: GoogleFonts.inter(
                color: textColor,
                fontSize: 14.5,
                fontWeight: FontWeight.w500,
                height: 1.4,
              ),
              decoration: InputDecoration(
                hintText: 'What needs doing?',
                hintStyle: GoogleFonts.inter(
                  color: mutedColor.withValues(alpha: 0.8),
                  fontSize: 14.5,
                  fontWeight: FontWeight.w400,
                ),
                filled: true,
                fillColor: inputBg,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(13),
                  borderSide: BorderSide(color: inputBorder, width: 1.0),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(13),
                  borderSide: BorderSide(color: inputBorder, width: 1.0),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(13),
                  borderSide: const BorderSide(color: Color(0xFF6366F1), width: 1.5),
                ),
              ),
            ),

            // Live Audio Recording Bar Animation
            if (_isRecording) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: isDark ? 0.15 : 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.4)),
                ),
                child: Row(
                  children: [
                    // Pulsing Red Dot
                    AnimatedBuilder(
                      animation: _pulseController,
                      builder: (ctx, child) {
                        return Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFFEF4444).withValues(alpha: 0.4 + 0.6 * _pulseController.value),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFEF4444).withValues(alpha: 0.8 * _pulseController.value),
                                blurRadius: 6,
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Recording voice note...',
                      style: GoogleFonts.inter(
                        color: const Color(0xFFEF4444),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      _formatDuration(_recordDuration),
                      style: GoogleFonts.inter(
                        color: const Color(0xFFEF4444),
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    const SizedBox(width: 10),
                    // Discard
                    IconButton(
                      icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Color(0xFFEF4444)),
                      onPressed: () => _stopVoiceRecording(discard: true),
                      visualDensity: VisualDensity.compact,
                    ),
                    // Stop & Save
                    IconButton(
                      icon: const Icon(Icons.check_circle_rounded, size: 22, color: Color(0xFF10B981)),
                      onPressed: () => _stopVoiceRecording(discard: false),
                      visualDensity: VisualDensity.compact,
                    ),
                  ],
                ),
              ),
            ],

            // Staged Attachments Chips (Clickable for Full Preview)
            if (_staged.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _staged.asMap().entries.map((e) {
                  final isVoice = kindForMime(e.value.mime) == NoteKind.voice;
                  final isImage = kindForMime(e.value.mime) == NoteKind.image;
                  final chipColor = isVoice
                      ? const Color(0xFFEF4444)
                      : (isImage ? const Color(0xFF0EA5E9) : const Color(0xFF8B5CF6));

                  return Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () {
                        HapticFeedback.lightImpact();
                        _showPreviewDialog(e.value);
                      },
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: chipColor.withValues(alpha: isDark ? 0.12 : 0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: chipColor.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              isVoice ? Icons.mic_rounded : (isImage ? Icons.image_rounded : Icons.insert_drive_file_rounded),
                              size: 16,
                              color: chipColor,
                            ),
                            const SizedBox(width: 6),
                            ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 140),
                              child: Text(
                                e.value.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.inter(
                                  color: textColor,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            InkWell(
                              onTap: () => setState(() => _staged.removeAt(e.key)),
                              child: Icon(Icons.close_rounded, size: 14, color: mutedColor),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],

            const SizedBox(height: 14),

            // Media Action Toolbar: [ 🎤 Voice | 📷 Photo | 📎 File ]
            Row(
              children: [
                _mediaActionButton(
                  icon: Icons.mic_rounded,
                  label: 'Voice',
                  color: const Color(0xFFEF4444),
                  isDark: isDark,
                  onTap: _isRecording ? () => _stopVoiceRecording(discard: false) : _startVoiceRecording,
                ),
                const SizedBox(width: 8),
                _mediaActionButton(
                  icon: Icons.camera_alt_rounded,
                  label: 'Photo',
                  color: const Color(0xFF0EA5E9),
                  isDark: isDark,
                  onTap: _busy ? null : _showImageOptions,
                ),
                const SizedBox(width: 8),
                _mediaActionButton(
                  icon: Icons.attach_file_rounded,
                  label: 'File',
                  color: const Color(0xFF8B5CF6),
                  isDark: isDark,
                  onTap: _busy ? null : () => _stage(pickDocument),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // GOES TO Cluster Section
            Text(
              'GOES TO',
              style: GoogleFonts.inter(
                color: mutedColor,
                fontSize: 10.5,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _clusterPill(
                  label: 'Floating',
                  selected: _clusterId == null,
                  isDark: isDark,
                  onTap: () => setState(() => _clusterId = null),
                ),
                ...clusters.map((c) => _clusterPill(
                      label: c.name,
                      colorHex: c.color,
                      selected: _clusterId == c.id,
                      isDark: isDark,
                      onTap: () => setState(() => _clusterId = c.id),
                    )),
              ],
            ),

            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(
                  _error!,
                  style: GoogleFonts.inter(color: AppColors.danger, fontSize: 12),
                ),
              ),

            const SizedBox(height: 20),

            // Bottom Actions: [ Cancel | Add task ]
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: _busy ? null : () => Navigator.of(context).pop(),
                  child: Text(
                    'Cancel',
                    style: GoogleFonts.inter(color: mutedColor, fontWeight: FontWeight.w600, fontSize: 13.5),
                  ),
                ),
                const SizedBox(width: 10),
                GestureDetector(
                  onTap: canSave ? _save : null,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                    decoration: BoxDecoration(
                      gradient: canSave
                          ? const LinearGradient(
                              colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                            )
                          : null,
                      color: canSave ? null : (isDark ? const Color(0xFF232636) : const Color(0xFFE2E6F0)),
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: canSave
                          ? [
                              BoxShadow(
                                color: const Color(0xFF6366F1).withValues(alpha: 0.35),
                                blurRadius: 10,
                                offset: const Offset(0, 3),
                              ),
                            ]
                          : null,
                    ),
                    child: _busy
                        ? const SizedBox(
                            height: 16,
                            width: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Text(
                            'Add task',
                            style: GoogleFonts.inter(
                              color: canSave ? Colors.white : mutedColor,
                              fontSize: 13.5,
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
    );
  }

  Widget _mediaActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required bool isDark,
    VoidCallback? onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(9),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: color.withValues(alpha: isDark ? 0.12 : 0.08),
            borderRadius: BorderRadius.circular(9),
            border: Border.all(color: color.withValues(alpha: isDark ? 0.28 : 0.2), width: 0.9),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 15, color: color),
              const SizedBox(width: 5),
              Text(
                label,
                style: GoogleFonts.inter(
                  color: color,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _clusterPill({
    required String label,
    String? colorHex,
    required bool selected,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    final catColor = colorHex != null ? colorFromHex(colorHex) : const Color(0xFF8B5CF6);

    return InkWell(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      borderRadius: BorderRadius.circular(999),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: selected
              ? catColor.withValues(alpha: isDark ? 0.25 : 0.15)
              : (isDark ? const Color(0xFF1E2130) : const Color(0xFFF1F4F9)),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? catColor : (isDark ? const Color(0xFF2C3044) : const Color(0xFFE2E6F0)),
            width: selected ? 1.2 : 0.8,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (colorHex != null) ...[
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  color: catColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 5.5),
            ],
            Text(
              label,
              style: GoogleFonts.inter(
                color: selected
                    ? (isDark ? Colors.white : catColor)
                    : (isDark ? const Color(0xFF949BAE) : const Color(0xFF64748B)),
                fontSize: 12,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
