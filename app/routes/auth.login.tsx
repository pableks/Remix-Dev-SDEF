import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import { AxiosError } from "axios";
import { loginUser } from "~/apis/user";
import { LoginForm } from "~/components/auth/login-form";
import { DashboardPage } from "~/constants/routes";
import { commitSession, getSession } from "~/sessions.server";
import { isLoggedIn } from "~/auth/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  if (await isLoggedIn(request)) return redirect(DashboardPage);
  return null;
}

export default function LoginPage() {
  const actionData = useActionData<{ errors: string[] }>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="w-full max-w-sm">
        {actionData?.errors && actionData.errors.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-red-800 dark:text-red-200 text-sm">
              {actionData.errors.filter(Boolean).join(". ")}
            </p>
          </div>
        )}
        <LoginForm />
      </div>
    </div>
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  try {
    const response = await loginUser({ username, password });

    const session = await getSession();
    session.set("accessToken", response.data.access);
    session.set("refreshToken", response.data.refresh);

    return redirect(DashboardPage, {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (err: unknown) {
    console.log(err);
    return {
      errors: [
        (err as AxiosError<{ error: unknown }>)?.response?.data?.error ||
        (err as AxiosError<{ detail: unknown }>)?.response?.data?.detail ||
        "Error al iniciar sesión. Por favor verifica tus credenciales.",
      ].filter(Boolean),
    };
  }
} 