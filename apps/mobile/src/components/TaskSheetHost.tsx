import { useEffect } from "react";
import TaskSheet from "../screens/TaskSheet";
import NotesSheet from "../screens/NotesSheet";
import WorkspaceSheet from "./WorkspaceSheet";
import { useBoard } from "../store/BoardContext";

/**
 * Every app-wide surface mounts here, once, above the navigator — so a sheet opened from
 * any tab covers the tab bar instead of being clipped inside a screen.
 */
export default function TaskSheetHost({ onSignOut }: { onSignOut: () => void }) {
  const {
    data,
    workspaces,
    workspacesLoading,
    loadWorkspaces,
    switchWorkspace,
    createWorkspace,
    renameWorkspace,
    workspaceSheetOpen,
    setWorkspaceSheetOpen,
  } = useBoard();

  useEffect(() => {
    if (workspaceSheetOpen) loadWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceSheetOpen]);

  return (
    <>
      <TaskSheet />
      <NotesSheet />
      <WorkspaceSheet
        visible={workspaceSheetOpen}
        workspaces={workspaces}
        loading={workspacesLoading}
        currentId={data?.workspaceId ?? null}
        onClose={() => setWorkspaceSheetOpen(false)}
        onSwitch={(id) => {
          setWorkspaceSheetOpen(false);
          switchWorkspace(id);
        }}
        onCreate={(name) => {
          setWorkspaceSheetOpen(false);
          createWorkspace(name);
        }}
        onRename={renameWorkspace}
        onSignOut={() => {
          setWorkspaceSheetOpen(false);
          onSignOut();
        }}
      />
    </>
  );
}
