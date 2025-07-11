import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import { useState } from "react";
import { ClientOnly } from "remix-utils/client-only";
import { logoutUser } from "~/apis/user";
import MapComponent from "~/components/MapComponent";
import { AppSidebar } from "~/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";
import { LoginPage } from "~/constants/routes";
import { commitSession, getSession } from "~/sessions.server";
import { isUserLoggedIn } from "~/auth/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await isUserLoggedIn(request);
  if (user) return { user };

  const session = await getSession(request.headers.get("Cookie"));
  session.flash("error", "Acceso denegado. Debes iniciar sesión.");
  return redirect(LoginPage, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
};

const MapPage = () => {
  const actionData = useActionData<{ errors: string[] }>();
  const [isInsetVariant, setIsInsetVariant] = useState(true);

  return (
    <SidebarProvider 
      defaultOpen={false}
      style={
        {
          "--header-height": "calc(var(--spacing) * 20)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant={isInsetVariant ? "inset" : "sidebar"} />
      <SidebarInset className={isInsetVariant ? "rounded-lg shadow-lg m-2 ml-0 overflow-hidden" : ""}>
        <div className={`relative ${isInsetVariant ? "h-[calc(100vh-1rem)]" : "h-screen"}`}>
          <ClientOnly fallback={<div className="h-screen w-full bg-gray-100 flex items-center justify-center">Cargando mapa...</div>}>
            {() => <MapComponent isInsetVariant={isInsetVariant} setIsInsetVariant={setIsInsetVariant} showBackButton={true} />}
          </ClientOnly>
        </div>
      </SidebarInset>
      
      {actionData?.errors && (
        <div className="fixed top-4 right-4 p-4 bg-red-50 border border-red-200 rounded-md shadow-lg z-50">
          <p className="text-red-800 text-sm">
            {actionData?.errors?.join(". ")}
          </p>
        </div>
      )}
    </SidebarProvider>
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return await logoutUser(request);
};

export default MapPage; 