import React from "react";
import { ModalShell } from "../../../shared/ui";

/** One predictable surface for all lead operations: fixed footer, scrollable form, focus trap. */
export default function LeadModalShell(props: React.ComponentProps<typeof ModalShell>) {
  return <ModalShell {...props} placement="right" maxWidthClassName="max-w-[560px]"
    heightClassName="h-[100dvh]" bodyClassName="bg-white px-5 py-5 sm:px-6" />;
}
