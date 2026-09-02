/// ═══════════════════════════════════════════════════════════════════════════
/// SLOW SPIDER · Icons
///
/// Lucide (ISC), by way of `lucide_icons_flutter`. Two reasons it wins here:
/// it is a genuinely well-drawn open set on a consistent 24px grid at a 2px
/// stroke, and the web app is already built on Lucide — so the phone and the
/// browser now show the same glyph for the same idea, which is the sort of
/// consistency users notice without being able to name.
///
/// This file is a *semantic* layer, not an alias dump: screens ask for
/// `SpiderIcons.coldStore`, not `LucideIcons.snowflake`. When a meaning needs
/// a different glyph later, it changes here once instead of in 23 files.
/// ═══════════════════════════════════════════════════════════════════════════
library;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'tokens.dart';

abstract final class SpiderIcons {
  // ── Navigation ──
  static const home = LucideIcons.house;
  static const homeActive = LucideIcons.house;
  static const coldStore = LucideIcons.snowflake;
  static const snowflake = LucideIcons.snowflake;
  static const dumpingBin = LucideIcons.trash2;
  static const trash = LucideIcons.trash2;
  static const trashFilled = LucideIcons.trash2;
  static const search = LucideIcons.search;
  static const searchOff = LucideIcons.searchX;
  static const calendar = LucideIcons.calendar;
  static const calendarToday = LucideIcons.calendarDays;
  static const eventAvailable = LucideIcons.calendarCheck;
  static const clock = LucideIcons.clock;
  static const bell = LucideIcons.bell;
  static const bellActive = LucideIcons.bellDot;
  static const inbox = LucideIcons.inbox;

  // ── Chevrons & arrows ──
  static const chevronDown = LucideIcons.chevronDown;
  static const chevronUp = LucideIcons.chevronUp;
  static const chevronLeft = LucideIcons.chevronLeft;
  static const chevronRight = LucideIcons.chevronRight;
  static const unfoldMore = LucideIcons.chevronsUpDown;
  static const arrowLeft = LucideIcons.arrowLeft;
  static const arrowRight = LucideIcons.arrowRight;
  static const arrowUpRight = LucideIcons.arrowUpRight;
  static const back = LucideIcons.arrowLeft;

  // ── Primitives ──
  static const plus = LucideIcons.plus;
  static const minus = LucideIcons.minus;
  static const check = LucideIcons.check;
  static const close = LucideIcons.x;
  static const circle = LucideIcons.circle;
  static const plusCircle = LucideIcons.circlePlus;
  static const checkCircle = LucideIcons.circleCheck;
  static const checkCircleFilled = LucideIcons.circleCheckBig;
  static const closeCircle = LucideIcons.circleX;
  static const error = LucideIcons.circleAlert;
  static const moreHoriz = LucideIcons.ellipsis;
  static const grip = LucideIcons.gripVertical;

  // ── Task ──
  static const star = LucideIcons.star;
  static const starFilled = LucideIcons.star;
  static const checklist = LucideIcons.listChecks;
  static const addTask = LucideIcons.listPlus;
  static const bolt = LucideIcons.zap;
  static const flag = LucideIcons.flag;

  // ── Editing ──
  static const pencil = LucideIcons.pencil;
  static const edit = LucideIcons.pencil;
  static const note = LucideIcons.notebookPen;
  static const notes = LucideIcons.notebookPen;
  static const description = LucideIcons.fileText;
  static const copy = LucideIcons.copy;
  static const link = LucideIcons.link;
  static const openExternal = LucideIcons.externalLink;
  static const refresh = LucideIcons.refreshCw;
  static const sync = LucideIcons.refreshCcw;
  static const restore = LucideIcons.rotateCcw;
  static const archive = LucideIcons.archive;
  static const pin = LucideIcons.pin;

  // ── Media ──
  static const mic = LucideIcons.mic;
  static const micOff = LucideIcons.micOff;
  static const voiceNote = LucideIcons.mic;
  static const image = LucideIcons.image;
  static const imageAttachment = LucideIcons.image;
  static const photoLibrary = LucideIcons.images;
  static const camera = LucideIcons.camera;
  static const video = LucideIcons.video;
  static const file = LucideIcons.file;
  static const filePdf = LucideIcons.fileType;
  static const attach = LucideIcons.paperclip;
  static const fileAttachment = LucideIcons.paperclip;
  static const folder = LucideIcons.folder;
  static const folderMove = LucideIcons.folderInput;
  static const play = LucideIcons.play;
  static const pause = LucideIcons.pause;
  static const stop = LucideIcons.square;
  static const playCircle = LucideIcons.circlePlay;
  static const stopCircle = LucideIcons.circleStop;

  // ── Identity & system ──
  static const user = LucideIcons.user;
  static const users = LucideIcons.users;
  static const members = LucideIcons.users;
  static const collaborators = LucideIcons.users;
  static const userRemove = LucideIcons.userMinus;
  static const logout = LucideIcons.logOut;
  static const signOut = LucideIcons.logOut;
  static const login = LucideIcons.logIn;
  static const lock = LucideIcons.lock;
  static const lockClock = LucideIcons.lockKeyhole;
  static const mail = LucideIcons.mail;
  static const eye = LucideIcons.eye;
  static const eyeOff = LucideIcons.eyeOff;
  static const workspace = LucideIcons.layoutGrid;
  static const workspaceSelector = LucideIcons.chevronsUpDown;
  static const grid = LucideIcons.grid3x3;
  static const tag = LucideIcons.tag;
  static const manageCategories = LucideIcons.tag;
  static const globe = LucideIcons.globe;
  static const cloud = LucideIcons.cloud;
  static const cloudOff = LucideIcons.cloudOff;
  static const server = LucideIcons.server;

  // ── Theme ──
  static const moon = LucideIcons.moon;
  static const sun = LucideIcons.sun;
  static const themeAuto = LucideIcons.sunMoon;
  static const themeDark = LucideIcons.moon;
  static const themeLight = LucideIcons.sun;
  static const themeSystem = LucideIcons.sunMoon;
  static const paint = LucideIcons.paintbrush;

  // ── Data & tools ──
  static const chart = LucideIcons.chartLine;
  static const calculator = LucideIcons.calculator;
  static const code = LucideIcons.code;
  static const atom = LucideIcons.atom;
  static const researchSuite = LucideIcons.atom;
  static const sliders = LucideIcons.slidersHorizontal;
  static const filter = LucideIcons.listFilter;
  static const sortSmart = LucideIcons.arrowDownWideNarrow;
  static const sortManual = LucideIcons.arrowUpDown;
  static const smartSort = sortSmart;
  static const manualSort = sortManual;

  // ── Legacy aliases, kept so older call sites keep compiling ──
  static const quickAdd = LucideIcons.plus;
  static const createCluster = LucideIcons.circlePlus;
  static const collapseChevron = LucideIcons.chevronUp;
  static const expandChevron = LucideIcons.chevronDown;
  static const clear = LucideIcons.circleX;
  static const taskCheck = LucideIcons.check;
  static const taskDone = LucideIcons.circleCheckBig;
  static const taskUndone = LucideIcons.circle;
  static const starOutline = LucideIcons.star;
  static const delete = LucideIcons.trash2;
  static const deadline = LucideIcons.clock;
  static const dumpingBinActive = LucideIcons.trash2;
  static const calendarActive = LucideIcons.calendarDays;
  static const notifications = LucideIcons.bell;
  static const notificationsActive = LucideIcons.bellDot;
  static const unknown = LucideIcons.circleHelp;
}

/// Draws one glyph.
///
/// Kept as a widget rather than using [Icon] directly so that size, colour
/// default and optical weight are decided in one place — and so a future set
/// swap is again a single-file change.
///
/// [strokeWidth] is accepted and ignored: Lucide ships as a plain icon font, so
/// its weight is fixed. It stays in the signature only so existing call sites
/// keep compiling — and deliberately does *not* map to [Icon.fill], which needs
/// a variable font with a FILL axis and would silently do nothing here.
///
/// "On" states are therefore carried by colour, not by a second glyph: a
/// starred task is a gold star, an unstarred one is a faint star.
class AppIcon extends StatelessWidget {
  final IconData icon;
  final double size;
  final Color? color;
  final double? strokeWidth;

  const AppIcon(
    this.icon, {
    super.key,
    this.size = 18,
    this.color,
    this.strokeWidth,
  });

  @override
  Widget build(BuildContext context) =>
      Icon(icon, size: size, color: color ?? context.ink.inkMuted);
}
