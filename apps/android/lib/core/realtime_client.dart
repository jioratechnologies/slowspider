import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:web_socket_channel/web_socket_channel.dart';

import 'api_client.dart';
import 'session_storage.dart';

/// Whole-record realtime change event: `{table, type, row}` — mirrors
/// apps/web/src/hooks/useRealtimeBoard.ts's `ChangeEvent`. `type` is one of
/// "INSERT"/"UPDATE"/"DELETE"; `table` is one of "tasks"/"clusters"/"categories"/
/// "milestones"/"notes".
typedef RealtimeEventHandler = void Function(String table, String type, Map<String, dynamic> row);

/// Android mirror of apps/web/src/hooks/useRealtimeBoard.ts's whole-record broadcast sync
/// (task/cluster/category/milestone/note create/update/delete over apps/backend's
/// authenticated `GET /v1/realtime` WebSocket, through Kong) — see
/// docs/MIGRATION-PLAN-bff-kong-split.md's Realtime section and
/// apps/backend/src/realtime/realtime.gateway.ts for the server side.
///
/// Deliberately NOT the CRDT/Yjs `doc-*`/`awareness-*` co-editing protocol layered onto the
/// same connection on web (Note.body live text merging) — that's out of scope here. Those
/// messages lack a `table` key and are silently ignored below.
///
/// One instance == one subscription to one workspace's change stream, authenticated with the
/// current Supabase access token (read fresh from SessionStorage on every connect attempt, so
/// a reconnect after a token refresh picks up the new token automatically — same reasoning as
/// useRealtimeBoard.ts's per-connect `supabase.auth.getSession()` call).
///
/// Reconnects on any drop with exponential backoff (1s, 2s, 4s, ... capped at 30s, plus a
/// little jitter), reset to the start on a successful handshake. The web hook uses a flat 2s
/// retry, which is fine for a browser tab; a phone's radio drops in and out far more often
/// (tunnels, elevators, airplane mode, backgrounding), so backoff avoids hammering Kong/the
/// backend with reconnect attempts during a longer outage while still recovering quickly from
/// a brief blip.
class RealtimeClient {
  RealtimeClient({required this.workspaceId, required this.onEvent});

  final int workspaceId;
  final RealtimeEventHandler onEvent;

  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _sub;
  Timer? _reconnectTimer;
  bool _disposed = false;
  int _attempt = 0;

  static const _maxBackoff = Duration(seconds: 30);

  void connect() {
    if (_disposed) return;
    _teardownSocket();

    final token = SessionStorage.instance.current?.accessToken;
    if (token == null) {
      // No active session yet (e.g. still restoring on cold start) — try again shortly
      // rather than giving up permanently, mirroring useRealtimeBoard.ts's same handling of
      // "no session yet".
      _scheduleReconnect();
      return;
    }

    final wsBase = ApiClient.base.replaceFirst('https://', 'wss://').replaceFirst('http://', 'ws://');
    final uri = Uri.parse('$wsBase/v1/realtime').replace(queryParameters: {
      'token': token,
      'workspaceId': workspaceId.toString(),
    });

    try {
      final channel = WebSocketChannel.connect(uri);
      _channel = channel;
      _sub = channel.stream.listen(
        _onMessage,
        onDone: _onDone,
        onError: (Object _, StackTrace stackTrace) => _onDone(),
        cancelOnError: true,
      );
      // A rejected upgrade (bad/expired token, not a workspace member, etc. — see
      // RealtimeGateway.handleUpgrade) surfaces via `ready` failing rather than the stream
      // ever emitting; route that through the same reconnect path as a mid-session drop.
      channel.ready.then((_) {
        _attempt = 0; // successful handshake — reset backoff
      }).catchError((Object _) {
        _onDone();
      });
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void _onMessage(dynamic raw) {
    Map<String, dynamic> msg;
    try {
      msg = jsonDecode(raw as String) as Map<String, dynamic>;
    } catch (_) {
      return; // malformed payload — skip it rather than take down the whole connection
    }
    // CRDT doc-*/awareness-* messages (see this class's header comment) are told apart from
    // a whole-record change event by the absence of a `table` key — ignored entirely here.
    final table = msg['table'] as String?;
    final type = msg['type'] as String?;
    final row = msg['row'] as Map<String, dynamic>?;
    if (table == null || type == null || row == null) return;
    onEvent(table, type, row);
  }

  void _onDone() {
    _teardownSocket();
    _scheduleReconnect();
  }

  void _scheduleReconnect() {
    if (_disposed) return;
    _reconnectTimer?.cancel();
    final backoffMs = min(1000 * pow(2, _attempt).toInt(), _maxBackoff.inMilliseconds);
    // Small jitter so many devices reconnecting after a shared outage (e.g. the backend
    // container restarting) don't all retry in exact lockstep.
    final jitterMs = Random().nextInt(400);
    _attempt++;
    _reconnectTimer = Timer(Duration(milliseconds: backoffMs + jitterMs), connect);
  }

  void _teardownSocket() {
    _sub?.cancel();
    _sub = null;
    _channel?.sink.close();
    _channel = null;
  }

  /// Stops reconnecting and closes the socket for good. Call when the workspace changes or
  /// the user signs out.
  void dispose() {
    _disposed = true;
    _reconnectTimer?.cancel();
    _teardownSocket();
  }
}
