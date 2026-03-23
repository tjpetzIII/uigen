// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresIn = "7d") {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- createSession ---

test("createSession sets an httpOnly cookie with a JWT", async () => {
  await createSession("user-1", "test@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [name, token, options] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(typeof token).toBe("string");
  expect(token.split(".")).toHaveLength(3); // valid JWT format
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession JWT contains userId and email", async () => {
  await createSession("user-42", "hello@example.com");

  const [, token] = mockCookieStore.set.mock.calls[0];
  const [, payloadB64] = token.split(".");
  const payload = JSON.parse(atob(payloadB64));
  expect(payload.userId).toBe("user-42");
  expect(payload.email).toBe("hello@example.com");
});

// --- getSession ---

test("getSession returns null when no cookie is present", async () => {
  mockCookieStore.get.mockReturnValue(undefined);
  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns null for an invalid token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });
  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns null for an expired token", async () => {
  const token = await makeToken({ userId: "u1", email: "a@b.com" }, "-1s");
  mockCookieStore.get.mockReturnValue({ value: token });
  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns session payload for a valid token", async () => {
  const token = await makeToken({
    userId: "user-1",
    email: "test@example.com",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();
  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("test@example.com");
});

// --- deleteSession ---

test("deleteSession removes the auth-token cookie", async () => {
  await deleteSession();
  expect(mockCookieStore.delete).toHaveBeenCalledOnce();
  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});

// --- verifySession ---

function makeRequest(cookieValue?: string): NextRequest {
  const headers = new Headers();
  if (cookieValue) {
    headers.set("cookie", `auth-token=${cookieValue}`);
  }
  return new NextRequest("http://localhost/", { headers });
}

test("verifySession returns null when no cookie is present", async () => {
  const req = makeRequest();
  const session = await verifySession(req);
  expect(session).toBeNull();
});

test("verifySession returns null for an invalid token", async () => {
  const req = makeRequest("not.a.valid.jwt");
  const session = await verifySession(req);
  expect(session).toBeNull();
});

test("verifySession returns null for an expired token", async () => {
  const token = await makeToken({ userId: "u1", email: "a@b.com" }, "-1s");
  const req = makeRequest(token);
  const session = await verifySession(req);
  expect(session).toBeNull();
});

test("verifySession returns session payload for a valid token", async () => {
  const token = await makeToken({
    userId: "user-99",
    email: "verify@example.com",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  const req = makeRequest(token);

  const session = await verifySession(req);
  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-99");
  expect(session?.email).toBe("verify@example.com");
});
