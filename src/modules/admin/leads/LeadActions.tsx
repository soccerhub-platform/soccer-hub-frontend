import React from "react";
import { LeadAction } from "./types";
import { buttonStyles } from "../../../shared/ui/buttonStyles";

interface LeadActionsProps {
  actions: LeadAction[];
  onAction: (action: LeadAction) => void;
  loadingActionType?: string | null;
  className?: string;
}

const LeadActions: React.FC<LeadActionsProps> = ({
  actions,
  onAction,
  loadingActionType = null,
  className = "",
}) => {
  if (!actions.length) {
    return null;
  }

  const primaryAction = actions.find((action) => action.primary) ?? null;
  const secondaryActions = actions.filter((action) => action !== primaryAction);
  const secondaryGridClassName =
    secondaryActions.length === 1 ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 gap-2";

  const getVariant = (action: LeadAction) => {
    if (action.danger) {
      return action.primary ? "softDanger" : "danger";
    }

    return action.primary ? "primary" : "secondary";
  };

  const renderLabel = (action: LeadAction) =>
    loadingActionType === action.type ? "Сохранение..." : action.label;

  const getTooltip = (action: LeadAction) =>
    action.enabled ? undefined : "Лид закреплён за другим администратором";

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {primaryAction ? (
        <button
          type="button"
          onClick={() => onAction(primaryAction)}
          disabled={Boolean(loadingActionType) || !primaryAction.enabled}
          title={getTooltip(primaryAction)}
          className={buttonStyles(
            getVariant(primaryAction),
            "sm",
            "h-9 w-full rounded-xl justify-center px-3 text-center whitespace-nowrap disabled:opacity-50"
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
                "h-9 w-full rounded-xl justify-center px-3 text-center whitespace-nowrap disabled:opacity-50"
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
