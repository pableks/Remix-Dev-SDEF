import { AxiosError } from "axios";
import { API } from "~/config/api";
import { IIncendio, IIncendioStats, IIncendioFilters } from "~/interfaces/incendio";

// Create a separate API instance for incendios since it's on a different port
import axios from "axios";

const INCENDIOS_API = axios.create({
  baseURL: process.env.NODE_ENV === "production" ? "/incendios" : "http://localhost:8100/incendios",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// GET all incendios with filters
export const getIncendios = async (filters?: IIncendioFilters, accessToken?: string): Promise<{
  data: IIncendio[];
  total: number;
  page: number;
  limit: number;
}> => {
  const params = new URLSearchParams();
  
  if (filters?.estado) params.append('estado', filters.estado);
  if (filters?.prioridad) params.append('prioridad', filters.prioridad);
  if (filters?.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
  if (filters?.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const response = await INCENDIOS_API.get(`/?${params.toString()}`, { headers });
  
  // Transform the response to match our interface
  const transformedData = response.data.map((item: any) => ({
    id: item.id_incendio,
    nombre: item.nombre,
    descripcion: item.descripcion || '',
    latitud: item.latitude,
    longitud: item.longitude,
    fecha_deteccion: item.created_at || new Date().toISOString(),
    fecha_declaracion: item.created_at || new Date().toISOString(),
    estado: item.estado?.toLowerCase() === 'declarado' ? 'activo' : item.estado?.toLowerCase() || 'activo',
    prioridad: item.prioridad?.toLowerCase() || 'media',
    superficie_afectada: item.superficie_afectada || null,
    causa: item.causa || null,
    recursos_asignados: item.recursos_asignados || [],
    observaciones: item.observaciones || null,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
  }));

  return {
    data: transformedData,
    total: transformedData.length,
    page: filters?.page || 1,
    limit: filters?.limit || 10,
  };
};

// GET single incendio by ID
export const getIncendio = async (id: number, accessToken?: string): Promise<IIncendio> => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const response = await INCENDIOS_API.get(`/${id}`, { headers });
  
  const item = response.data;
  return {
    id: item.id_incendio,
    nombre: item.nombre,
    descripcion: item.descripcion || '',
    latitud: item.latitude,
    longitud: item.longitude,
    fecha_deteccion: item.created_at || new Date().toISOString(),
    fecha_declaracion: item.created_at || new Date().toISOString(),
    estado: item.estado?.toLowerCase() === 'declarado' ? 'activo' : item.estado?.toLowerCase() || 'activo',
    prioridad: item.prioridad?.toLowerCase() || 'media',
    superficie_afectada: item.superficie_afectada || null,
    causa: item.causa || null,
    recursos_asignados: item.recursos_asignados || [],
    observaciones: item.observaciones || null,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
  };
};

// POST create new incendio
export const createIncendio = async (data: any, accessToken?: string): Promise<IIncendio> => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const payload = {
    nombre: data.nombre,
    descripcion: data.descripcion,
    latitude: data.latitud,
    longitude: data.longitud,
    estado: data.estado?.toUpperCase() || 'DECLARADO',
    prioridad: data.prioridad?.toUpperCase() || 'MEDIA',
    superficie_afectada: data.superficie_afectada,
    causa: data.causa,
    observaciones: data.observaciones,
  };
  
  const response = await INCENDIOS_API.post('/', payload, { headers });
  return getIncendio(response.data.id_incendio, accessToken);
};

// POST declare incendio with spatial analysis
export const declareIncendio = async (data: {
  latitud: number;
  longitud: number;
  nombre: string;
  descripcion: string;
  prioridad: string;
}, accessToken?: string): Promise<{
  incendio: IIncendio;
  spatial_analysis: any;
  brigade_analysis: any;
}> => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const payload = {
    nombre: data.nombre,
    descripcion: data.descripcion,
    latitude: data.latitud,
    longitude: data.longitud,
    prioridad: data.prioridad.toUpperCase(),
  };
  
  const response = await INCENDIOS_API.post('/declarar', payload, { headers });
  const incendio = await getIncendio(response.data.id_incendio, accessToken);
  
  return {
    incendio,
    spatial_analysis: response.data.spatial_analysis || null,
    brigade_analysis: response.data.brigade_analysis || null,
  };
};

// PUT update incendio
export const updateIncendio = async (id: number, data: any, accessToken?: string): Promise<IIncendio> => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const payload = {
    nombre: data.nombre,
    descripcion: data.descripcion,
    latitude: data.latitud,
    longitude: data.longitud,
    estado: data.estado?.toUpperCase(),
    prioridad: data.prioridad?.toUpperCase(),
    superficie_afectada: data.superficie_afectada,
    causa: data.causa,
    observaciones: data.observaciones,
  };
  
  await INCENDIOS_API.put(`/${id}`, payload, { headers });
  return getIncendio(id, accessToken);
};

// PATCH update incendio status only
export const updateIncendioStatus = async (id: number, estado: string, accessToken?: string): Promise<IIncendio> => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  await INCENDIOS_API.patch(`/${id}/estado`, { estado: estado.toUpperCase() }, { headers });
  return getIncendio(id, accessToken);
};

// PATCH update incendio priority only
export const updateIncendioPriority = async (id: number, prioridad: string, accessToken?: string): Promise<IIncendio> => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  await INCENDIOS_API.patch(`/${id}/prioridad`, { prioridad: prioridad.toUpperCase() }, { headers });
  return getIncendio(id, accessToken);
};

// DELETE incendio (soft delete)
export const deleteIncendio = async (id: number, accessToken?: string): Promise<{ message: string }> => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const response = await INCENDIOS_API.delete(`/${id}`, { headers });
  return response.data;
};

// DELETE incendio permanently (hard delete)
export const hardDeleteIncendio = async (id: number, accessToken?: string): Promise<{ message: string }> => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const response = await INCENDIOS_API.delete(`/${id}/hard`, { headers });
  return response.data;
};

// GET incendios statistics
export const getIncendiosStats = async (accessToken?: string): Promise<IIncendioStats> => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  
  try {
    const response = await INCENDIOS_API.get('/estadisticas/resumen', { headers });
    return response.data;
  } catch (error) {
    // If stats endpoint doesn't exist, calculate from incendios list
    const incendiosResponse = await getIncendios(undefined, accessToken);
    const incendios = incendiosResponse.data;
    
    const stats = {
      total_incendios: incendios.length,
      activos: incendios.filter(i => i.estado === 'activo').length,
      controlados: incendios.filter(i => i.estado === 'controlado').length,
      extinguidos: incendios.filter(i => i.estado === 'extinguido').length,
      cancelados: incendios.filter(i => i.estado === 'cancelado').length,
      superficie_total_afectada: incendios.reduce((sum, i) => sum + (i.superficie_afectada || 0), 0),
      por_prioridad: {
        baja: incendios.filter(i => i.prioridad === 'baja').length,
        media: incendios.filter(i => i.prioridad === 'media').length,
        alta: incendios.filter(i => i.prioridad === 'alta').length,
        critica: incendios.filter(i => i.prioridad === 'critica').length,
      },
    };
    
    return stats;
  }
};

// GET active incendios summary
export const getActiveIncendios = async (accessToken?: string): Promise<{
  incendios_activos: IIncendio[];
  total_activos: number;
  superficie_total: number;
  recursos_desplegados: number;
}> => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  
  try {
    const response = await INCENDIOS_API.get('/activos/resumen', { headers });
    return response.data;
  } catch (error) {
    // If endpoint doesn't exist, calculate from incendios list
    const incendiosResponse = await getIncendios({ estado: 'activo' }, accessToken);
    const activosIncendios = incendiosResponse.data;
    
    return {
      incendios_activos: activosIncendios,
      total_activos: activosIncendios.length,
      superficie_total: activosIncendios.reduce((sum, i) => sum + (i.superficie_afectada || 0), 0),
      recursos_desplegados: activosIncendios.reduce((sum, i) => sum + (i.recursos_asignados?.length || 0), 0),
    };
  }
};

// GET search incendios
export const searchIncendios = async (query: string, limit?: number, accessToken?: string): Promise<IIncendio[]> => {
  const incendiosResponse = await getIncendios({ search: query, limit }, accessToken);
  return incendiosResponse.data;
};

// POST bulk update incendios status
export const bulkUpdateIncendiosStatus = async (ids: number[], estado: string, accessToken?: string): Promise<{
  updated_count: number;
  updated_incendios: IIncendio[];
}> => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  
  try {
    const response = await INCENDIOS_API.post('/bulk/update-estado', { 
      ids, 
      estado: estado.toUpperCase() 
    }, { headers });
    return response.data;
  } catch (error) {
    // If bulk endpoint doesn't exist, update individually
    const updatedIncendios = [];
    for (const id of ids) {
      try {
        const updated = await updateIncendioStatus(id, estado, accessToken);
        updatedIncendios.push(updated);
      } catch (err) {
        console.error(`Error updating incendio ${id}:`, err);
      }
    }
    
    return {
      updated_count: updatedIncendios.length,
      updated_incendios: updatedIncendios,
    };
  }
};

// GET export incendios to CSV
export const exportIncendiosCSV = async (filters?: IIncendioFilters, accessToken?: string): Promise<Blob> => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  
  try {
    const params = new URLSearchParams();
    if (filters?.estado) params.append('estado', filters.estado);
    if (filters?.prioridad) params.append('prioridad', filters.prioridad);
    if (filters?.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
    if (filters?.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
    if (filters?.search) params.append('search', filters.search);

    const response = await INCENDIOS_API.get(`/export/csv?${params.toString()}`, {
      headers,
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    // If export endpoint doesn't exist, create CSV from data
    const incendiosResponse = await getIncendios(filters, accessToken);
    const incendios = incendiosResponse.data;
    
    const csvContent = [
      'ID,Nombre,Descripción,Estado,Prioridad,Latitud,Longitud,Fecha Detección,Superficie Afectada,Causa',
      ...incendios.map(i => 
        `${i.id},"${i.nombre}","${i.descripcion}",${i.estado},${i.prioridad},${i.latitud},${i.longitud},${i.fecha_deteccion},${i.superficie_afectada || ''},${i.causa || ''}`
      )
    ].join('\n');
    
    return new Blob([csvContent], { type: 'text/csv' });
  }
};

// Error handler helper
export const handleIncendioError = (error: unknown): string[] => {
  if (error instanceof AxiosError) {
    const errorData = error.response?.data;
    if (errorData?.detail) {
      return Array.isArray(errorData.detail) ? errorData.detail : [errorData.detail];
    }
    if (errorData?.error) {
      return [errorData.error];
    }
    if (errorData?.message) {
      return [errorData.message];
    }
    if (error.message) {
      return [error.message];
    }
  }
  return ["Error desconocido al procesar la solicitud"];
}; 