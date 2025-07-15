import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
  json,
} from "@remix-run/node";
import { useActionData, useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { useState, useEffect } from "react";
import { ClientOnly } from "remix-utils/client-only";
import { toast } from "sonner";
import { 
  getIncendios, 
  getIncendiosStats, 
  createIncendio, 
  updateIncendio, 
  updateIncendioStatus, 
  updateIncendioPriority, 
  deleteIncendio,
  exportIncendiosCSV,
  bulkUpdateIncendiosStatus,
  handleIncendioError,
  declareIncendio
} from "~/apis/incendios";
import { AppSidebar } from "~/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";
import { LoginPage } from "~/constants/routes";
import { commitSession, getSession } from "~/sessions.server";
import { isUserLoggedIn } from "~/auth/utils";
import { IIncendio, IIncendioStats, IIncendioCreate, IIncendioUpdate, IIncendioFilters } from "~/interfaces/incendio";
import IncendiosDashboard from "~/components/IncendiosDashboard";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await isUserLoggedIn(request);
  if (!user) {
    const session = await getSession(request.headers.get("Cookie"));
    session.flash("error", "Acceso denegado. Debes iniciar sesión.");
    return redirect(LoginPage, {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }

  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    const filters: IIncendioFilters = {
      estado: searchParams.get('estado') || undefined,
      prioridad: searchParams.get('prioridad') || undefined,
      fecha_desde: searchParams.get('fecha_desde') || undefined,
      fecha_hasta: searchParams.get('fecha_hasta') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
    };

    const [incendiosResponse, statsResponse] = await Promise.all([
      getIncendios(filters),
      getIncendiosStats(),
    ]);

    return json({
      user,
      incendios: incendiosResponse.data,
      total: incendiosResponse.total,
      page: incendiosResponse.page,
      limit: incendiosResponse.limit,
      stats: statsResponse,
      filters,
    });
  } catch (error) {
    console.error("Error loading incendios:", error);
    return json({
      user,
      incendios: [],
      total: 0,
      page: 1,
      limit: 10,
      stats: {
        total_incendios: 0,
        activos: 0,
        controlados: 0,
        extinguidos: 0,
        cancelados: 0,
        superficie_total_afectada: 0,
        por_prioridad: { baja: 0, media: 0, alta: 0, critica: 0 }
      } as IIncendioStats,
      filters: {} as IIncendioFilters,
      error: "Error al cargar los datos de incendios",
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await isUserLoggedIn(request);
  if (!user) {
    return redirect(LoginPage);
  }

  const formData = await request.formData();
  const actionType = formData.get("_action") as string;

  try {
    switch (actionType) {
      case "create": {
        const data: IIncendioCreate = {
          nombre: formData.get("nombre") as string,
          descripcion: formData.get("descripcion") as string,
          latitud: parseFloat(formData.get("latitud") as string),
          longitud: parseFloat(formData.get("longitud") as string),
          fecha_deteccion: formData.get("fecha_deteccion") as string,
          estado: formData.get("estado") as 'activo' | 'controlado' | 'extinguido' | 'cancelado',
          prioridad: formData.get("prioridad") as 'baja' | 'media' | 'alta' | 'critica',
          superficie_afectada: formData.get("superficie_afectada") ? parseFloat(formData.get("superficie_afectada") as string) : undefined,
          causa: formData.get("causa") as string || undefined,
          observaciones: formData.get("observaciones") as string || undefined,
        };
        
        const newIncendio = await createIncendio(data);
        return json({ success: true, incendio: newIncendio, message: "Incendio creado exitosamente" });
      }

      case "declare": {
        const data = {
          latitud: parseFloat(formData.get("latitud") as string),
          longitud: parseFloat(formData.get("longitud") as string),
          nombre: formData.get("nombre") as string,
          descripcion: formData.get("descripcion") as string,
          prioridad: formData.get("prioridad") as 'baja' | 'media' | 'alta' | 'critica',
        };
        
        const result = await declareIncendio(data);
        return json({ 
          success: true, 
          incendio: result.incendio, 
          spatial_analysis: result.spatial_analysis,
          brigade_analysis: result.brigade_analysis,
          message: "Incendio declarado exitosamente con análisis espacial" 
        });
      }

      case "update": {
        const id = parseInt(formData.get("id") as string);
        const data: IIncendioUpdate = {
          nombre: formData.get("nombre") as string || undefined,
          descripcion: formData.get("descripcion") as string || undefined,
          latitud: formData.get("latitud") ? parseFloat(formData.get("latitud") as string) : undefined,
          longitud: formData.get("longitud") ? parseFloat(formData.get("longitud") as string) : undefined,
          fecha_deteccion: formData.get("fecha_deteccion") as string || undefined,
          estado: formData.get("estado") as 'activo' | 'controlado' | 'extinguido' | 'cancelado' || undefined,
          prioridad: formData.get("prioridad") as 'baja' | 'media' | 'alta' | 'critica' || undefined,
          superficie_afectada: formData.get("superficie_afectada") ? parseFloat(formData.get("superficie_afectada") as string) : undefined,
          causa: formData.get("causa") as string || undefined,
          observaciones: formData.get("observaciones") as string || undefined,
        };
        
        const updatedIncendio = await updateIncendio(id, data);
        return json({ success: true, incendio: updatedIncendio, message: "Incendio actualizado exitosamente" });
      }

      case "updateStatus": {
        const id = parseInt(formData.get("id") as string);
        const estado = formData.get("estado") as 'activo' | 'controlado' | 'extinguido' | 'cancelado';
        
        const updatedIncendio = await updateIncendioStatus(id, estado);
        return json({ success: true, incendio: updatedIncendio, message: "Estado actualizado exitosamente" });
      }

      case "updatePriority": {
        const id = parseInt(formData.get("id") as string);
        const prioridad = formData.get("prioridad") as 'baja' | 'media' | 'alta' | 'critica';
        
        const updatedIncendio = await updateIncendioPriority(id, prioridad);
        return json({ success: true, incendio: updatedIncendio, message: "Prioridad actualizada exitosamente" });
      }

      case "delete": {
        const id = parseInt(formData.get("id") as string);
        
        await deleteIncendio(id);
        return json({ success: true, message: "Incendio eliminado exitosamente" });
      }

      case "bulkUpdateStatus": {
        const ids = JSON.parse(formData.get("ids") as string) as number[];
        const estado = formData.get("estado") as 'activo' | 'controlado' | 'extinguido' | 'cancelado';
        
        const result = await bulkUpdateIncendiosStatus(ids, estado);
        return json({ 
          success: true, 
          updated_count: result.updated_count,
          message: `${result.updated_count} incendios actualizados exitosamente` 
        });
      }

      case "export": {
        const filters: IIncendioFilters = {
          estado: formData.get("estado") as string || undefined,
          prioridad: formData.get("prioridad") as string || undefined,
          fecha_desde: formData.get("fecha_desde") as string || undefined,
          fecha_hasta: formData.get("fecha_hasta") as string || undefined,
          search: formData.get("search") as string || undefined,
        };
        
        const csvBlob = await exportIncendiosCSV(filters);
        return new Response(csvBlob, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="incendios_${new Date().toISOString().split('T')[0]}.csv"`,
          },
        });
      }

      default:
        return json({ success: false, errors: ["Acción no válida"] });
    }
  } catch (error) {
    console.error("Error in incendios action:", error);
    const errors = handleIncendioError(error);
    return json({ success: false, errors });
  }
};

const IncendiosPage = () => {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const [isInsetVariant, setIsInsetVariant] = useState(true);

  // Show success/error messages
  useEffect(() => {
    if (actionData?.success && actionData?.message) {
      toast.success(actionData.message);
    } else if (actionData?.errors) {
      actionData.errors.forEach(error => toast.error(error));
    }
  }, [actionData]);

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
          <ClientOnly fallback={
            <div className="h-screen w-full bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando panel de incendios...</p>
              </div>
            </div>
          }>
            {() => (
              <IncendiosDashboard 
                incendios={data.incendios}
                stats={data.stats}
                total={data.total}
                page={data.page}
                limit={data.limit}
                filters={data.filters}
                isInsetVariant={isInsetVariant}
                setIsInsetVariant={setIsInsetVariant}
              />
            )}
          </ClientOnly>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default IncendiosPage; 