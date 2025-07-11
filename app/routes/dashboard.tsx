import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { useActionData, useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { logoutUser } from "~/apis/user";
import LogoutButton from "~/components/auth/logout-button";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ModeToggle } from "~/components/mode-toggle";
import { LoginPage, MapPage, DispatchPage } from "~/constants/routes";
import { IUser } from "~/interfaces/user";
import { commitSession, getSession } from "~/sessions.server";
import { isUserLoggedIn } from "~/auth/utils";
import { MapPin, AlertTriangle, Cloud, Flame } from "lucide-react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await isUserLoggedIn(request);
  if (user) return { user };

  const session = await getSession(request.headers.get("Cookie"));
  session.flash("error", "Acceso denegado. Debes iniciar sesión.");
  return redirect(LoginPage, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
};

const Dashboard = () => {
  const { user } = useLoaderData<{ user: IUser }>();
  const actionData = useActionData<{ errors: string[] }>();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'menu' | 'dispatch' | 'conditions' | 'incidents'>('menu');

  const menuOptions = [
    {
      id: 'map',
      title: 'Explorar Mapa',
      description: 'Visualiza incendios forestales y recursos de emergencia',
      icon: <MapPin className="h-8 w-8 text-orange-200 dark:text-orange-300" />,
      color: 'from-orange-500 to-red-600',
      implemented: true
    },
    {
      id: 'dispatch',
      title: 'Asistente de Despacho', 
      description: 'Gestiona recursos de emergencia y equipos',
      icon: <AlertTriangle className="h-8 w-8 text-blue-200 dark:text-blue-300" />,
      color: 'from-blue-500 to-indigo-600',
      implemented: true
    },
    {
      id: 'conditions',
      title: 'Condiciones Actuales',
      description: 'Monitorea condiciones meteorológicas y de riesgo',
      icon: <Cloud className="h-8 w-8 text-green-200 dark:text-green-300" />,
      color: 'from-green-500 to-emerald-600',
      implemented: false
    },
    {
      id: 'incidents',
      title: 'Incendios',
      description: 'Visualiza y gestiona incidentes activos',
      icon: <Flame className="h-8 w-8 text-red-200 dark:text-red-300" />,
      color: 'from-red-500 to-pink-600',
      implemented: false
    }
  ];

  const handleMenuClick = (optionId: string) => {
    if (optionId === 'map') {
      navigate(MapPage);
    } else if (optionId === 'dispatch') {
      navigate(DispatchPage);
    } else {
      // For non-implemented features, just show a placeholder
      setCurrentView(optionId as any);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dispatch':
      case 'conditions':
      case 'incidents':
        const option = menuOptions.find(opt => opt.id === currentView);
        return (
          <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-900 dark:to-gray-800 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <Button 
                  onClick={() => setCurrentView('menu')} 
                  variant="outline"
                >
                  ← Volver al Menú
                </Button>
                <div className="flex items-center gap-2">
                  <ModeToggle />
                  <LogoutButton />
                </div>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {option?.icon}
                    {option?.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Esta funcionalidad estará disponible próximamente.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-900 dark:to-gray-800 p-6">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border dark:border-gray-700">
                    <Flame className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">SDEF</h1>
                    <p className="text-gray-600 dark:text-gray-400">Sistema de Despacho de Emergencias Forestales</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Bienvenido, Usuario</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{user.firstName || user.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ModeToggle />
                    <LogoutButton />
                  </div>
                </div>
              </div>

              {/* Menu Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {menuOptions.map((option) => (
                  <Card 
                    key={option.id}
                    className={`cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg border-border dark:border-gray-700 ${
                      option.implemented ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50' : 'opacity-75'
                    }`}
                    onClick={() => handleMenuClick(option.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg bg-gradient-to-r ${option.color} bg-opacity-10 dark:bg-opacity-20`}>
                          {option.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            {option.title}
                            {!option.implemented && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Próximamente)</span>
                            )}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300 text-sm">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>© 2025 SDEF - Sistema de Despacho de Emergencias Forestales</p>
              </div>

              {actionData?.errors && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-red-800 dark:text-red-200 text-sm">
                    {actionData?.errors?.join(". ")}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return renderContent();
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return await logoutUser(request);
};

export default Dashboard; 