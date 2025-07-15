import React, { useState, useEffect } from 'react';
import { Form, useNavigate, useSearchParams } from '@remix-run/react';
import { 
  Flame, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  LayoutPanelLeft,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Eye,
  RefreshCw,
  FileText,
  Activity,
  TrendingUp,
  Users,
  Target
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { SidebarTrigger } from './ui/sidebar';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import { IIncendio, IIncendioStats, IIncendioFilters } from '~/interfaces/incendio';
import { DashboardPage } from '~/constants/routes';

interface IncendiosDashboardProps {
  incendios: IIncendio[];
  stats: IIncendioStats;
  total: number;
  page: number;
  limit: number;
  filters: IIncendioFilters;
  isInsetVariant?: boolean;
  setIsInsetVariant?: (value: boolean) => void;
}

const IncendiosDashboard: React.FC<IncendiosDashboardProps> = ({
  incendios,
  stats,
  total,
  page,
  limit,
  filters,
  isInsetVariant,
  setIsInsetVariant,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIncendios, setSelectedIncendios] = useState<number[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingIncendio, setEditingIncendio] = useState<IIncendio | null>(null);
  const [deletingIncendio, setDeleteingIncendio] = useState<IIncendio | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Pagination calculations
  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Status and priority configurations
  const statusConfig = {
    activo: { label: 'Activo', color: 'bg-red-500', icon: Flame },
    controlado: { label: 'Controlado', color: 'bg-yellow-500', icon: Clock },
    extinguido: { label: 'Extinguido', color: 'bg-green-500', icon: CheckCircle },
    cancelado: { label: 'Cancelado', color: 'bg-gray-500', icon: XCircle },
  };

  const priorityConfig = {
    baja: { label: 'Baja', color: 'bg-blue-500' },
    media: { label: 'Media', color: 'bg-yellow-500' },
    alta: { label: 'Alta', color: 'bg-orange-500' },
    critica: { label: 'Crítica', color: 'bg-red-500' },
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery) {
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  // Handle row selection
  const handleRowSelection = (incendioId: number, checked: boolean) => {
    if (checked) {
      setSelectedIncendios([...selectedIncendios, incendioId]);
    } else {
      setSelectedIncendios(selectedIncendios.filter(id => id !== incendioId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIncendios(incendios.map(inc => inc.id));
    } else {
      setSelectedIncendios([]);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Statistics cards
  const statsCards = [
    {
      title: 'Total Incendios',
      value: stats.total_incendios,
      icon: Flame,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Activos',
      value: stats.activos,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Controlados',
      value: stats.controlados,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Extinguidos',
      value: stats.extinguidos,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Superficie Total',
      value: `${stats.superficie_total_afectada?.toFixed(1) || 0} ha`,
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="h-full w-full bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="bg-background/90 backdrop-blur-sm hover:bg-background/95 border-border" />
            {setIsInsetVariant && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsInsetVariant(!isInsetVariant)}
                className="h-8 w-8"
                title={isInsetVariant ? "Disable Inset" : "Enable Inset"}
              >
                <LayoutPanelLeft className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(DashboardPage)}
              className="h-8 w-8"
              title="Volver al Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Gestión de Incendios
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="incendios">Incendios</TabsTrigger>
            <TabsTrigger value="analytics">Análisis</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {statsCards.map((card, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {card.title}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {card.value}
                        </p>
                      </div>
                      <div className={`p-3 rounded-full ${card.bgColor}`}>
                        <card.icon className={`h-5 w-5 ${card.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Priority Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Distribución por Prioridad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(stats.por_prioridad).map(([priority, count]) => (
                    <div key={priority} className="text-center">
                      <div className={`h-16 w-16 rounded-full ${priorityConfig[priority as keyof typeof priorityConfig].color} mx-auto mb-2 flex items-center justify-center`}>
                        <span className="text-white font-bold text-xl">{count}</span>
                      </div>
                      <p className="text-sm font-medium capitalize">{priority}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Incendios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Incendios Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {incendios.slice(0, 5).map((incendio) => (
                    <div key={incendio.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${statusConfig[incendio.estado].color}`} />
                        <div>
                          <p className="font-medium">{incendio.nombre}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(incendio.fecha_deteccion)}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${priorityConfig[incendio.prioridad].color} text-white`}>
                        {priorityConfig[incendio.prioridad].label}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incendios Tab */}
          <TabsContent value="incendios" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <Form onSubmit={handleSearch} className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar incendios..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button type="submit">Buscar</Button>
                  </Form>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filtros
                    </Button>
                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Nuevo Incendio
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Crear Nuevo Incendio</DialogTitle>
                          <DialogDescription>
                            Complete los datos para registrar un nuevo incendio
                          </DialogDescription>
                        </DialogHeader>
                        <CreateIncendioForm onClose={() => setShowCreateDialog(false)} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="estado-filter">Estado</Label>
                        <Select
                          value={filters.estado || 'all'}
                          onValueChange={(value) => handleFilterChange('estado', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="activo">Activo</SelectItem>
                            <SelectItem value="controlado">Controlado</SelectItem>
                            <SelectItem value="extinguido">Extinguido</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="prioridad-filter">Prioridad</Label>
                        <Select
                          value={filters.prioridad || 'all'}
                          onValueChange={(value) => handleFilterChange('prioridad', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="baja">Baja</SelectItem>
                            <SelectItem value="media">Media</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="critica">Crítica</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="fecha-desde">Fecha Desde</Label>
                        <Input
                          type="date"
                          value={filters.fecha_desde || ''}
                          onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="fecha-hasta">Fecha Hasta</Label>
                        <Input
                          type="date"
                          value={filters.fecha_hasta || ''}
                          onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedIncendios.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedIncendios.length} incendio(s) seleccionado(s)
                    </span>
                    <div className="flex gap-2">
                      <BulkStatusUpdate selectedIds={selectedIncendios} />
                      <Button
                        variant="outline"
                        onClick={() => setSelectedIncendios([])}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Incendios Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIncendios.length === incendios.length && incendios.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Fecha Detección</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Superficie</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incendios.map((incendio) => (
                      <TableRow key={incendio.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIncendios.includes(incendio.id)}
                            onCheckedChange={(checked) => handleRowSelection(incendio.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <p>{incendio.nombre}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {incendio.descripcion?.substring(0, 50)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig[incendio.estado].color} text-white`}>
                            {statusConfig[incendio.estado].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${priorityConfig[incendio.prioridad].color} text-white`}>
                            {priorityConfig[incendio.prioridad].label}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(incendio.fecha_deteccion)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm">
                              {incendio.latitud.toFixed(4)}, {incendio.longitud.toFixed(4)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {incendio.superficie_afectada ? `${incendio.superficie_afectada} ha` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingIncendio(incendio);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeleteingIncendio(incendio);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {startItem} a {endItem} de {total} incendios
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={page === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={page === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Análisis y Reportes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-20 flex-col">
                    <Download className="h-6 w-6 mb-2" />
                    Exportar CSV
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <FileText className="h-6 w-6 mb-2" />
                    Generar Reporte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Incendio</DialogTitle>
            <DialogDescription>
              Modifique los datos del incendio seleccionado
            </DialogDescription>
          </DialogHeader>
          {editingIncendio && (
            <EditIncendioForm 
              incendio={editingIncendio} 
              onClose={() => {
                setShowEditDialog(false);
                setEditingIncendio(null);
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Incendio</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar el incendio "{deletingIncendio?.nombre}"?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteingIncendio(null);
              }}
            >
              Cancelar
            </Button>
            <Form method="post">
              <input type="hidden" name="_action" value="delete" />
              <input type="hidden" name="id" value={deletingIncendio?.id} />
              <Button type="submit" variant="destructive">
                Eliminar
              </Button>
            </Form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Create Incendio Form Component
const CreateIncendioForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    latitud: '',
    longitud: '',
    fecha_deteccion: new Date().toISOString().slice(0, 16),
    estado: 'activo',
    prioridad: 'media',
    superficie_afectada: '',
    causa: '',
    observaciones: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form will be submitted via Remix Form
  };

  return (
    <Form method="post" onSubmit={handleSubmit}>
      <input type="hidden" name="_action" value="create" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prioridad">Prioridad *</Label>
          <Select name="prioridad" value={formData.prioridad} onValueChange={(value) => setFormData({...formData, prioridad: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baja">Baja</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="descripcion">Descripción *</Label>
          <Input
            id="descripcion"
            name="descripcion"
            value={formData.descripcion}
            onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="latitud">Latitud *</Label>
          <Input
            id="latitud"
            name="latitud"
            type="number"
            step="any"
            value={formData.latitud}
            onChange={(e) => setFormData({...formData, latitud: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitud">Longitud *</Label>
          <Input
            id="longitud"
            name="longitud"
            type="number"
            step="any"
            value={formData.longitud}
            onChange={(e) => setFormData({...formData, longitud: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_deteccion">Fecha Detección *</Label>
          <Input
            id="fecha_deteccion"
            name="fecha_deteccion"
            type="datetime-local"
            value={formData.fecha_deteccion}
            onChange={(e) => setFormData({...formData, fecha_deteccion: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado">Estado *</Label>
          <Select name="estado" value={formData.estado} onValueChange={(value) => setFormData({...formData, estado: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="controlado">Controlado</SelectItem>
              <SelectItem value="extinguido">Extinguido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="superficie_afectada">Superficie Afectada (ha)</Label>
          <Input
            id="superficie_afectada"
            name="superficie_afectada"
            type="number"
            step="0.1"
            value={formData.superficie_afectada}
            onChange={(e) => setFormData({...formData, superficie_afectada: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="causa">Causa</Label>
          <Input
            id="causa"
            name="causa"
            value={formData.causa}
            onChange={(e) => setFormData({...formData, causa: e.target.value})}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="observaciones">Observaciones</Label>
          <Input
            id="observaciones"
            name="observaciones"
            value={formData.observaciones}
            onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">Crear Incendio</Button>
      </DialogFooter>
    </Form>
  );
};

// Edit Incendio Form Component
const EditIncendioForm: React.FC<{ incendio: IIncendio; onClose: () => void }> = ({ incendio, onClose }) => {
  const [formData, setFormData] = useState({
    nombre: incendio.nombre,
    descripcion: incendio.descripcion,
    latitud: incendio.latitud.toString(),
    longitud: incendio.longitud.toString(),
    fecha_deteccion: incendio.fecha_deteccion.slice(0, 16),
    estado: incendio.estado,
    prioridad: incendio.prioridad,
    superficie_afectada: incendio.superficie_afectada?.toString() || '',
    causa: incendio.causa || '',
    observaciones: incendio.observaciones || '',
  });

  return (
    <Form method="post">
      <input type="hidden" name="_action" value="update" />
      <input type="hidden" name="id" value={incendio.id} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prioridad">Prioridad *</Label>
          <Select name="prioridad" value={formData.prioridad} onValueChange={(value) => setFormData({...formData, prioridad: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baja">Baja</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="descripcion">Descripción *</Label>
          <Input
            id="descripcion"
            name="descripcion"
            value={formData.descripcion}
            onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="latitud">Latitud *</Label>
          <Input
            id="latitud"
            name="latitud"
            type="number"
            step="any"
            value={formData.latitud}
            onChange={(e) => setFormData({...formData, latitud: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitud">Longitud *</Label>
          <Input
            id="longitud"
            name="longitud"
            type="number"
            step="any"
            value={formData.longitud}
            onChange={(e) => setFormData({...formData, longitud: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_deteccion">Fecha Detección *</Label>
          <Input
            id="fecha_deteccion"
            name="fecha_deteccion"
            type="datetime-local"
            value={formData.fecha_deteccion}
            onChange={(e) => setFormData({...formData, fecha_deteccion: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado">Estado *</Label>
          <Select name="estado" value={formData.estado} onValueChange={(value) => setFormData({...formData, estado: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="controlado">Controlado</SelectItem>
              <SelectItem value="extinguido">Extinguido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="superficie_afectada">Superficie Afectada (ha)</Label>
          <Input
            id="superficie_afectada"
            name="superficie_afectada"
            type="number"
            step="0.1"
            value={formData.superficie_afectada}
            onChange={(e) => setFormData({...formData, superficie_afectada: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="causa">Causa</Label>
          <Input
            id="causa"
            name="causa"
            value={formData.causa}
            onChange={(e) => setFormData({...formData, causa: e.target.value})}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="observaciones">Observaciones</Label>
          <Input
            id="observaciones"
            name="observaciones"
            value={formData.observaciones}
            onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">Actualizar Incendio</Button>
      </DialogFooter>
    </Form>
  );
};

// Bulk Status Update Component
const BulkStatusUpdate: React.FC<{ selectedIds: number[] }> = ({ selectedIds }) => {
  const [selectedStatus, setSelectedStatus] = useState('');

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Cambiar estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="activo">Activo</SelectItem>
          <SelectItem value="controlado">Controlado</SelectItem>
          <SelectItem value="extinguido">Extinguido</SelectItem>
          <SelectItem value="cancelado">Cancelado</SelectItem>
        </SelectContent>
      </Select>
      <Form method="post">
        <input type="hidden" name="_action" value="bulkUpdateStatus" />
        <input type="hidden" name="ids" value={JSON.stringify(selectedIds)} />
        <input type="hidden" name="estado" value={selectedStatus} />
        <Button type="submit" disabled={!selectedStatus}>
          Aplicar
        </Button>
      </Form>
    </div>
  );
};

export default IncendiosDashboard; 