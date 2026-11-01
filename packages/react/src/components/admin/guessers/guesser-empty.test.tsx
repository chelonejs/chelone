import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { GuesserEmpty } from "./guesser-empty";

afterEach(cleanup);

function Wrap({
  messages,
  children,
}: {
  messages?: Record<string, string>;
  children: ReactNode;
}) {
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={createI18n({
        locale: "en",
        messages: { en: defineMessages(messages ?? {}) },
      })}
    >
      {children}
    </CheloneProvider>
  );
}

describe("GuesserEmpty", () => {
  it("shows the no-schema title and message with the resource name", () => {
    render(
      <Wrap>
        <GuesserEmpty resource="posts" />
      </Wrap>,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "No schema registered" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Register a Zod schema for posts with defineResources so this page can be generated.",
      ),
    ).toBeTruthy();
  });

  it("translates the default title and message", () => {
    render(
      <Wrap
        messages={{
          "chelone.guesser.no_schema.title": "Aucun schéma",
          "chelone.guesser.no_schema.message": "Déclarez {resource}",
        }}
      >
        <GuesserEmpty resource="posts" />
      </Wrap>,
    );
    expect(screen.getByRole("heading", { name: "Aucun schéma" })).toBeTruthy();
    expect(screen.getByText("Déclarez posts")).toBeTruthy();
  });

  it("translates a custom title and message string", () => {
    render(
      <Wrap messages={{ "my.title": "Titre", "my.message": "Message" }}>
        <GuesserEmpty title="my.title" message="my.message" />
        <GuesserEmpty title="Plain title" message="Plain message" />
      </Wrap>,
    );
    expect(screen.getByRole("heading", { name: "Titre" })).toBeTruthy();
    expect(screen.getByText("Message")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Plain title" })).toBeTruthy();
    expect(screen.getByText("Plain message")).toBeTruthy();
  });

  it("renders a custom title element as given", () => {
    render(
      <Wrap>
        <GuesserEmpty
          title={<em data-testid="custom-title">Nothing here</em>}
          message={<strong data-testid="custom-message">Add a schema</strong>}
        />
      </Wrap>,
    );
    const title = screen.getByTestId("custom-title");
    expect(title.textContent).toBe("Nothing here");
    expect(title.closest("h2")).not.toBeNull();
    expect(screen.getByTestId("custom-message").closest("p")).not.toBeNull();
  });
});
