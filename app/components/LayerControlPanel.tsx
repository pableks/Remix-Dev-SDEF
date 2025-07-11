import * as React from 'react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { LayersIcon, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '~/lib/utils';
import { LAYER_CONFIGS, type LayerConfig } from '~/lib/map-layers';

interface LayerControlPanelProps {
  layers: { [key: string]: boolean };
  onLayerToggle: (layerId: string, enabled: boolean) => void;
  isLoading: boolean;
  loadedLayers: Set<string>;
}

interface LayerGroupProps {
  title: string;
  layers: LayerConfig[];
  enabledLayers: { [key: string]: boolean };
  onLayerToggle: (layerId: string, enabled: boolean) => void;
  isLoading: boolean;
  loadedLayers: Set<string>;
}

const LayerGroup: React.FC<LayerGroupProps> = ({
  title,
  layers,
  enabledLayers,
  onLayerToggle,
  isLoading,
  loadedLayers
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between p-2 h-auto text-sm font-medium"
      >
        <span>{title}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
      
      {isExpanded && (
        <div className="ml-2 space-y-1">
          {layers.map((layer) => {
            const isEnabled = enabledLayers[layer.id];
            const isLoaded = loadedLayers.has(layer.id);
            
            return (
              <div
                key={layer.id}
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={layer.id}
                  checked={isEnabled}
                  onCheckedChange={(checked) => 
                    onLayerToggle(layer.id, checked as boolean)
                  }
                  disabled={isLoading}
                />
                <div className="flex items-center space-x-2 flex-1">
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: layer.color }}
                  />
                  <label
                    htmlFor={layer.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    {layer.name}
                  </label>
                  {isEnabled && (
                    <div className="flex items-center space-x-1">
                      {isLoaded ? (
                        <Eye className="h-3 w-3 text-green-500" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const LayerControlPanel: React.FC<LayerControlPanelProps> = ({
  layers,
  onLayerToggle,
  isLoading,
  loadedLayers
}) => {
  // Group layers by type
  const layerGroups = {
    'Centrales y Puntos': LAYER_CONFIGS.filter(l => l.type === 'point-enhanced'),
    'Cuerpos de Agua': LAYER_CONFIGS.filter(l => l.type === 'water-polygons'),
    'Zonas Prioritarias': LAYER_CONFIGS.filter(l => l.type === 'priority-polygons'),
    'Red Vial': LAYER_CONFIGS.filter(l => l.type === 'road-network'),
    'Regiones Administrativas': LAYER_CONFIGS.filter(l => l.type === 'administrative-regions'),
    'Sistema Eléctrico': LAYER_CONFIGS.filter(l => l.type === 'electrical-system'),
  };

  const enabledCount = Object.values(layers).filter(Boolean).length;
  const totalLayers = LAYER_CONFIGS.length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-background/90 backdrop-blur-sm hover:bg-background/95 shadow-lg border-border"
        >
          <LayersIcon className="h-4 w-4" />
          Capas
          <Badge variant="secondary" className="ml-1">
            {enabledCount}/{totalLayers}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <LayersIcon className="h-5 w-5" />
            Control de Capas
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 mt-6">
          <div className="space-y-4 pr-4">
          {/* Layer Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Estadísticas</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Capas activas:</span>
                  <span className="font-medium">{enabledCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Capas cargadas:</span>
                  <span className="font-medium">{loadedLayers.size}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total disponibles:</span>
                  <span className="font-medium">{totalLayers}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    LAYER_CONFIGS.forEach(layer => {
                      onLayerToggle(layer.id, true);
                    });
                  }}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Mostrar Todas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    LAYER_CONFIGS.forEach(layer => {
                      onLayerToggle(layer.id, false);
                    });
                  }}
                  disabled={isLoading}
                  className="w-full"
                >
                  <EyeOff className="h-3 w-3 mr-1" />
                  Ocultar Todas
                </Button>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Layer Groups */}
          <div className="space-y-4">
            {Object.entries(layerGroups).map(([groupTitle, groupLayers]) => (
              <LayerGroup
                key={groupTitle}
                title={groupTitle}
                layers={groupLayers}
                enabledLayers={layers}
                onLayerToggle={onLayerToggle}
                isLoading={isLoading}
                loadedLayers={loadedLayers}
              />
            ))}
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    Cargando capas...
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default LayerControlPanel; 