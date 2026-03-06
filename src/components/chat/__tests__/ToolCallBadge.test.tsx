import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getToolCallLabel } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// --- getToolCallLabel unit tests ---

test("getToolCallLabel: str_replace_editor create", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating /App.jsx");
});

test("getToolCallLabel: str_replace_editor str_replace", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path: "/App.jsx" })).toBe("Editing /App.jsx");
});

test("getToolCallLabel: str_replace_editor insert", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "insert", path: "/src/Button.tsx" })).toBe("Editing /src/Button.tsx");
});

test("getToolCallLabel: str_replace_editor view", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Reading /App.jsx");
});

test("getToolCallLabel: str_replace_editor unknown command falls back to Editing", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Editing /App.jsx");
});

test("getToolCallLabel: file_manager rename", () => {
  expect(getToolCallLabel("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" })).toBe("Renaming /old.jsx → /new.jsx");
});

test("getToolCallLabel: file_manager delete", () => {
  expect(getToolCallLabel("file_manager", { command: "delete", path: "/App.jsx" })).toBe("Deleting /App.jsx");
});

test("getToolCallLabel: unknown tool returns tool name", () => {
  expect(getToolCallLabel("some_other_tool", {})).toBe("some_other_tool");
});

// --- ToolCallBadge rendering tests ---

test("ToolCallBadge shows friendly label for create command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
      result="ok"
    />
  );
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("ToolCallBadge shows friendly label for str_replace command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/components/Card.jsx" }}
      state="result"
      result="ok"
    />
  );
  expect(screen.getByText("Editing /components/Card.jsx")).toBeDefined();
});

test("ToolCallBadge shows green dot when state is result with result", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
      result="ok"
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
});

test("ToolCallBadge shows spinner when state is call", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolCallBadge shows spinner when state is result but result is undefined", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolCallBadge shows file_manager delete label", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/old.jsx" }}
      state="result"
      result={{ success: true }}
    />
  );
  expect(screen.getByText("Deleting /old.jsx")).toBeDefined();
});

test("ToolCallBadge shows file_manager rename label", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/old.jsx", new_path: "/new.jsx" }}
      state="result"
      result={{ success: true }}
    />
  );
  expect(screen.getByText("Renaming /old.jsx → /new.jsx")).toBeDefined();
});
