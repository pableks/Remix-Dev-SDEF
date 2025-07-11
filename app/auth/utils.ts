import { Session } from "@remix-run/node";
import { AxiosError } from "axios";
import { getCurrentUser, refreshAuthToken } from "~/apis/user";
import { commitSession, getSession } from "~/sessions.server";

export const isLoggedIn = async (request: Request) => {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.get("accessToken")) return false;

  try {
    await getCurrentUser(session.get("accessToken") || "");
    return true;
  } catch (error) {
    if (isAccessTokenExpired(error as AxiosError<{ code: string }>))
      return requestNewAccessToken(session);
    return false;
  }
};

export const isUserLoggedIn = async (request: Request) => {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.get("accessToken")) return false;

  try {
    const response = await getCurrentUser(session.get("accessToken") || "");
    return response.data;
  } catch (error) {
    if (isAccessTokenExpired(error as AxiosError<{ code: string }>))
      return requestNewAccessToken(session, true);
    return false;
  }
};

export const requestNewAccessToken = async (
  session: Session,
  withUser = false,
) => {
  try {
    const response = await refreshAuthToken({
      refresh: session.get("refreshToken") || "",
    });

    session.set("accessToken", response.data.access);
    await commitSession(session);

    if (withUser) {
      const response = await getCurrentUser(session.get("accessToken") || "");
      return response.data;
    }

    return true;
  } catch (error) {
    return false;
  }
};

const isAccessTokenExpired = (error: AxiosError<{ code: string }>): boolean =>
  error?.response?.data.code === "token_not_valid"; 