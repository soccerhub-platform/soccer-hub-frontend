import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Button from "./Button";
import { buttonStyles } from "./buttonStyles";

describe("button styles after Tailwind migration", () => {
  it.each(["soft", "softDanger"] as const)("keeps the outline component variant for %s", (variant) => {
    const classes = buttonStyles(variant);
    expect(classes.split(" ")).toContain("border");
    expect(classes).toContain("focus-visible:outline-hidden");
    expect(classes).not.toContain("outline-solid");
    const markup = renderToStaticMarkup(createElement(Button, { variant }, "Action"));
    expect(markup).toContain("border");
    expect(markup).not.toContain("outline-solid");
  });
});
