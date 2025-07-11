import { Form } from "@remix-run/react";
import { LoginPage } from "~/constants/routes";
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

export function SignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
          <CardDescription>
            Registra una nueva cuenta en el sistema SDEF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="POST">
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  name="username"
                  type="text"
                  placeholder="mi_usuario"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  name="email"
                  type="email"
                  placeholder="usuario@sdef.cl"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  name="firstName"
                  type="text"
                  placeholder="Juan"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  name="lastName"
                  type="text"
                  placeholder="Pérez"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input name="password" type="password" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <Input name="confirmPassword" type="password" required />
              </div>
              <Button type="submit" className="w-full">
                Crear Cuenta
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              ¿Ya tienes una cuenta?{" "}
              <a href={LoginPage} className="underline underline-offset-4">
                Iniciar Sesión
              </a>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 