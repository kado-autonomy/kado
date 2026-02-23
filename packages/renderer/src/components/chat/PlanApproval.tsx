import { useState, useCallback } from "react";
import { CheckCircle2, XCircle, Pencil, Coins, Wrench } from "lucide-react";
import clsx from "clsx";

export interface PlanStep {
  id: string;
  description: string;
  tool?: string;
  expectedOutcome?: string;
}

interface PlanApprovalProps {
  steps: PlanStep[];
  estimatedTokenCost?: number;
  onApprove: (selectedStepIds: string[]) => void;
  onModify: (modifiedSteps: PlanStep[]) => void;
  onReject: () => void;
}

export function PlanApproval({
  steps,
  estimatedTokenCost,
  onApprove,
  onModify,
  onReject,
}: PlanApprovalProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(steps.map((s) => s.id))
  );
  const [editMode, setEditMode] = useState(false);
  const [editedSteps, setEditedSteps] = useState<PlanStep[]>(steps);

  const toggleStep = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleEditDescription = useCallback(
    (id: string, description: string) => {
      setEditedSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, description } : s))
      );
    },
    []
  );

  const handleApprove = useCallback(() => {
    onApprove(Array.from(checkedIds));
  }, [checkedIds, onApprove]);

  const handleModifySave = useCallback(() => {
    onModify(editedSteps.filter((s) => checkedIds.has(s.id)));
    setEditMode(false);
  }, [editedSteps, checkedIds, onModify]);

  const displaySteps = editMode ? editedSteps : steps;

  return (
    <div className="my-3 rounded-xl border border-card-line bg-card overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-card-divider bg-surface/30">
        <h3 className="text-sm font-semibold text-foreground">
          Proposed Plan
        </h3>
        {estimatedTokenCost != null && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Coins className="w-3.5 h-3.5" />
            ~{estimatedTokenCost.toLocaleString()} tokens
          </span>
        )}
      </div>

      <ol className="divide-y divide-card-divider/50">
        {displaySteps.map((step, idx) => {
          const checked = checkedIds.has(step.id);
          return (
            <li key={step.id} className="flex gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => toggleStep(step.id)}
                className={clsx(
                  "mt-0.5 flex-shrink-0 w-5 h-5 rounded border transition-colors flex items-center justify-center",
                  checked
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-line-3 bg-surface/50 text-transparent"
                )}
                aria-label={`Step ${idx + 1}: ${checked ? "selected" : "deselected"}`}
              >
                {checked && (
                  <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current">
                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-mono text-muted-foreground mt-0.5 select-none">
                    {idx + 1}.
                  </span>
                  {editMode ? (
                    <input
                      type="text"
                      value={editedSteps.find((s) => s.id === step.id)?.description ?? step.description}
                      onChange={(e) =>
                        handleEditDescription(step.id, e.target.value)
                      }
                      className="flex-1 bg-background border border-line-2 rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                    />
                  ) : (
                    <span
                      className={clsx(
                        "text-sm",
                        checked ? "text-foreground" : "text-muted-foreground line-through"
                      )}
                    >
                      {step.description}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 ml-5">
                  {step.tool && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Wrench className="w-3 h-3" />
                      {step.tool}
                    </span>
                  )}
                  {step.expectedOutcome && (
                    <span className="text-xs text-muted-foreground italic truncate">
                      → {step.expectedOutcome}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-card-divider bg-surface/20">
        <button
          type="button"
          onClick={onReject}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 border border-destructive/30 transition-colors duration-150"
        >
          <XCircle className="w-4 h-4" />
          Reject
        </button>

        {editMode ? (
          <button
            type="button"
            onClick={handleModifySave}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-foreground hover:bg-layer-hover border border-line-2 transition-colors duration-150"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save Changes
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-foreground hover:bg-layer-hover border border-line-2 transition-colors duration-150"
          >
            <Pencil className="w-4 h-4" />
            Modify
          </button>
        )}

        <button
          type="button"
          onClick={handleApprove}
          disabled={checkedIds.size === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-foreground bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          Approve Plan
        </button>
      </div>
    </div>
  );
}
