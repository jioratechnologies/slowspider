import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { BackHandler, StyleSheet } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";

/**
 * Material 3 bottom sheet with the gestures Android users expect: drag the handle (or the
 * content) down to dismiss, tap the scrim, or use the system back gesture/button. React
 * Native's built-in <Modal> supports none of the drag behaviour, which is why every popup
 * in the app routes through this instead.
 */
export default function Sheet({
  visible,
  onClose,
  children,
  snapPoints = ["60%"],
  scrollable = true,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: (string | number)[];
  /** Set false when the content manages its own scrolling (or must not scroll at all). */
  scrollable?: boolean;
}) {
  const ref = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  useEffect(() => {
    if (visible) ref.current?.expand();
    else ref.current?.close();
  }, [visible]);

  // The sheet is a sibling of the navigator rather than a screen, so the back press has to
  // be claimed here or it would pop the underlying tab instead of closing the sheet.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.6} pressBehavior="close" />
    ),
    []
  );

  if (!visible) return null;

  const padding = { paddingHorizontal: 20, paddingTop: 4, paddingBottom: insets.bottom + 20, gap: 14 };

  return (
    <BottomSheet
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.elevation.level1 }}
      handleIndicatorStyle={{ backgroundColor: colors.outline }}
      style={styles.sheet}
    >
      {scrollable ? (
        <BottomSheetScrollView contentContainerStyle={padding} keyboardShouldPersistTaps="handled">
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={padding}>{children}</BottomSheetView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { zIndex: 100 },
});
