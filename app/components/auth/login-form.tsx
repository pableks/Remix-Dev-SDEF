import { Form } from "@remix-run/react";
import { ForgotPasswordPage, SignUpPage } from "~/constants/routes";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tu usuario o email para acceder al sistema SDEF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="POST">
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="username">Usuario / Email</Label>
                <Input
                  name="username"
                  type="text"
                  placeholder="usuario@sdef.cl"
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Contraseña</Label>
                  <a
                    href={ForgotPasswordPage}
                    className="ml-auto inline-block text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <Input name="password" type="password" required />
              </div>
              <Button type="submit" className="w-full">
                Ingresar
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 