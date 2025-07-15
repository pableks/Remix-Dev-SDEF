export interface IIncendio {
  id: number;
  nombre: string;
  descripcion: string;
  latitud: number;
  longitud: number;
  fecha_deteccion: string;
  fecha_declaracion: string;
  estado: 'activo' | 'controlado' | 'extinguido' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  superficie_afectada?: number;
  causa?: string;
  recursos_asignados?: string[];
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

export interface IIncendioCreate {
  nombre: string;
  descripcion: string;
  latitud: number;
  longitud: number;
  fecha_deteccion: string;
  estado: 'activo' | 'controlado' | 'extinguido' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  superficie_afectada?: number;
  causa?: string;
  recursos_asignados?: string[];
  observaciones?: string;
}

export interface IIncendioUpdate {
  nombre?: string;
  descripcion?: string;
  latitud?: number;
  longitud?: number;
  fecha_deteccion?: string;
  estado?: 'activo' | 'controlado' | 'extinguido' | 'cancelado';
  prioridad?: 'baja' | 'media' | 'alta' | 'critica';
  superficie_afectada?: number;
  causa?: string;
  recursos_asignados?: string[];
  observaciones?: string;
}

export interface IIncendioStats {
  total_incendios: number;
  activos: number;
  controlados: number;
  extinguidos: number;
  cancelados: number;
  superficie_total_afectada: number;
  por_prioridad: {
    baja: number;
    media: number;
    alta: number;
    critica: number;
  };
}

export interface IIncendioFilters {
  estado?: string;
  prioridad?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
  page?: number;
  limit?: number;
} 