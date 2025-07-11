import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import { AxiosError } from "axios";
import { registerUser } from "~/apis/user";
import { SignupForm } from "~/components/auth/signup-form";
import { LoginPage, DashboardPage } from "~/constants/routes";
import { isLoggedIn } from "~/auth/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  if (await isLoggedIn(request)) return redirect(DashboardPage);
  return null;
}

export default function SignupPage() {
  const actionData = useActionData<{ errors?: string[]; success?: boolean }>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-100 p-6">
      <div className="w-full max-w-sm">
        {actionData?.errors && actionData.errors.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">
              {actionData.errors.filter(Boolean).join(". ")}
            </p>
          </div>
        )}
        {actionData?.success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-sm">
              Cuenta creada exitosamente. <a href={LoginPage} className="underline">Iniciar sesión</a>
            </p>
          </div>
        )}
        <SignupForm />
      </div>
    </div>
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;

  // Basic validation
  if (password !== confirmPassword) {
    return {
      errors: ["Las contraseñas no coinciden"],
    };
  }

  try {
    await registerUser({
      user: {
        username,
        email,
        password,
        firstName,
        lastName,
      },
    });

    return { success: true };
  } catch (err: unknown) {
    console.log(err);
    return {
      errors: [
        (err as AxiosError<{ error: unknown }>)?.response?.data?.error ||
        (err as AxiosError<{ detail: unknown }>)?.response?.data?.detail ||
        "Error al crear la cuenta. Por favor intenta nuevamente.",
      ].filter(Boolean),
    };
  }
} 