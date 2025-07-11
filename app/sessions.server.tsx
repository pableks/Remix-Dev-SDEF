import { createCookieSessionStorage } from "@remix-run/node"
import { createThemeSessionResolver } from "remix-themes"

// You can default to 'development' if process.env.NODE_ENV is not set
const isProduction = process.env.NODE_ENV === "production"

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "theme",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secrets: ["s3cr3t"],

  },
})

export const themeSessionResolver = createThemeSessionResolver(sessionStorage)

type SessionData = {
  accessToken: string;
  refreshToken: string;
};

type SessionFlashData = {
  error: string;
};

export const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: "__session",
      domain: process.env.DOMAIN,
      httpOnly: true,
      maxAge: Number(process.env.SESSION_COOKIE_MAX_AGE) || 86400,
      path: "/",
      sameSite: "lax",
      secrets: [process.env.SESSION_SECRET || "default-secret"],
      secure: false,
    },
  }); 