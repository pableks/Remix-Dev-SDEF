import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { useActionData, Form } from "@remix-run/react";
import { AxiosError } from "axios";
import { requestPasswordReset } from "~/apis/user";
import { LoginPage, DashboardPage } from "~/constants/routes";
import { isLoggedIn } from "~/auth/utils";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export async function loader({ request }: LoaderFunctionArgs) {
  if (await isLoggedIn(request)) return redirect(DashboardPage);
  return null;
}

export default function ForgotPasswordPage() {
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
              Si el email existe en nuestro sistema, recibirás instrucciones para restablecer tu contraseña.
            </p>
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
            <CardDescription>
              Ingresa tu email para recibir instrucciones de recuperación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="POST">
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="usuario@sdef.cl"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Enviar Instrucciones
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                ¿Recordaste tu contraseña?{" "}
                <a href={LoginPage} className="underline underline-offset-4">
                  Iniciar Sesión
                </a>
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");

  try {
    await requestPasswordReset(email);
    return { success: true };
  } catch (err: unknown) {
    console.log(err);
    return {
      errors: [
        (err as AxiosError<{ error: unknown }>)?.response?.data?.error ||
        (err as AxiosError<{ detail: unknown }>)?.response?.data?.detail ||
        "Error al procesar la solicitud. Por favor intenta nuevamente.",
      ].filter(Boolean),
    };
  }
} 