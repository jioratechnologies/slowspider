import 'package:flutter/material.dart';

/// Centralized app-wide icon tokens matching the exact Lucide icons used in the web app.
class AppIcons {
  AppIcons._();

  // Navigation & Core Destinations
  static const IconData home = Icons.home_outlined;
  static const IconData homeActive = Icons.home_rounded;
  static const IconData coldStore = Icons.ac_unit_rounded; // Snowflake
  static const IconData dumpingBin = Icons.delete_outline_rounded;
  static const IconData dumpingBinActive = Icons.delete_rounded;
  static const IconData calendar = Icons.calendar_month_outlined;
  static const IconData calendarActive = Icons.calendar_month_rounded;
  static const IconData search = Icons.search_rounded;

  // Header & Global Actions (Exact Web Parity)
  static const IconData workspace = Icons.apartment_rounded; // Building2
  static const IconData workspaceSelector = Icons.unfold_more_rounded; // ChevronsUpDown
  static const IconData collaborators = Icons.people_outline_rounded; // Users
  static const IconData researchSuite = Icons.blur_on_rounded; // Atom / Science
  static const IconData smartSort = Icons.swap_vert_rounded; // ArrowDownWideNarrow
  static const IconData manualSort = Icons.sort_rounded;
  static const IconData createCluster = Icons.add_circle_outline_rounded; // PlusCircle
  static const IconData notifications = Icons.notifications_none_rounded; // Bell
  static const IconData notificationsActive = Icons.notifications_rounded;
  static const IconData themeDark = Icons.dark_mode_outlined; // Moon
  static const IconData themeLight = Icons.light_mode_outlined; // Sun
  static const IconData themeSystem = Icons.brightness_auto_rounded;

  static const IconData filter = Icons.tune_rounded; // SlidersHorizontal
  static const IconData quickAdd = Icons.add_rounded;
  static const IconData moreHoriz = Icons.more_horiz_rounded;
  static const IconData collapseChevron = Icons.keyboard_arrow_up_rounded;
  static const IconData expandChevron = Icons.keyboard_arrow_down_rounded;
  static const IconData back = Icons.arrow_back_rounded;
  static const IconData close = Icons.close_rounded;
  static const IconData clear = Icons.cancel_rounded;

  // Task & Card Actions
  static const IconData taskCheck = Icons.check_rounded;
  static const IconData taskDone = Icons.check_circle_rounded;
  static const IconData taskUndone = Icons.radio_button_unchecked_rounded;
  static const IconData starFilled = Icons.star_rounded;
  static const IconData starOutline = Icons.star_outline_rounded;
  static const IconData notes = Icons.edit_note_rounded; // NotebookPen
  static const IconData edit = Icons.edit_outlined; // Pencil
  static const IconData delete = Icons.delete_outline_rounded; // Trash2
  static const IconData deadline = Icons.schedule_rounded;
  static const IconData voiceNote = Icons.mic_rounded;
  static const IconData imageAttachment = Icons.image_rounded;
  static const IconData fileAttachment = Icons.attach_file_rounded;

  // Menu & Settings
  static const IconData manageCategories = Icons.sell_outlined; // Tags
  static const IconData members = Icons.people_outline_rounded; // Users
  static const IconData signOut = Icons.logout_rounded;
}
