import { IconButton } from "react-native-paper";
import { useBoard } from "../store/BoardContext";

/** Opens the workspace sheet, which lives in the Portal host so it can cover the tab bar. */
export default function WorkspaceHeaderButton() {
  const { setWorkspaceSheetOpen } = useBoard();
  return <IconButton icon="office-building" size={22} onPress={() => setWorkspaceSheetOpen(true)} />;
}
