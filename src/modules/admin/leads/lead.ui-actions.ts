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
  "RESCHEDULE_TRIAL",
  "CONVERT_TO_CLIENT",
  "MARK_TRIAL_DONE",
  "MARK_NO_SHOW",
  "CANCEL_TRIAL",
  "CLOSE_LEAD",
  "CREATE_CONTRACT",
  "RECORD_PAYMENT",
]);

export const getConvertibleParticipants = (
  lead: Pick<Lead, "participants">
) =>
  lead.participants.filter(
    (participant) => !participant.playerId
  );

export const getConvertedParticipants = (
  lead: Pick<Lead, "participants">
) =>
  lead.participants.filter(
    (participant) => Boolean(participant.playerId)
  );

export const buildLeadUiActions = (
  lead: Lead,
  rawActions: LeadAction[]
): LeadAction[] => {
  const actions = rawActions;
  const hasConvertibleParticipants =
    getConvertibleParticipants(lead).length > 0;

  const hasModernActions = actions.some((item) =>
    MODERN_ACTION_TYPES.has(item.type)
  );

  if (hasModernActions) {
    return actions.filter(
      (item) =>
        !(
          item.type === "CONVERT_TO_CLIENT" &&
          !hasConvertibleParticipants
        )
    );
  }

  if (
    (lead.status === "IN_PROGRESS" ||
      lead.status === "DECISION_PENDING") &&
    hasConvertibleParticipants
  ) {
    return [
      action(
        "CONVERT",
        lead.status === "IN_PROGRESS"
          ? "Оформить без пробного"
          : "Оформить ребёнка",
        true
      ),
      ...actions.filter((item) => item.type !== "CONVERT"),
    ];
  }

  return actions.filter(
    (item) => item.type !== "CONVERT"
  );
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
  action.type === "QUALIFY";

export const isScheduleTrialAction = (action: LeadAction) =>
  action.type === "SCHEDULE_TRIAL" || action.type === "RESCHEDULE_TRIAL";

export const isConvertAction = (action: LeadAction) =>
  action.type === "CONVERT" || action.type === "CONVERT_TO_CLIENT";

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

  if (leadStatus === "DECISION_PENDING") {
    return "POST_TRIAL_REJECT";
  }

  return "PRE_QUALIFICATION";
};
