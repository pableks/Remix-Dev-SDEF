import * as React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Map, Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import maplibregl, { MapRef } from 'react-map-gl/maplibre';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { SidebarTrigger } from './ui/sidebar';
import { Satellite, Map as MapIcon, Globe, Mountain, MountainSnow, CloudSun, Sun, LayoutPanelLeft } from 'lucide-react';
import Pin from './Pin';
import { cn } from '~/lib/utils';

import type { MarkerDragEvent, LngLat } from 'react-map-gl/maplibre';

interface MapComponentProps {
  isInsetVariant?: boolean;
  setIsInsetVariant?: (value: boolean) => void;
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

// Transform request function for liberty style
const transformRequest = (url: string, resourceType?: maplibregl.ResourceType) => {
  if (resourceType === 'Source' && url.includes('openfreemap.org')) {
    return {
      url: url
    };
  }
  return { url };
};

export default function MapComponent({ isInsetVariant, setIsInsetVariant }: MapComponentProps) {
  const mapRef = useRef<MapRef>(null);
  const [marker, setMarker] = useState({
    latitude: -33.0472,
    longitude: -71.6127
  });
  const [events, logEvents] = useState<Record<string, LngLat>>({});
  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyle>('dark');
  const [elevationEnabled, setElevationEnabled] = useState(false);
  const [exaggeration, setExaggeration] = useState(1.5);
  const [skyEnabled, setSkyEnabled] = useState(false);

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

  // Add onLoad handler to set initial pitch/maxPitch
  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.setMaxPitch(60);
    if (map.getPitch() > 60) {
      map.setPitch(60);
    }
  }, []);

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
      </div>
      
      {/* Layer Selector */}
      <Card className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-sm border-border">
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

      <Map ref={mapRef} {...mapProps} onLoad={handleMapLoad}>
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
    </div>
  );
} 