import React from "react";
import { LeadAction } from "./types";
import { buttonStyles } from "../../../shared/ui/buttonStyles";

interface LeadActionsProps {
  actions: LeadAction[];
  onAction: (action: LeadAction) => void;
  loadingActionType?: string | null;
  className?: string;
  layout?: "stack" | "toolbar";
}

const LeadActions: React.FC<LeadActionsProps> = ({
  actions,
  onAction,
  loadingActionType = null,
  className = "",
  layout = "stack",
}) => {
  if (!actions.length) {
    return null;
  }

  const primaryAction = actions.find((action) => action.primary) ?? null;
  const secondaryActions = actions.filter((action) => action !== primaryAction);
  const secondaryGridClassName =
    layout === "toolbar" ? "flex flex-wrap gap-2" : "grid grid-cols-1 gap-2";

  const getVariant = (action: LeadAction) => {
    if (action.danger) {
      return "softDanger";
    }

    return action.primary ? "primary" : "secondary";
  };

  const renderLabel = (action: LeadAction) =>
    loadingActionType === action.type ? "Сохранение..." : action.label;

  const getTooltip = (action: LeadAction) =>
    action.enabled ? undefined : "Сначала заполните необходимые данные лида";

  return (
    <div className={`${layout === "toolbar" ? "flex flex-wrap items-center gap-2" : "flex flex-col gap-2"} ${className}`.trim()}>
      {primaryAction ? (
        <button
          type="button"
          onClick={() => onAction(primaryAction)}
          disabled={Boolean(loadingActionType) || !primaryAction.enabled}
          title={getTooltip(primaryAction)}
          className={buttonStyles(
            getVariant(primaryAction),
            "sm",
            `min-h-9 h-auto ${layout === "toolbar" ? "w-auto" : "w-full"} rounded-lg justify-center px-3 py-2 text-center whitespace-normal disabled:opacity-50`
          )}
        >
          {renderLabel(primaryAction)}
        </button>
      ) : null}

      {secondaryActions.length > 0 ? (
        <div className={secondaryGridClassName}>
          {secondaryActions.map((action) => (
            <button
              key={action.type}
              type="button"
              onClick={() => onAction(action)}
              disabled={Boolean(loadingActionType) || !action.enabled}
              title={getTooltip(action)}
              className={buttonStyles(
                getVariant(action),
                "sm",
                `min-h-9 h-auto ${layout === "toolbar" ? "w-auto" : "w-full"} rounded-lg justify-center px-3 py-2 text-center whitespace-normal disabled:opacity-50`
              )}
            >
              {renderLabel(action)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default LeadActions;
