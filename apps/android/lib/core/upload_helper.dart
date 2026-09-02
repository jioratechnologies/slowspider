import 'dart:io';

import 'package:flutter/foundation.dart';

import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';

import '../models/models.dart';
import 'api_client.dart';

/// Mirrors apps/mobile/src/upload.ts — picking + uploading attachments.
class PickedFile {
  final String path; // local file path (or empty for in-memory bytes)
  final Uint8List bytes;
  final String name;
  final String mime;
  final int size;

  PickedFile({
    required this.path,
    required this.bytes,
    required this.name,
    required this.mime,
    required this.size,
  });
}

/// Same mapping the web's TaskAttachmentsSection uses, so both clients label files alike.
NoteKind kindForMime(String mime) {
  if (mime.startsWith('video/')) return NoteKind.video;
  if (mime.startsWith('audio/')) return NoteKind.voice;
  if (mime.startsWith('image/')) return NoteKind.image;
  return NoteKind.file;
}

String formatBytes(int n) {
  if (n < 1024) return '$n B';
  const units = ['KB', 'MB', 'GB'];
  double v = n / 1024;
  int i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return '${v < 10 ? v.toStringAsFixed(1) : v.round()} ${units[i]}';
}

/// Photo/video from the gallery. Returns null when the user cancels.
Future<PickedFile?> pickMedia() async {
  final picker = ImagePicker();
  final XFile? file = await picker.pickMedia();
  if (file == null) return null;
  final bytes = await file.readAsBytes();
  final mime = file.mimeType ?? _guessMime(file.name);
  return PickedFile(
    path: file.path,
    bytes: bytes,
    name: file.name,
    mime: mime,
    size: bytes.length,
  );
}

/// Take photo with camera.
Future<PickedFile?> pickImageFromCamera() async {
  final picker = ImagePicker();
  final XFile? file = await picker.pickImage(source: ImageSource.camera);
  if (file == null) return null;
  final bytes = await file.readAsBytes();
  final mime = file.mimeType ?? _guessMime(file.name);
  return PickedFile(
    path: file.path,
    bytes: bytes,
    name: file.name,
    mime: mime,
    size: bytes.length,
  );
}

/// Pick image from gallery.
Future<PickedFile?> pickImageFromGallery() async {
  final picker = ImagePicker();
  final XFile? file = await picker.pickImage(source: ImageSource.gallery);
  if (file == null) return null;
  final bytes = await file.readAsBytes();
  final mime = file.mimeType ?? _guessMime(file.name);
  return PickedFile(
    path: file.path,
    bytes: bytes,
    name: file.name,
    mime: mime,
    size: bytes.length,
  );
}

/// Any file type, via the system document picker.
Future<PickedFile?> pickDocument() async {
  final result = await FilePicker.platform.pickFiles(withData: true);
  if (result == null || result.files.isEmpty) return null;
  final f = result.files.first;
  Uint8List bytes = f.bytes ?? Uint8List(0);
  String filePath = '';
  if (!kIsWeb) {
    filePath = f.path ?? '';
    if (bytes.isEmpty && filePath.isNotEmpty) {
      bytes = await File(filePath).readAsBytes();
    }
  }
  return PickedFile(
    path: filePath,
    bytes: bytes,
    name: f.name,
    mime: _guessMime(f.name),
    size: bytes.length,
  );
}

String _guessMime(String filename) {
  final ext = filename.toLowerCase().split('.').last;
  const map = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'mp3': 'audio/mpeg',
    'm4a': 'audio/m4a',
    'wav': 'audio/wav',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
  };
  return map[ext] ?? 'application/octet-stream';
}

/// Uploads the bytes and returns the storage path plus the resolved size.
Future<({String path, int size})> uploadPicked(PickedFile file) async {
  final path = await ApiClient.instance.uploadMedia(
    file.bytes,
    file.name,
    file.mime,
    file.size,
  );
  return (path: path, size: file.size);
}
