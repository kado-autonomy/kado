import { useState, useCallback } from "react";
import { FolderOpen } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

interface ProjectStepProps {
  onNext: () => void;
  onBack?: () => void;
}

export function ProjectStep({ onNext }: ProjectStepProps) {
  const { updateSettings } = useSettings();
  const [projectPath, setProjectPath] = useState("");

  const handleBrowse = useCallback(async () => {
    const result = await window.kado.dialog.openDirectory();
    if (result.success && result.data) {
      setProjectPath(result.data);
    }
  }, []);

  const handleSaveAndNext = useCallback(async () => {
    if (projectPath.trim()) {
      await updateSettings({ projectPath: projectPath.trim() });
    }
    onNext();
  }, [projectPath, updateSettings, onNext]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Open a Project</h2>
        <p className="text-sm text-muted-foreground-2">
          Choose a folder to work with. Kado will have access to your codebase to help you build.
        </p>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={projectPath}
          onChange={(e) => setProjectPath(e.target.value)}
          placeholder="/path/to/your/project"
          className="flex-1 rounded-lg border border-line-2 bg-surface/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all duration-150"
        />
        <button
          type="button"
          onClick={handleBrowse}
          className="flex items-center gap-2 rounded-lg border border-line-2 bg-surface/30 px-3 py-2 text-sm text-muted-foreground-2 hover:bg-layer-hover hover:text-foreground transition-colors duration-150"
        >
          <FolderOpen className="h-4 w-4" />
          Browse
        </button>
      </div>
      {projectPath && (
        <button
          type="button"
          onClick={handleSaveAndNext}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors duration-150 shadow-sm shadow-primary/20"
        >
          Open Project & Continue
        </button>
      )}
    </div>
  );
}
