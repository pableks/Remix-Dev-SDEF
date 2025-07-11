import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { LoginPage, DashboardPage } from "~/constants/routes";
import { isLoggedIn } from "~/auth/utils";

export const meta: MetaFunction = () => {
  return [
    { title: "SDEF - Sistema de Despacho de Emergencias Forestales" },
    { name: "description", content: "Sistema de gestión de emergencias forestales" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  if (await isLoggedIn(request)) {
    return redirect(DashboardPage);
  }
  return redirect(LoginPage);
}

export default function Index() {
  // This component will never render because loader always redirects
  return null;
}


