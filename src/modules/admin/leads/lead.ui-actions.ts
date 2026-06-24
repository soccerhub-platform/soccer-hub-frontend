import { Lead, LeadAction, LeadLossStage } from "./types";

const action = (
  type: LeadAction["type"],
  label: string,
  primary: boolean
): LeadAction => ({
  type,
  label,
  primary,
  danger: false,
  enabled: true,
});

const MODERN_ACTION_TYPES = new Set<LeadAction["type"]>([
  "CONTACT_LEAD",
  "QUALIFY_LEAD",
  "RESCHEDULE_TRIAL",
  "CONVERT_TO_CONTRACT",
  "ADD_PAYMENT",
  "MARK_TRIAL_DONE",
  "MARK_NO_SHOW",
  "CANCEL_TRIAL",
  "CLOSE_LEAD",
]);

export const buildLeadUiActions = (
  lead: Lead,
  rawActions: LeadAction[],
  isAlreadyConverted = Boolean(
    lead.status === "WON" ||
      lead.clientId ||
      lead.playerId ||
      lead.contractId ||
      lead.contract?.contractId
  )
): LeadAction[] => {
  const actions = rawActions.filter((item) => item.type !== "CONFIRM_PAYMENT");
  const hasModernActions = actions.some((item) => MODERN_ACTION_TYPES.has(item.type));

  if (hasModernActions) {
    return actions.filter((item) => !(isAlreadyConverted && item.type === "CONVERT_TO_CONTRACT"));
  }

  if (lead.status === "TRIAL_DONE" && !isAlreadyConverted) {
    return [
      action("CONVERT", "Оформить договор", true),
      ...actions.filter((item) => item.type !== "REQUEST_PAYMENT" && item.type !== "CONVERT"),
    ];
  }

  if (lead.status === "WAITING_PAYMENT" && (lead.contractId || lead.contract?.contractId)) {
    return [
      action("ADD_PAYMENT", "Добавить оплату", true),
      action("OPEN_CONTRACT", "Открыть договор", false),
      ...actions.filter(
        (item) =>
          item.type !== "REQUEST_PAYMENT" &&
          item.type !== "CONVERT" &&
          item.type !== "ADD_PAYMENT" &&
          item.type !== "OPEN_CONTRACT"
      ),
    ];
  }

  return isAlreadyConverted
    ? actions.filter((item) => item.type !== "CONVERT" && item.type !== "REQUEST_PAYMENT")
    : actions;
};

export const getLeadActionEvent = (action: LeadAction) => {
  if (action.event) return action.event;

  switch (action.type) {
    case "CONTACT_LEAD":
      return "CONTACT";
    case "MARK_TRIAL_DONE":
      return "COMPLETE_TRIAL";
    case "MARK_NO_SHOW":
      return "NO_SHOW";
    case "CANCEL_TRIAL":
      return "CANCEL_TRIAL";
    case "CLOSE_LEAD":
      return "LOST";
    default:
      return action.type;
  }
};

export const isQualifyAction = (action: LeadAction) =>
  action.type === "QUALIFY" || action.type === "QUALIFY_LEAD";

export const isScheduleTrialAction = (action: LeadAction) =>
  action.type === "SCHEDULE_TRIAL" || action.type === "RESCHEDULE_TRIAL";

export const isConvertAction = (action: LeadAction) =>
  action.type === "CONVERT" || action.type === "CONVERT_TO_CONTRACT";

export const isLossAction = (action: LeadAction) =>
  action.type === "REJECT" ||
  action.type === "LOST" ||
  action.type === "NO_SHOW" ||
  action.type === "POST_TRIAL_REJECT" ||
  action.type === "MARK_NO_SHOW" ||
  action.type === "CLOSE_LEAD";

export const getLeadLossStage = (
  action: LeadAction,
  leadStatus?: Lead["status"]
): LeadLossStage => {
  if (action.type === "MARK_NO_SHOW" || action.type === "NO_SHOW") {
    return "TRIAL_NO_SHOW";
  }

  if (action.type === "POST_TRIAL_REJECT") {
    return "POST_TRIAL_REJECT";
  }

  if (leadStatus === "WAITING_PAYMENT") {
    return "PAYMENT_REJECT";
  }

  if (leadStatus === "TRIAL_DONE") {
    return "POST_TRIAL_REJECT";
  }

  return "PRE_QUALIFICATION";
};
