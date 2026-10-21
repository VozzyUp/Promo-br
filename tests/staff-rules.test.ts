import { describe, expect, it } from "vitest";
import { canActOn } from "../lib/staff-rules";

describe("canActOn", () => {
  it("moderador só mexe em usuário comum", () => {
    expect(canActOn("moderator", "user")).toBe(true);
    expect(canActOn("moderator", "moderator")).toBe(false);
    expect(canActOn("moderator", "admin")).toBe(false);
  });
  it("admin mexe em usuário e moderador, não em outro admin", () => {
    expect(canActOn("admin", "user")).toBe(true);
    expect(canActOn("admin", "moderator")).toBe(true);
    expect(canActOn("admin", "admin")).toBe(false);
  });
  it("ninguém mexe no usuário do sistema", () => {
    expect(canActOn("admin", "system")).toBe(false);
  });
});