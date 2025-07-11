import * as React from 'react';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Map, Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import maplibregl, { MapRef } from 'react-map-gl/maplibre';
import { useNavigate } from '@remix-run/react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { SidebarTrigger } from './ui/sidebar';
import { Satellite, Map as MapIcon, Globe, Mountain, MountainSnow, CloudSun, Sun, LayoutPanelLeft, ArrowLeft } from 'lucide-react';
import Pin from './Pin';
import { cn } from '~/lib/utils';
import { DashboardPage } from '~/constants/routes';
import LayerControlPanel from './LayerControlPanel';
import { 
  LAYER_CONFIGS, 
  type LayerConfig, 
  type EnhancedLayer,
  createRoadNetworkLayers,
  createPriorityPolygonLayers,
  createWaterPolygonLayers,
  createEnhancedCentralesLayers,
  createAdministrativeRegionLayers,
  createElectricalSystemLayers,
  getIconPath,
  getIconColor,
  placemarkIcon
} from '~/lib/map-layers';

import type { MarkerDragEvent, LngLat } from 'react-map-gl/maplibre';

interface MapComponentProps {
  isInsetVariant?: boolean;
  setIsInsetVariant?: (value: boolean) => void;
  showBackButton?: boolean;
}

const initialViewState = {
  latitude: -33.0472,
  longitude: -71.6127,
  zoom: 12
};

type MapStyle = 'dark' | 'satellite' | 'liberty';

interface MapStyleOption {
  id: MapStyle;
  name: string;
  icon: React.ReactNode;
  mapStyle?: string;
  useCustomLayers?: boolean;
}

const mapStyles: MapStyleOption[] = [
  {
    id: 'dark',
    name: 'Dark',
    icon: <MapIcon className="h-4 w-4" />,
    mapStyle: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
  },
  {
    id: 'satellite',
    name: 'Satellite',
    icon: <Satellite className="h-4 w-4" />,
    useCustomLayers: true
  },
  {
    id: 'liberty',
    name: 'Liberty',
    icon: <Globe className="h-4 w-4" />,
    mapStyle: 'https://tiles.openfreemap.org/styles/liberty'
  }
];

// Helper function to render HTML content safely
const renderHTMLContent = (htmlContent: string): string => {
  return htmlContent
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
};

// Helper function to get display name for water bodies
const getWaterDisplayName = (feature: any): string => {
  const name = feature.properties?.Name || feature.properties?.NOMBRE;
  if (!name || name.trim() === '') {
    const tipo = feature.properties?.TIPO_MAGUA || 'Cuerpo de Agua';
    const fid = feature.properties?.FID;
    return `${tipo}${fid ? ` #${fid}` : ''}`;
  }
  return name;
};

// Helper function to get road type display name
const getRoadTypeDisplayName = (sourceLayer: string): string => {
  switch (sourceLayer) {
    case 'red_vial_valparaiso_pavimento':
      return 'Pavimento';
    case 'red_vial_valparaiso_ripio':
      return 'Ripio';
    case 'red_vial_valparaiso_tierra':
      return 'Tierra';
    default:
      return sourceLayer;
  }
};

// Transform request function for liberty style
const transformRequest = (url: string, resourceType?: any) => {
  if (resourceType === 'Source' && url.includes('openfreemap.org')) {
    return {
      url: url
    };
  }
  return { url };
};

export default function MapComponent({ isInsetVariant, setIsInsetVariant, showBackButton = false }: MapComponentProps) {
  const mapRef = useRef<MapRef>(null);
  const navigate = useNavigate();
  const [marker, setMarker] = useState({
    latitude: -33.0472,
    longitude: -71.6127
  });
  const [events, logEvents] = useState<Record<string, LngLat>>({});
  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyle>('dark');
  const [elevationEnabled, setElevationEnabled] = useState(false);
  const [exaggeration, setExaggeration] = useState(1.5);
  const [skyEnabled, setSkyEnabled] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{feature: any, x: number, y: number} | null>(null);

  // Layer management state
  const [layers, setLayers] = useState<{ [key: string]: boolean }>(() => {
    const initialLayers: { [key: string]: boolean } = {};
    LAYER_CONFIGS.forEach(config => {
      initialLayers[config.id] = config.enabled;
    });
    return initialLayers;
  });
  const [layerData, setLayerData] = useState<{ [key: string]: any }>({});
  const [loadedLayers, setLoadedLayers] = useState<Set<string>>(new Set());
  const [isLayerLoading, setIsLayerLoading] = useState(false);
  const [enhancedLayers, setEnhancedLayers] = useState<{ [key: string]: EnhancedLayer[] }>({});
  const [iconsReady, setIconsReady] = useState(false);
  const [mapStyleReady, setMapStyleReady] = useState(false);
  const [layerRevision, setLayerRevision] = useState(0);

  // Layer loading functions
  const loadLayerData = useCallback(async (layerId: string) => {
    const config = LAYER_CONFIGS.find(c => c.id === layerId);
    if (!config || layerData[layerId]) return;

    try {
      const response = await fetch(config.file);
      if (!response.ok) {
        throw new Error(`Failed to load ${config.name}: ${response.statusText}`);
      }
      const data = await response.json();
      
      setLayerData(prev => ({
        ...prev,
        [layerId]: data
      }));

      // Create enhanced layers based on type
      let createdLayers: EnhancedLayer[] = [];
      switch (config.type) {
        case 'road-network':
          createdLayers = createRoadNetworkLayers(data);
          break;
        case 'priority-polygons':
          createdLayers = createPriorityPolygonLayers(data);
          break;
        case 'water-polygons':
          createdLayers = createWaterPolygonLayers(data);
          break;
        case 'point-enhanced':
          createdLayers = createEnhancedCentralesLayers(data, config.id);
          break;
        case 'administrative-regions':
          createdLayers = createAdministrativeRegionLayers(data);
          break;
        case 'electrical-system':
          createdLayers = createElectricalSystemLayers(data);
          break;
      }

      setEnhancedLayers(prev => ({
        ...prev,
        [layerId]: createdLayers
      }));

      setLoadedLayers(prev => new Set(prev).add(layerId));
    } catch (error) {
      console.error(`Error loading layer ${layerId}:`, error);
    }
  }, [layerData]);

  // Load icons for enhanced point layers - based on the example
  const loadIcons = useCallback(async () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    setIconsReady(false);
    const iconsToLoad = new Set<{iconId: string, iconPath: string, color: string}>();



    // Add placemark icon first
    if (!map.hasImage('placemark-icon')) {
      const img = new Image();
      img.onload = () => {
        if (!map.hasImage('placemark-icon')) {
          map.addImage('placemark-icon', img);
        }
      };
      img.onerror = () => {
        console.warn('Failed to load placemark icon');
      };
      img.src = placemarkIcon;
    }

    // Collect icons from all point-enhanced layers
    const pointLayers = LAYER_CONFIGS.filter(config => config.type === 'point-enhanced');
    for (const config of pointLayers) {
      if (layers[config.id] && layerData[config.id]) {
        const data = layerData[config.id];
        if (data && data.features) {
          data.features.forEach((feature: any) => {
            const iconPath = getIconPath(feature);
            const iconColor = getIconColor(feature);
            const iconId = `${config.id}-${iconPath.replace(/[^a-zA-Z0-9]/g, '-')}`;
            iconsToLoad.add({ iconId, iconPath, color: iconColor });
          });
        }
      }
    }

    // Load each icon
    for (const { iconId, iconPath, color } of iconsToLoad) {
      if (!map.hasImage(iconId)) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            try {
              if (!map.hasImage(iconId)) {
                map.addImage(iconId, img);
                console.log(`Successfully loaded icon: ${iconId} (${img.width}x${img.height})`);
              }
            } catch (error) {
              console.error(`Error adding icon ${iconId} to map:`, error);
            }
          };
          
          img.onerror = () => {
            console.warn(`Failed to load icon: ${iconPath}`);
          };
          
          img.src = iconPath;
        } catch (error) {
          console.error(`Error loading icon ${iconPath}:`, error);
        }
      }
    }

    // Set icons ready after a short delay to allow loading
    setTimeout(() => {
      setIconsReady(true);
    }, 1000);
  }, [layers, layerData]);

  // Layer toggle handler
  const handleLayerToggle = useCallback(async (layerId: string, enabled: boolean) => {
    setLayers(prev => ({
      ...prev,
      [layerId]: enabled
    }));

    if (enabled && !loadedLayers.has(layerId)) {
      setIsLayerLoading(true);
      await loadLayerData(layerId);
      setIsLayerLoading(false);
    }
  }, [loadLayerData, loadedLayers]);

  // Load enabled layers on mount
  useEffect(() => {
    const loadEnabledLayers = async () => {
      setIsLayerLoading(true);
      const enabledLayerIds = Object.entries(layers)
        .filter(([_, enabled]) => enabled)
        .map(([layerId, _]) => layerId);

      for (const layerId of enabledLayerIds) {
        if (!loadedLayers.has(layerId)) {
          await loadLayerData(layerId);
        }
      }
      setIsLayerLoading(false);
      // Trigger layer re-evaluation after loading
      setLayerRevision(prev => prev + 1);
    };

    loadEnabledLayers();
  }, []);

  // Load icons when map loads or layers change
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map && map.isStyleLoaded()) {
      loadIcons();
    }
  }, [loadIcons, currentMapStyle]);

  // Monitor map style loading for all styles
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    setMapStyleReady(false);

    const checkMapStyleReady = async () => {
      if (currentMapStyle === 'satellite') {
        // For satellite, check if our custom satellite source is loaded
        const satelliteSource = map.getSource('satellite-source');
        if (satelliteSource && map.isSourceLoaded('satellite-source')) {
          setMapStyleReady(true);
          // Load enabled layers and trigger re-evaluation
          await loadEnabledLayersOnMapReady();
        } else {
          // Keep checking until satellite is ready
          setTimeout(checkMapStyleReady, 100);
        }
      } else {
        // For other styles, check if the style is loaded and sources are ready
        if (map.isStyleLoaded()) {
          // Additional check for sources being loaded
          const sources = map.getStyle().sources;
          const allSourcesLoaded = Object.keys(sources).every(sourceId => {
            try {
              return map.isSourceLoaded(sourceId);
            } catch (e) {
              // Some sources might not be loaded yet, that's ok
              return false;
            }
          });

          if (allSourcesLoaded) {
            setMapStyleReady(true);
            // Load enabled layers and trigger re-evaluation
            await loadEnabledLayersOnMapReady();
          } else {
            setTimeout(checkMapStyleReady, 100);
          }
        } else {
          setTimeout(checkMapStyleReady, 100);
        }
      }
    };

    // Start checking after a brief delay to allow sources to be added
    setTimeout(checkMapStyleReady, 200);
  }, [currentMapStyle]);

  // Helper function to load enabled layers when map is ready
  const loadEnabledLayersOnMapReady = useCallback(async () => {
    const enabledLayerIds = Object.entries(layers)
      .filter(([_, enabled]) => enabled)
      .map(([layerId, _]) => layerId);

    for (const layerId of enabledLayerIds) {
      if (!loadedLayers.has(layerId)) {
        await loadLayerData(layerId);
      }
    }
    // Trigger layer re-evaluation after loading
    setLayerRevision(prev => prev + 1);
  }, [layers, loadedLayers, loadLayerData]);

  // Also check map readiness on initial load
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const handleMapLoad = async () => {
      // Trigger the style readiness check when map loads
      setMapStyleReady(false);
      setTimeout(async () => {
        setMapStyleReady(true);
        // Load enabled layers and trigger re-evaluation on initial load
        await loadEnabledLayersOnMapReady();
      }, 500);
    };

    // Check if map is already loaded
    if (map.loaded()) {
      handleMapLoad();
    } else {
      map.on('load', handleMapLoad);
    }

    return () => {
      map.off('load', handleMapLoad);
    };
  }, [loadEnabledLayersOnMapReady]);

  const onMarkerDragStart = useCallback((event: MarkerDragEvent) => {
    logEvents(_events => ({ ..._events, onDragStart: event.lngLat }));
  }, []);

  const onMarkerDrag = useCallback((event: MarkerDragEvent) => {
    logEvents(_events => ({ ..._events, onDrag: event.lngLat }));

    setMarker({
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat
    });
  }, []);

  const onMarkerDragEnd = useCallback((event: MarkerDragEvent) => {
    logEvents(_events => ({ ..._events, onDragEnd: event.lngLat }));
  }, []);

  const onHover = useCallback((event: any) => {
    const {
      features,
      point: { x, y }
    } = event;
    const hoveredFeature = features && features[0];

    setHoverInfo(hoveredFeature && { feature: hoveredFeature, x, y });
  }, []);

  const currentStyle = mapStyles.find(style => style.id === currentMapStyle);
  
  const mapProps = {
    initialViewState,
    maxPitch: 85, // Always allow max pitch, but control it dynamically
    ...(currentStyle?.mapStyle && { mapStyle: currentStyle.mapStyle }),
    ...(currentMapStyle === 'liberty' && { transformRequest })
  };

  const toggleElevation = () => {
    setElevationEnabled(!elevationEnabled);
  };

  const toggleSky = () => {
    setSkyEnabled(!skyEnabled);
  };

  // Add onLoad handler to set initial pitch/maxPitch and load icons
  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.setMaxPitch(60);
    if (map.getPitch() > 60) {
      map.setPitch(60);
    }
    loadIcons();
  }, [loadIcons]);

  // Effect to handle terrain 3D elevation
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const handleTerrainUpdate = () => {
      if (currentMapStyle === 'satellite' && elevationEnabled) {
        // Wait a bit for the DEM source to be loaded
        setTimeout(() => {
          if (map.getSource('terrain-dem-source')) {
            map.setTerrain({
              source: 'terrain-dem-source',
              exaggeration: exaggeration
            });
          }
        }, 500);
      } else {
        // Remove terrain
        map.setTerrain(null);
      }
    };

    handleTerrainUpdate();
  }, [currentMapStyle, elevationEnabled, exaggeration]);

  // Ensure sky is always turned off when changing layers
  useEffect(() => {
    if (skyEnabled) {
      setSkyEnabled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMapStyle]);

  // Effect to always enforce pitch range and reset camera on map load and layer change
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Helper to enforce pitch limit
    const enforcePitchLimit = () => {
      if (!skyEnabled) {
        const currentPitch = map.getPitch();
        if (currentPitch > 60) {
          map.setPitch(60);
        }
      }
    };

    // Set max pitch depending on sky state
    if (skyEnabled) {
      map.setMaxPitch(85);
      // Set sky atmosphere
      map.setSky({
        'sky-color': '#87CEEB',
        'sky-horizon-blend': 0.5,
        'horizon-color': '#ffffff',
        'horizon-fog-blend': 0.5,
        'fog-color': '#ffffff',
        'fog-ground-blend': 0.1
      });
    } else {
      map.setMaxPitch(60);
    }

    // Always reset camera to default pitch and bearing on layer change
    map.easeTo({
      pitch: skyEnabled ? 65 : 30,
      bearing: 0,
      duration: 1000
    });

    // Attach pitch event listener
    map.on('pitch', enforcePitchLimit);

    // Clean up
    return () => {
      map.off('pitch', enforcePitchLimit);
    };
  }, [currentMapStyle, skyEnabled]);

  // Memoize rendered layers to avoid unnecessary re-renders
  const renderedLayers = useMemo(() => {
    // Only render layers if icons are ready AND map style is ready
    const shouldRenderLayers = iconsReady && mapStyleReady;
    if (!shouldRenderLayers) return [];
    
    const layerComponents: React.ReactElement[] = [];
    
    Object.entries(layers).forEach(([layerId, enabled]) => {
      if (enabled && enhancedLayers[layerId]) {
        enhancedLayers[layerId].forEach((enhancedLayer, index) => {
          const sourceId = `${layerId}-${index}`;
          const layerKey = `${layerId}-${index}`;
          
          // Add beforeId to ensure layers render above satellite layers
          const layerWithBeforeId = {
            ...enhancedLayer.layer,
            beforeId: currentMapStyle === 'satellite' ? undefined : enhancedLayer.layer.beforeId
          };
          
          layerComponents.push(
            <Source key={`source-${layerKey}`} id={sourceId} type="geojson" data={enhancedLayer.data}>
              <Layer key={`layer-${layerKey}`} {...layerWithBeforeId} source={sourceId} />
              {/* Render text layer if it exists */}
              {enhancedLayer.textLayer && (
                <Layer key={`text-${layerKey}`} {...enhancedLayer.textLayer} source={sourceId} />
              )}
              {/* Render stroke layer if it exists */}
              {enhancedLayer.strokeLayer && (
                <Layer key={`stroke-${layerKey}`} {...enhancedLayer.strokeLayer} source={sourceId} />
              )}
            </Source>
          );
        });
      }
    });

    return layerComponents;
  }, [layers, enhancedLayers, currentMapStyle, iconsReady, mapStyleReady, layerRevision]);

  // Get interactive layer IDs for hover functionality
  const interactiveLayerIds = useMemo(() => {
    const layerIds: string[] = [];
    
    Object.entries(layers).forEach(([layerId, enabled]) => {
      if (enabled && enhancedLayers[layerId]) {
        enhancedLayers[layerId].forEach((enhancedLayer) => {
          layerIds.push(enhancedLayer.layer.id);
          // Add text layer IDs for interaction too
          if (enhancedLayer.textLayer) {
            layerIds.push(enhancedLayer.textLayer.id);
          }
        });
      }
    });

    return layerIds;
  }, [layers, enhancedLayers]);

  return (
    <div className="h-screen w-full relative">
      {/* Sidebar Controls */}
      <div className="absolute top-4 left-16 z-10 flex flex-col gap-2">
        <SidebarTrigger className="bg-background/90 backdrop-blur-sm hover:bg-background/95 border-border" />
        {/* Inset Toggle Button */}
        {setIsInsetVariant && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsInsetVariant(!isInsetVariant)}
            className="h-8 w-8 bg-background/90 backdrop-blur-sm hover:bg-background/95 shadow-lg border-border"
            title={isInsetVariant ? "Disable Inset" : "Enable Inset"}
          >
            <LayoutPanelLeft className="h-4 w-4" />
          </Button>
        )}
        {/* Back Button */}
        {showBackButton && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(DashboardPage)}
            className="h-8 w-8 bg-background/90 backdrop-blur-sm hover:bg-background/95 shadow-lg border-border"
            title="Volver al Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Layer Control Panel */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <LayerControlPanel
          layers={layers}
          onLayerToggle={handleLayerToggle}
          isLoading={isLayerLoading}
          loadedLayers={loadedLayers}
        />
      </div>

      {/* Map Style Selector */}
      <Card className="absolute top-16 right-4 z-10 bg-background/90 backdrop-blur-sm border-border">
        <CardContent className="p-3">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground mb-1">Map Style</h3>
            <div className="flex flex-col gap-1">
              {mapStyles.map((style) => (
                <Button
                  key={style.id}
                  variant={currentMapStyle === style.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentMapStyle(style.id)}
                  className={cn(
                    "justify-start gap-2 h-8 text-foreground",
                    currentMapStyle === style.id 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "bg-background/50 hover:bg-background/80 border-border hover:border-border/80"
                  )}
                >
                  {style.icon}
                  {style.name}
                </Button>
              ))}
            </div>
            
            {/* Global Sky Toggle */}
            <div className="border-t border-border my-2"></div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Atmosphere</h3>
            <Button
              variant={skyEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={toggleSky}
              className={cn(
                "justify-start gap-2 h-8 text-foreground",
                skyEnabled 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "bg-background/50 hover:bg-background/80 border-border hover:border-border/80"
              )}
            >
              {skyEnabled ? <CloudSun className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {skyEnabled ? 'Sky On' : 'Sky Off'}
            </Button>
            
            {/* Elevation Toggle - Only show when satellite is selected */}
            {currentMapStyle === 'satellite' && (
              <>
                <div className="border-t border-border my-2"></div>
                <h3 className="text-sm font-semibold text-foreground mb-1">3D Terrain</h3>
                <Button
                  variant={elevationEnabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleElevation}
                  className={cn(
                    "justify-start gap-2 h-8 text-foreground",
                    elevationEnabled 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "bg-background/50 hover:bg-background/80 border-border hover:border-border/80"
                  )}
                >
                  {elevationEnabled ? <MountainSnow className="h-4 w-4" /> : <Mountain className="h-4 w-4" />}
                  {elevationEnabled ? '3D Terrain On' : '3D Terrain Off'}
                </Button>
                
                {/* Exaggeration Slider - Only show when elevation is enabled */}
                {elevationEnabled && (
                  <div className="mt-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Elevation Intensity: {exaggeration.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={exaggeration}
                      onChange={(e) => setExaggeration(parseFloat(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider accent-primary"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Debug Panel */}
      {events.onDrag && (
        <Card className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur-sm border-border">
          <CardContent className="p-3">
            <div className="text-xs space-y-1 text-foreground">
              <p className="font-semibold">Marker Position:</p>
              <p>Lat: {events.onDrag.lat.toFixed(4)}</p>
              <p>Lng: {events.onDrag.lng.toFixed(4)}</p>
              <p className="mt-2 text-orange-500 dark:text-orange-400">
                Sky: {skyEnabled ? 'ON' : 'OFF'}
              </p>
              {currentMapStyle === 'satellite' && (
                <>
                  <p className="mt-2 text-green-600 dark:text-green-400">
                    3D Terrain: {elevationEnabled ? 'ON' : 'OFF'}
                  </p>
                  {elevationEnabled && (
                    <p className="text-blue-600 dark:text-blue-400">
                      Exaggeration: {exaggeration.toFixed(1)}x
                    </p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Map 
        ref={mapRef} 
        {...mapProps} 
        onLoad={handleMapLoad}
        interactiveLayerIds={interactiveLayerIds}
        onMouseMove={onHover}
      >
        {/* Satellite Layers */}
        {currentMapStyle === 'satellite' && (
          <>
            {/* DEM source for elevation when elevation is enabled */}
            {elevationEnabled && (
              <Source
                id="terrain-dem-source"
                type="raster-dem"
                tiles={[
                  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
                ]}
                tileSize={256}
                maxzoom={15}
                encoding="terrarium"
              />
            )}
            
            <Source
              id="satellite-source"
              type="raster"
              tiles={[
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              ]}
              tileSize={128}
              minzoom={8}
              maxzoom={19}
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            />
            <Layer
              id="satellite"
              type="raster"
              source="satellite-source"
              minzoom={8}
              maxzoom={24}
              paint={{
                'raster-opacity': 1,
                'raster-fade-duration': 0
              }}
            />
            
            {/* Hillshade Layer - Only render when elevation is enabled */}
            {elevationEnabled && (
              <Layer
                id="hillshade"
                type="hillshade"
                source="terrain-dem-source"
                maxzoom={15}
                paint={{
                  'hillshade-shadow-color': '#2C1810',
                  'hillshade-highlight-color': '#FFFFFF',
                  'hillshade-accent-color': '#000000',
                  'hillshade-illumination-anchor': 'viewport',
                  'hillshade-illumination-direction': 315,
                  'hillshade-exaggeration': 0.5
                }}
              />
            )}
          </>
        )}

        {/* Render GeoJSON Layers - Make sure they appear on top of satellite layers */}
        {renderedLayers}

        {/* Draggable Marker */}
        <Marker
          longitude={marker.longitude}
          latitude={marker.latitude}
          anchor="bottom"
          draggable
          onDragStart={onMarkerDragStart}
          onDrag={onMarkerDrag}
          onDragEnd={onMarkerDragEnd}
        >
          <Pin size={20} />
        </Marker>

        {/* Navigation Controls */}
        <NavigationControl position="top-left" />
      </Map>

      {/* Tooltip */}
      {hoverInfo && (
        <div 
          className="absolute bg-black/80 text-white p-2 rounded shadow-lg pointer-events-none z-50 text-xs max-w-xs"
          style={{
            left: hoverInfo.x,
            top: hoverInfo.y
          }}
        >
          <div><strong>Name:</strong> {
            hoverInfo.feature.properties.name || 
            hoverInfo.feature.properties.Name || 
            getWaterDisplayName(hoverInfo.feature)
          }</div>
          <div><strong>Type:</strong> {hoverInfo.feature.geometry.type}</div>
          
          {/* Water body specific information */}
          {hoverInfo.feature.properties.TIPO_MAGUA && (
            <div><strong>Tipo:</strong> {hoverInfo.feature.properties.TIPO_MAGUA}</div>
          )}
          {hoverInfo.feature.properties.AREA_KM2 && (
            <div><strong>Área:</strong> {hoverInfo.feature.properties.AREA_KM2} km²</div>
          )}
          {hoverInfo.feature.properties.COMUNA && (
            <div><strong>Comuna:</strong> {hoverInfo.feature.properties.COMUNA}</div>
          )}
          
          {/* Priority polygon and road network specific information */}
          {hoverInfo.feature.properties.source_layer && (
            <div><strong>Source Layer:</strong> {hoverInfo.feature.properties.source_layer}</div>
          )}
          
          {/* Road network specific information */}
          {hoverInfo.feature.geometry.type === 'LineString' && hoverInfo.feature.properties.source_layer && (
            <div><strong>Tipo de Superficie:</strong> {getRoadTypeDisplayName(hoverInfo.feature.properties.source_layer)}</div>
          )}
          
          {/* KML metadata for points */}
          {hoverInfo.feature.properties.kml_folder && (
            <div><strong>Folder:</strong> {hoverInfo.feature.properties.kml_folder}</div>
          )}
          {hoverInfo.feature.properties.kml_styleUrl && (
            <div><strong>Style:</strong> {hoverInfo.feature.properties.kml_styleUrl}</div>
          )}
          
          {/* Show detailed description if available */}
          {hoverInfo.feature.properties.kml_description && (
            <div className="mt-2">
              <strong>Description:</strong>
              <div className="max-h-32 overflow-y-auto text-xs mt-1 bg-gray-100 text-black p-1 rounded whitespace-pre-wrap">
                {hoverInfo.feature.properties.kml_description}
              </div>
            </div>
          )}
          
          {/* Handle HTML descriptions from water polygons */}
          {!hoverInfo.feature.properties.kml_description && 
           hoverInfo.feature.properties.Description && (
            <div className="mt-2">
              <strong>Description:</strong>
              <div className="max-h-32 overflow-y-auto text-xs mt-1 bg-gray-100 text-black p-1 rounded whitespace-pre-wrap">
                {hoverInfo.feature.properties.Description.includes('<html>') ? 
                  renderHTMLContent(hoverInfo.feature.properties.Description) : 
                  hoverInfo.feature.properties.Description}
              </div>
            </div>
          )}
          
          {/* Fallback to regular description if no HTML */}
          {!hoverInfo.feature.properties.kml_description && 
           !hoverInfo.feature.properties.Description && 
           hoverInfo.feature.properties.description && (
            <div className="mt-2">
              <strong>Description:</strong>
              <div className="max-h-24 overflow-y-auto text-xs mt-1">
                {hoverInfo.feature.properties.description}
              </div>
            </div>
          )}
          
          {hoverInfo.feature.properties.kml_icon_href && (
            <div><strong>Icon:</strong> {hoverInfo.feature.properties.kml_icon_href}</div>
          )}
          {hoverInfo.feature.properties.kml_icon_scale && (
            <div><strong>Scale:</strong> {hoverInfo.feature.properties.kml_icon_scale}</div>
          )}
        </div>
      )}
    </div>
  );
} 