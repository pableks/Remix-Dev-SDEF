import { redirect } from "@remix-run/node";
import { AxiosError, AxiosResponse } from "axios";
import { API } from "~/config/api";
import {
  GetCurrentUserEndpoint,
  LoginEndpoint,
  LogoutEndpoint,
  RefreshAuthToken,
  RegisterUserEndpoint,
  RequestPasswordResetEndpoint,
  SubmitPasswordResetEndpoint,
  VerifyPasswordResetEndpoint,
} from "~/constants/endpoints";
import { LoginPage } from "~/constants/routes";
import { IUser } from "~/interfaces/user";
import { destroySession, getSession } from "~/sessions.server";

export const registerUser = async (data: { user: Partial<IUser> }) =>
  await API.post(RegisterUserEndpoint, data);

export const loginUser = async (data: {
  username: string;
  password: string;
}): Promise<{ data: { access: string; refresh: string } }> =>
  await API.post(LoginEndpoint, data);

export const refreshAuthToken = async (data: { refresh: string }) =>
  await API.post(RefreshAuthToken, data);

export const getCurrentUser = async (
  accessToken: string,
): Promise<AxiosResponse<IUser>> =>
  await API.get(GetCurrentUserEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

export const requestPasswordReset = async (email: FormDataEntryValue) =>
  await API.post(RequestPasswordResetEndpoint, { email });

export const submitPasswordReset = async ({
  password,
  token,
}: {
  password: FormDataEntryValue;
  token: FormDataEntryValue;
}) => await API.post(SubmitPasswordResetEndpoint, { password, token });

export const verifyPasswordResetToken = async (token: string) =>
  await API.get(VerifyPasswordResetEndpoint, {
    params: { token },
  });

export const resetPasswordSubmit = async ({
  token,
  password,
}: {
  token: string;
  password: string;
}) =>
  await API.post(SubmitPasswordResetEndpoint, {
    token,
    password,
  });

export const logoutUser = async (request: Request) => {
  try {
    const session = await getSession(request.headers.get("Cookie"));

    await API.delete(LogoutEndpoint, {
      data: { refresh: session.get("refreshToken") || "" },
    });

    return redirect(LoginPage, {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  } catch (error) {
    return {
      errors: [
        (error as AxiosError<{ error: string }>)?.response?.data?.error ||
          "Failed to logout",
        (error as Error)?.message,
      ],
    };
  }
}; 