import * as React from 'react';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Map, Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import maplibregl, { MapRef } from 'react-map-gl/maplibre';
import { useNavigate } from '@remix-run/react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { SidebarTrigger } from './ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from './ui/drawer';
import { Satellite, Map as MapIcon, Globe, Mountain, MountainSnow, CloudSun, Sun, LayoutPanelLeft, ArrowLeft, Search, MapPin, Target, ChevronDown, ChevronUp, Flame, Wind, Droplets, Zap, AlertTriangle, Navigation, Clock, MapPinIcon, Users, Phone, Shield, Copy } from 'lucide-react';
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

interface DispatchMapComponentProps {
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

// Helper function to get display name for any feature type
const getFeatureDisplayName = (feature: any): string => {
  // Try common name properties first
  const name = feature.properties?.name || 
               feature.properties?.Name || 
               feature.properties?.NOMBRE ||
               feature.properties?.nombre;
  
  if (name && name.trim() !== '') {
    return name;
  }
  
  // For water bodies, use specific logic
  if (feature.properties?.TIPO_MAGUA) {
    return getWaterDisplayName(feature);
  }
  
  // For other features, try to identify the type
  const sourceLayer = feature.properties?.source_layer;
  if (sourceLayer) {
    return `${sourceLayer} feature`;
  }
  
  // Generic fallback
  return `${feature.geometry.type} feature`;
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

export default function DispatchMapComponent({ isInsetVariant, setIsInsetVariant }: DispatchMapComponentProps) {
  const mapRef = useRef<MapRef>(null);
  const navigate = useNavigate();
  
  // Placemark state
  const [placemark, setPlacemark] = useState({
    latitude: -33.0472,
    longitude: -71.6127
  });
  
  // Enhanced search state
  const [showEnhancedSearch, setShowEnhancedSearch] = useState(false);
  const [coordinateInput, setCoordinateInput] = useState({
    latitude: '',
    longitude: ''
  });
  
  // Tooltip state
  const [showTooltip, setShowTooltip] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  
  // Drawer state
  const [showDrawer, setShowDrawer] = useState(false);
  const [incendioData, setIncendioData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incidentDeclared, setIncidentDeclared] = useState(false);
  const [propagationCone, setPropagationCone] = useState<any>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Brigade expansion state
  const [expandedBrigades, setExpandedBrigades] = useState(false);
  
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



  // Handle coordinate input submission
  const handleCoordinateSubmit = useCallback(() => {
    const lat = parseFloat(coordinateInput.latitude);
    const lng = parseFloat(coordinateInput.longitude);
    
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setPlacemark({
        latitude: lat,
        longitude: lng
      });
      
      // Center map on new coordinates
      const map = mapRef.current?.getMap();
      if (map) {
        map.easeTo({
          center: [lng, lat],
          zoom: 15,
          duration: 1000
        });
      }
      
      // Clear inputs and close enhanced search
      setCoordinateInput({ latitude: '', longitude: '' });
      setShowEnhancedSearch(false);
      
      // Show tooltip with fade in animation after coordinate update
      setShowTooltip(false);
      setTimeout(() => {
        setShowTooltip(true);
      }, 100);
    } else {
      alert('Por favor ingresa coordenadas válidas');
    }
  }, [coordinateInput]);

  // Handle search functionality
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    // Simple geocoding using Nominatim
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=cl`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        setPlacemark({
          latitude: lat,
          longitude: lng
        });
        
        // Center map on search result
        const map = mapRef.current?.getMap();
        if (map) {
          map.easeTo({
            center: [lng, lat],
            zoom: 15,
            duration: 1000
          });
        }
        
        // Show tooltip with fade in animation after search
        setShowTooltip(false);
        setTimeout(() => {
          setShowTooltip(true);
        }, 100);
      } else {
        alert('No se encontraron resultados para la búsqueda');
      }
    } catch (error) {
      console.error('Error searching:', error);
      alert('Error al buscar la ubicación');
    }
  }, [searchQuery]);

  // Function to create propagation cone based on weather analysis
  const createPropagationCone = useCallback((incidentData: any) => {
    console.log('createPropagationCone called with:', incidentData);
    if (!incidentData?.weather_analysis?.found || !incidentData?.weather_analysis?.current_conditions) {
      console.log('No weather analysis found or incomplete, returning null');
      return null;
    }

    const { current_conditions, fire_propagation } = incidentData.weather_analysis;
    // Use the actual incident coordinates, not the weather grid coordinates
    const { latitude, longitude } = incidentData.coordinates;
    const { wind_speed_kmh, wind_direction_degrees } = current_conditions || {};
    const { risk_level } = fire_propagation || {};

    // Additional null checks for required fields
    if (!wind_speed_kmh || !wind_direction_degrees || !risk_level) {
      console.log('Missing required weather data fields, returning null');
      return null;
    }

    console.log('Weather data:', { latitude, longitude, wind_speed_kmh, wind_direction_degrees, risk_level });

    // Calculate cone parameters based on wind speed and risk level
    const baseRadius = Math.max(wind_speed_kmh * 55, 100); // Base radius in meters (adjusted for km/h)
    const riskMultiplier = risk_level === 'ALTO' ? 2 : risk_level === 'MEDIO' ? 1.5 : 1;
    const coneRadius = baseRadius * riskMultiplier;
    const coneLength = coneRadius * 2; // Cone length

    // Convert wind direction to radians (wind direction is where wind comes from, 
    // so fire propagates in opposite direction)
    const propagationAngle = ((wind_direction_degrees + 180) % 360) * (Math.PI / 180);
    
    // Create cone vertices (simplified triangular cone)
    const coneAngle = Math.PI / 6; // 30 degrees cone angle
    const metersPerDegree = 111000; // Approximate meters per degree
    
    const vertices = [];
    
    // Origin point (incident location)
    vertices.push([longitude, latitude]);
    
    // Calculate cone tip point
    // Convert cardinal direction to degrees
    const getDegreesFromCardinal = (direction: string): number => {
      const cardinalMap: { [key: string]: number } = {
        'Norte': 0,
        'Noreste': 45,
        'Este': 90,
        'Sureste': 135,
        'Sur': 180,
        'Suroeste': 225,
        'Oeste': 270,
        'Noroeste': 315
      };
      return cardinalMap[direction] || 0;
    };
    
    // Use the fire propagation direction from the API
    const propagationDegrees = getDegreesFromCardinal(fire_propagation.direccion_aproximada);
    
    // Convert to mathematical angle (East = 0°, counter-clockwise)
    const mathAngle = (90 - propagationDegrees) * (Math.PI / 180);
    
    console.log('Direction calculations:', {
      wind_direction_degrees,
      fire_propagation_direction: fire_propagation.direccion_aproximada,
      propagationDegrees,
      mathAngle: mathAngle * (180 / Math.PI)
    });
    
    const tipLat = latitude + (coneLength / metersPerDegree) * Math.sin(mathAngle);
    const tipLon = longitude + (coneLength / metersPerDegree) * Math.cos(mathAngle) / Math.cos(latitude * Math.PI / 180);
    
    // Calculate cone base points
    const leftAngle = mathAngle - coneAngle;
    const rightAngle = mathAngle + coneAngle;
    
    const leftLat = latitude + (coneLength / metersPerDegree) * Math.sin(leftAngle);
    const leftLon = longitude + (coneLength / metersPerDegree) * Math.cos(leftAngle) / Math.cos(latitude * Math.PI / 180);
    
    const rightLat = latitude + (coneLength / metersPerDegree) * Math.sin(rightAngle);
    const rightLon = longitude + (coneLength / metersPerDegree) * Math.cos(rightAngle) / Math.cos(latitude * Math.PI / 180);
    
    // Create cone polygon
    vertices.push([leftLon, leftLat]);
    vertices.push([tipLon, tipLat]);
    vertices.push([rightLon, rightLat]);
    vertices.push([longitude, latitude]); // Close the polygon
    
    const coneFeature = {
      type: 'Feature',
      properties: {
        type: 'fire_propagation_cone',
        wind_speed: wind_speed_kmh,
        wind_direction: wind_direction_degrees,
        risk_level: risk_level,
        propagation_direction: fire_propagation.direccion_aproximada
      },
      geometry: {
        type: 'Polygon',
        coordinates: [vertices]
      }
    };

    const result = {
      type: 'FeatureCollection',
      features: [coneFeature]
    };

    console.log('Created propagation cone:', result);
    return result;
  }, []);

  // Handle incident declaration
  const handleDeclareIncident = useCallback(async () => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('http://172.203.150.174:8100/incendios/declarar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          longitude: placemark.longitude,
          latitude: placemark.latitude,
          nombre: `Incendio_${new Date().toISOString().slice(0, 10)}_${Math.floor(Math.random() * 1000)}`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Incident API response:', data);
      console.log('Brigade analysis data:', data.brigade_analysis);
      setIncendioData(data);
      setIncidentDeclared(true);
      
      // Create propagation cone
      const cone = createPropagationCone(data);
      console.log('Cone result:', cone);
      if (cone) {
        console.log('Setting propagation cone');
        setPropagationCone(cone);
      } else {
        console.log('No cone created');
      }
      
      setShowTooltip(false); // Hide tooltip when drawer opens
      setShowDrawer(true);
      
    } catch (error) {
      console.error('Error declaring incident:', error);
      alert('Error al declarar el incendio. Por favor, inténtelo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }, [placemark, createPropagationCone]);

  // Handle copying incident data to clipboard
  const handleCopyIncidentData = useCallback(async () => {
    if (!incendioData) return;
    
    try {
      const formattedData = `
🔥 REPORTE DE INCENDIO DECLARADO
================================

📍 INFORMACIÓN DEL INCENDIO
ID: #${incendioData.incendio.id_incendio}
Nombre: ${incendioData.incendio.nombre}
Estado: ${incendioData.incendio.estado}
Prioridad: ${incendioData.incendio.prioridad}
Comuna: ${incendioData.comuna_info.nombre}
Región: ${incendioData.comuna_info.region}
Coordenadas: ${incendioData.coordinates.latitude.toFixed(5)}, ${incendioData.coordinates.longitude.toFixed(5)}
Fecha: ${new Date(incendioData.incendio.created_at).toLocaleString()}

🎯 ANÁLISIS GOLPE ÚNICO
${incendioData.golpe_unico_analysis.is_golpe_unico ? '⚠️ ZONA GOLPE ÚNICO' : '✅ ZONA NORMAL'}
${incendioData.golpe_unico_analysis.nearest_golpe_unico ? `
Zona más cercana: ${incendioData.golpe_unico_analysis.nearest_golpe_unico.nombre}
Distancia: ${Math.round(incendioData.golpe_unico_analysis.nearest_golpe_unico.distance_meters)} m
Dirección: ${incendioData.golpe_unico_analysis.nearest_golpe_unico.cardinal_direction}
Descripción: ${incendioData.golpe_unico_analysis.nearest_golpe_unico.descripcion}
Coordenadas: ${incendioData.golpe_unico_analysis.nearest_golpe_unico.coordinates.latitude.toFixed(5)}, ${incendioData.golpe_unico_analysis.nearest_golpe_unico.coordinates.longitude.toFixed(5)}` : ''}

🌬️ ANÁLISIS METEOROLÓGICO
${incendioData.weather_analysis?.found && incendioData.weather_analysis?.current_conditions ? `
Velocidad del viento: ${incendioData.weather_analysis.current_conditions.wind_speed_kmh || 'N/A'} km/h
Dirección del viento: ${incendioData.weather_analysis.current_conditions.wind_direction_cardinal || 'N/A'}
${incendioData.weather_analysis.fire_propagation ? `Propagación del fuego: ${incendioData.weather_analysis.fire_propagation.direccion_aproximada || 'N/A'}
Nivel de riesgo: ${incendioData.weather_analysis.fire_propagation.risk_level || 'N/A'}
Descripción: ${incendioData.weather_analysis.fire_propagation.risk_description || 'N/A'}` : 'Datos de propagación no disponibles'}` : 'Datos meteorológicos no disponibles'}

💧 CUERPOS DE AGUA CERCANOS
${incendioData.water_body_analysis.found ? `
Nombre: ${incendioData.water_body_analysis.nearest_water_body.nombre}
Tipo: ${incendioData.water_body_analysis.nearest_water_body.tipo}
Distancia: ${Math.round(incendioData.water_body_analysis.nearest_water_body.distance_meters)} m
Dirección: ${incendioData.water_body_analysis.nearest_water_body.cardinal_direction}
Coordenadas: ${incendioData.water_body_analysis.nearest_water_body.coordinates.latitude.toFixed(5)}, ${incendioData.water_body_analysis.nearest_water_body.coordinates.longitude.toFixed(5)}` : 'No se encontraron cuerpos de agua cercanos'}

⚡ LÍNEAS ELÉCTRICAS
${incendioData.power_line_analysis.has_power_lines ? `
Línea: ${incendioData.power_line_analysis.nearest_line.nombre}
Tensión: ${incendioData.power_line_analysis.nearest_line.tension_kv} kV
Distancia: ${Math.round(incendioData.power_line_analysis.nearest_line.distance_meters)} m
Dirección: ${incendioData.power_line_analysis.nearest_line.cardinal_direction}` : 'No se detectaron líneas eléctricas cercanas'}

🛣️ ANÁLISIS DE RUTAS
${incendioData.road_analysis.found ? `
Ruta: ${incendioData.road_analysis.nearest_road.nombre}
Categoría: ${incendioData.road_analysis.nearest_road.categoria}
Distancia: ${Math.round(incendioData.road_analysis.nearest_road.distance_meters)} m
Dirección: ${incendioData.road_analysis.nearest_road.cardinal_direction}` : 'No se encontraron rutas cercanas'}

🚒 BRIGADAS CERCANAS
Total: ${incendioData.brigade_analysis.total_brigades} brigadas
${incendioData.brigade_analysis.brigades.map((brigade: any, index: number) => `
${index + 1}. ${brigade.nombre} (${brigade.estado})
   - Distancia: ${brigade.distance_km} km - ${brigade.comuna}
   - Personal: ${brigade.personal?.length || 0} personas
   - Teléfono: ${brigade.telefono}
   - Equipamiento: ${brigade.equipamiento ? Object.entries(brigade.equipamiento).filter(([_, value]) => value).map(([key, value]) => `${key}: ${value}`).join(', ') || 'Sin equipamiento especial' : 'Sin equipamiento especial'}`).join('')}

================================
Generado: ${new Date().toLocaleString()}
      `.trim();

      // Enhanced clipboard solution with multiple fallbacks for HTTP environments
      const unsecuredCopyToClipboard = (text: string): boolean => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        
        let success = false;
        try {
          textArea.focus();
          textArea.select();
          success = document.execCommand('copy');
          console.log('execCommand copy result:', success);
        } catch (err) {
          console.error('execCommand copy failed:', err);
        }
        
        document.body.removeChild(textArea);
        return success;
      };

      const showCopyModal = (text: string) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.8);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
          background: white;
          border-radius: 8px;
          padding: 20px;
          max-width: 90vw;
          max-height: 90vh;
          overflow: auto;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        const title = document.createElement('h3');
        title.textContent = 'Copiar Datos del Incendio';
        title.style.cssText = 'margin: 0 0 15px 0; color: #333; text-align: center;';

        const instructions = document.createElement('p');
        instructions.innerHTML = 'Selecciona todo el texto y copia con <strong>Ctrl+C</strong> (o Cmd+C en Mac):';
        instructions.style.cssText = 'margin-bottom: 15px; color: #666; text-align: center;';

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = `
          width: 100%;
          height: 300px;
          font-family: monospace;
          font-size: 12px;
          border: 2px solid #007bff;
          border-radius: 4px;
          padding: 10px;
          margin-bottom: 15px;
          resize: vertical;
        `;
        textarea.readOnly = true;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'text-align: center;';

        const selectButton = document.createElement('button');
        selectButton.textContent = 'Seleccionar Todo';
        selectButton.style.cssText = `
          padding: 10px 20px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 10px;
        `;

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Cerrar';
        closeButton.style.cssText = `
          padding: 10px 20px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        `;

        // Event handlers
        selectButton.onclick = () => {
          textarea.focus();
          textarea.select();
          textarea.setSelectionRange(0, textarea.value.length);
        };

        closeButton.onclick = () => {
          document.body.removeChild(overlay);
        };

        overlay.onclick = (e) => {
          if (e.target === overlay) {
            document.body.removeChild(overlay);
          }
        };

        document.addEventListener('keydown', function escapeHandler(e) {
          if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', escapeHandler);
          }
        });

        // Assemble modal
        buttonContainer.appendChild(selectButton);
        buttonContainer.appendChild(closeButton);
        modal.appendChild(title);
        modal.appendChild(instructions);
        modal.appendChild(textarea);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Auto-select text
        setTimeout(() => {
          textarea.focus();
          textarea.select();
          textarea.setSelectionRange(0, textarea.value.length);
        }, 100);
      };

      // Try multiple methods in order
      console.log('Attempting to copy incident data...');
      
      // Method 1: Try modern clipboard API first (might work in some HTTP contexts)
      if (navigator.clipboard && window.isSecureContext) {
        try {
          console.log('Trying modern clipboard API...');
          await navigator.clipboard.writeText(formattedData);
          alert('Datos del incendio copiados al portapapeles');
          return;
        } catch (err) {
          console.log('Modern clipboard API failed:', err);
        }
      }

      // Method 2: Try execCommand
      console.log('Trying execCommand...');
      if (unsecuredCopyToClipboard(formattedData)) {
        alert('Datos del incendio copiados al portapapeles');
        return;
      }

      // Method 3: Show manual copy modal
      console.log('All automatic methods failed, showing manual copy modal');
      showCopyModal(formattedData);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Error al copiar los datos al portapapeles');
    }
  }, [incendioData]);

  // Layer loading functions (same as MapComponent)
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

  // Load icons for enhanced point layers
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
  }, [currentMapStyle, loadEnabledLayersOnMapReady]);

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

  // Placemark event handlers
  const onPlacemarkDragStart = useCallback((event: MarkerDragEvent) => {
    if (incidentDeclared) return; // Prevent dragging if incident is declared
    logEvents(_events => ({ ..._events, onDragStart: event.lngLat }));
    setIsDragging(true);
    setShowTooltip(false);
  }, [incidentDeclared]);

  const onPlacemarkDrag = useCallback((event: MarkerDragEvent) => {
    if (incidentDeclared) return; // Prevent dragging if incident is declared
    logEvents(_events => ({ ..._events, onDrag: event.lngLat }));

    setPlacemark({
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat
    });
  }, [incidentDeclared]);

  const onPlacemarkDragEnd = useCallback((event: MarkerDragEvent) => {
    if (incidentDeclared) return; // Prevent dragging if incident is declared
    logEvents(_events => ({ ..._events, onDragEnd: event.lngLat }));
    setIsDragging(false);
    // Show tooltip with a slight delay for better UX
    setTimeout(() => {
      setShowTooltip(true);
    }, 100);
  }, [incidentDeclared]);

  const onHover = useCallback((event: any) => {
    const {
      features,
      point: { x, y }
    } = event;
    const hoveredFeature = features && features[0];

    setHoverInfo(hoveredFeature && { feature: hoveredFeature, x, y });
  }, []);

  // Handle double-click to place placemark
  const onDoubleClick = useCallback((event: any) => {
    if (incidentDeclared) return; // Prevent placing if incident is already declared
    
    // Prevent default zoom behavior
    event.preventDefault();
    
    const { lngLat } = event;
    
    // Update placemark position
    setPlacemark({
      longitude: lngLat.lng,
      latitude: lngLat.lat
    });
    
    // Show tooltip with fade in animation after placement
    setShowTooltip(false);
    setTimeout(() => {
      setShowTooltip(true);
    }, 100);
  }, [incidentDeclared]);

  const currentStyle = mapStyles.find(style => style.id === currentMapStyle);
  
  const mapProps = {
    initialViewState,
    maxPitch: 85,
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

  // Debug output for propagationCone and incidentDeclared
  useEffect(() => {
    console.log('propagationCone state changed:', propagationCone);
  }, [propagationCone]);

  useEffect(() => {
    console.log('incidentDeclared state changed:', incidentDeclared);
  }, [incidentDeclared]);

  // Debug output for expandedBrigades
  useEffect(() => {
    console.log('expandedBrigades state changed:', expandedBrigades);
  }, [expandedBrigades]);

  return (
    <div className="h-screen w-full relative" style={{ pointerEvents: 'auto' }}>
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
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(DashboardPage)}
          className="h-8 w-8 bg-background/90 backdrop-blur-sm hover:bg-background/95 shadow-lg border-border"
          title="Volver al Dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Enhanced Search Bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex flex-col gap-2">
        {/* Main Search Bar */}
        <div className="flex gap-2 bg-transparent hover:bg-background/90 backdrop-blur-sm rounded-lg p-2 border border-transparent hover:border-border transition-all duration-300 ease-in-out">
          <Input
            type="text"
            placeholder="Buscar ubicación..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-64 bg-transparent hover:bg-background/50 focus:bg-background/90 border-transparent hover:border-border focus:border-border transition-all duration-300 ease-in-out placeholder:text-white/70 hover:placeholder:text-muted-foreground focus:placeholder:text-muted-foreground text-white hover:text-foreground focus:text-foreground"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleSearch}
            className="h-8 w-8 bg-transparent hover:bg-background/90 border-transparent hover:border-border text-white hover:text-foreground transition-all duration-300 ease-in-out"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowEnhancedSearch(!showEnhancedSearch)}
            className="h-8 w-8 bg-transparent hover:bg-background/90 border-transparent hover:border-border text-white hover:text-foreground transition-all duration-300 ease-in-out"
            title="Búsqueda avanzada"
          >
            {showEnhancedSearch ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Retractable Enhanced Search */}
        {showEnhancedSearch && (
          <Card className="bg-background/95 backdrop-blur-sm border-border shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Búsqueda por Coordenadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="latitude" className="text-xs">Latitud</Label>
                  <Input
                    id="latitude"
                    type="number"
                    placeholder="-33.0472"
                    value={coordinateInput.latitude}
                    onChange={(e) => setCoordinateInput(prev => ({ ...prev, latitude: e.target.value }))}
                    step="any"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude" className="text-xs">Longitud</Label>
                  <Input
                    id="longitude"
                    type="number"
                    placeholder="-71.6127"
                    value={coordinateInput.longitude}
                    onChange={(e) => setCoordinateInput(prev => ({ ...prev, longitude: e.target.value }))}
                    step="any"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCoordinateInput({ latitude: '', longitude: '' });
                    setShowEnhancedSearch(false);
                  }}
                  className="h-8 text-xs"
                >
                  Cancelar
                </Button>
                <Button 
                  size="sm"
                  onClick={handleCoordinateSubmit}
                  className="h-8 text-xs"
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  Colocar Marcador
                </Button>
              </div>
            </CardContent>
          </Card>
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
      <div className="absolute top-4 right-80 z-50 bg-black/90 text-white p-3 rounded shadow-lg text-xs max-w-md">
        <div className="font-bold mb-2">Debug Info:</div>
        <div><strong>incidentDeclared:</strong> {String(incidentDeclared)}</div>
        <div><strong>propagationCone:</strong> {propagationCone ? 'Set' : 'Null'}</div>
        <div><strong>isSubmitting:</strong> {String(isSubmitting)}</div>
        <div><strong>expandedBrigades:</strong> {String(expandedBrigades)}</div>
        {incendioData && (
          <>
            <div><strong>Brigade Analysis Found:</strong> {String(incendioData.brigade_analysis?.found)}</div>
            <div><strong>Total Brigades:</strong> {incendioData.brigade_analysis?.total_brigades || 0}</div>
            <div><strong>Brigades Array Length:</strong> {incendioData.brigade_analysis?.brigades?.length || 0}</div>
          </>
        )}
        {propagationCone && (
          <div className="mt-2">
            <div><strong>Cone features:</strong> {propagationCone.features?.length || 0}</div>
            {propagationCone.features?.[0] && (
              <div><strong>Coordinates:</strong> {propagationCone.features[0].geometry.coordinates[0].length} points</div>
            )}
          </div>
        )}
      </div>

      <Map 
        ref={mapRef} 
        {...mapProps} 
        onLoad={handleMapLoad}
        interactiveLayerIds={interactiveLayerIds}
        onMouseMove={onHover}
        onDblClick={onDoubleClick}
        doubleClickZoom={false}
        style={{ pointerEvents: 'auto' }}
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

        {/* Render GeoJSON Layers */}
        {renderedLayers}

        {/* Draggable Placemark */}
        <Marker
          longitude={placemark.longitude}
          latitude={placemark.latitude}
          anchor="bottom"
          draggable={!incidentDeclared}
          onDragStart={onPlacemarkDragStart}
          onDrag={onPlacemarkDrag}
          onDragEnd={onPlacemarkDragEnd}
        >
          <TooltipProvider>
            <Tooltip open={showTooltip && !isDragging}>
              <TooltipTrigger asChild>
                <div>
                  <Pin size={20} isDeclared={incidentDeclared} />
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                className={cn(
                  "bg-red-100 border-red-300 text-red-900 p-4 rounded-lg shadow-lg max-w-xs",
                  "transition-all duration-300 ease-in-out",
                  showTooltip && !isDragging 
                    ? "opacity-100 transform translate-y-0" 
                    : "opacity-0 transform translate-y-2"
                )}
                sideOffset={10}
              >
                <div className="text-center space-y-2">
                  <div className="text-sm font-medium">
                    <div>Lat/Long: {placemark.latitude.toFixed(5)}</div>
                    <div className="ml-16">{placemark.longitude.toFixed(5)}</div>
                  </div>
                  {incidentDeclared ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-red-700">
                        <Flame className="h-4 w-4 inline mr-1" />
                        INCENDIO DECLARADO
                      </div>
                      {incendioData && (
                        <div className="text-xs text-red-600">
                          <div>ID: #{incendioData.incendio.id_incendio}</div>
                          <div>Prioridad: {incendioData.incendio.prioridad}</div>
                          {incendioData.weather_analysis?.found && (
                            <div>Propagación: {incendioData.weather_analysis.fire_propagation.direccion_aproximada}</div>
                          )}
                        </div>
                      )}
                      <Button 
                        className="bg-gray-500 text-white font-semibold px-4 py-2 rounded w-full cursor-not-allowed"
                        size="sm"
                        disabled
                      >
                        <Flame className="h-4 w-4 mr-2" />
                        INCENDIO YA DECLARADO
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded w-full transition-colors duration-200"
                      size="sm"
                      onClick={() => {
                        // Center camera on placemark
                        const map = mapRef.current?.getMap();
                        if (map) {
                          map.easeTo({
                            center: [placemark.longitude, placemark.latitude - 0.02],
                            zoom: Math.max(map.getZoom(), 10),
                            duration: 1000
                          });
                        }
                        
                        // Declare incident
                        handleDeclareIncident();
                      }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          PROCESANDO...
                        </>
                      ) : (
                        <>
                          <Flame className="h-4 w-4 mr-2" />
                          DECLARAR INCENDIO
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Marker>

        {/* Propagation Cone Layer */}
        {propagationCone && (
          <Source
            id="propagation-cone-source"
            type="geojson"
            data={propagationCone}
          >
            <Layer
              id="propagation-cone-fill"
              type="fill"
              source="propagation-cone-source"
              paint={{
                'fill-color': '#FF4444',
                'fill-opacity': 0.4
              }}
            />
            <Layer
              id="propagation-cone-outline"
              type="line"
              source="propagation-cone-source"
              paint={{
                'line-color': '#FF0000',
                'line-width': 2,
                'line-opacity': 0.8
              }}
            />
          </Source>
        )}

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
            getFeatureDisplayName(hoverInfo.feature)
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

      {/* Incident Declaration Drawer */}
      <Drawer open={showDrawer} onOpenChange={(open) => {
        setShowDrawer(open);
        if (!open) {
          // Show tooltip again when drawer closes
          setTimeout(() => {
            setShowTooltip(true);
          }, 300);
        }
      }}>
        <DrawerContent className="max-h-[80vh] bg-background border-border flex flex-col">
          <DrawerHeader className="border-b border-border sticky top-0 bg-background z-10">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="flex items-center gap-2 text-destructive">
                  <Flame className="h-6 w-6" />
                  Incendio Declarado
                </DrawerTitle>
                <DrawerDescription className="text-muted-foreground">
                  Análisis espacial y datos críticos para la respuesta de emergencia
                </DrawerDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyIncidentData}
                className="flex items-center gap-2 bg-background hover:bg-muted"
                title="Copiar datos del incendio al portapapeles"
              >
                <Copy className="h-4 w-4" />
                Copiar Datos
              </Button>
            </div>
          </DrawerHeader>
          {incendioData && (
            <div className="flex-1 overflow-x-auto">
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 min-w-[1400px] p-2"
                style={{ alignItems: 'stretch' }}
              >
                {/* Incident Info */}
                <Card className="border-destructive/20 bg-destructive/5 flex flex-col h-full min-w-[260px] max-h-[340px] overflow-y-auto">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Información del Incendio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">ID:</span>
                      <span className="text-foreground">#{incendioData.incendio.id_incendio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Nombre:</span>
                      <span className="text-foreground">{incendioData.incendio.nombre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Estado:</span>
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        incendioData.incendio.estado === 'DECLARADO' ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'
                      )}>
                        {incendioData.incendio.estado}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Prioridad:</span>
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        incendioData.incendio.prioridad === 'ALTA' ? 'bg-destructive/20 text-destructive' :
                        incendioData.incendio.prioridad === 'MEDIA' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                        'bg-green-500/20 text-green-600 dark:text-green-400'
                      )}>
                        {incendioData.incendio.prioridad}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Comuna:</span>
                      <span className="text-foreground">{incendioData.comuna_info.nombre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Región:</span>
                      <span className="text-foreground">{incendioData.comuna_info.region}</span>
                    </div>
                    {incendioData.sector_info?.found && (
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Sector:</span>
                        <span className="text-foreground">{incendioData.sector_info.nombre}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-muted-foreground">Fecha:</span>
                      <span className="text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 inline mr-1" />
                        {new Date(incendioData.incendio.created_at).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                {/* Golpe Único Analysis - Critical Priority */}
                <Card className={cn(
                  "border-purple-500/20 flex flex-col h-full min-w-[260px] max-h-[340px] overflow-y-auto",
                  incendioData.golpe_unico_analysis.is_golpe_unico ? "bg-purple-500/10" : "bg-muted/20"
                )}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                      <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      Análisis Golpe Único
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium",
                        incendioData.golpe_unico_analysis.is_golpe_unico 
                          ? 'bg-destructive/20 text-destructive' 
                          : 'bg-green-500/20 text-green-600 dark:text-green-400'
                      )}>
                        {incendioData.golpe_unico_analysis.is_golpe_unico ? 'ZONA GOLPE ÚNICO' : 'ZONA NORMAL'}
                      </span>
                    </div>
                    {incendioData.golpe_unico_analysis.is_golpe_unico && incendioData.golpe_unico_analysis.zona_info && (
                      <div className="mt-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                        <div className="text-sm font-medium text-destructive mb-2">
                          {incendioData.golpe_unico_analysis.zona_info.nombre}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {incendioData.golpe_unico_analysis.zona_info.descripcion}
                        </div>
                      </div>
                    )}
                    {incendioData.golpe_unico_analysis.nearest_golpe_unico && (
                      <div className="mt-3 space-y-2">
                        <div className="text-sm font-medium text-foreground">
                          {incendioData.golpe_unico_analysis.is_golpe_unico ? 'Zona Actual:' : 'Zona Golpe Único Más Cercana:'}
                        </div>
                        <div className="p-2 bg-purple-500/10 rounded border border-purple-500/20">
                          <div className="text-sm font-medium text-foreground mb-1">
                            {incendioData.golpe_unico_analysis.nearest_golpe_unico.nombre}
                          </div>
                          <div className="space-y-1 mb-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Distancia:</span>
                              <span className="text-foreground">{Math.round(incendioData.golpe_unico_analysis.nearest_golpe_unico.distance_meters)} m</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Dirección:</span>
                              <span className="flex items-center gap-1 text-foreground">
                                <Navigation className="h-3 w-3" />
                                {incendioData.golpe_unico_analysis.nearest_golpe_unico.cardinal_direction}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {incendioData.golpe_unico_analysis.nearest_golpe_unico.descripcion}
                          </div>
                          <div className="space-y-1">
                            {incendioData.golpe_unico_analysis.nearest_golpe_unico.coordinates && (
                              <div className="mt-2 pt-2 border-t border-purple-500/20">
                                <div className="text-xs font-medium text-foreground mb-1">Coordenadas:</div>
                                <div className="text-xs text-muted-foreground">
                                  <div>Lat: {incendioData.golpe_unico_analysis.nearest_golpe_unico.coordinates.latitude.toFixed(5)}</div>
                                  <div>Lng: {incendioData.golpe_unico_analysis.nearest_golpe_unico.coordinates.longitude.toFixed(5)}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                {/* Weather Analysis */}
                <Card className="border-blue-500/20 bg-blue-500/5 flex flex-col h-full min-w-[260px] max-h-[340px] overflow-y-auto">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                      <Wind className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Análisis Meteorológico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {incendioData.weather_analysis?.found && incendioData.weather_analysis?.current_conditions ? (
                      <>
                        <div className="flex justify-between">
                          <span className="font-medium text-muted-foreground">Velocidad del Viento:</span>
                          <span className="text-foreground">{incendioData.weather_analysis.current_conditions.wind_speed_kmh || 'N/A'} km/h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-muted-foreground">Dirección:</span>
                          <span className="flex items-center gap-1 text-foreground">
                            <Navigation className="h-4 w-4" />
                            {incendioData.weather_analysis.current_conditions.wind_direction_cardinal || 'N/A'}
                          </span>
                        </div>
                        {incendioData.weather_analysis.fire_propagation && (
                          <>
                            <div className="flex justify-between">
                              <span className="font-medium text-muted-foreground">Propagación:</span>
                              <span className="text-foreground">{incendioData.weather_analysis.fire_propagation.direccion_aproximada || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-muted-foreground">Nivel de Riesgo:</span>
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                incendioData.weather_analysis.fire_propagation.risk_level === 'ALTO' ? 'bg-destructive/20 text-destructive' :
                                incendioData.weather_analysis.fire_propagation.risk_level === 'MEDIO' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                                'bg-green-500/20 text-green-600 dark:text-green-400'
                              )}>
                                {incendioData.weather_analysis.fire_propagation.risk_level || 'N/A'}
                              </span>
                            </div>
                            {incendioData.weather_analysis.fire_propagation.risk_description && (
                              <div className="text-sm text-muted-foreground mt-2 p-2 bg-muted/20 rounded">
                                {incendioData.weather_analysis.fire_propagation.risk_description}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <div className="text-muted-foreground text-center py-4">
                        Datos meteorológicos no disponibles
                      </div>
                    )}
                  </CardContent>
                </Card>
                {/* Water Body Analysis */}
                <Card className="border-cyan-500/20 bg-cyan-500/5 flex flex-col h-full min-w-[260px] max-h-[340px] overflow-y-auto">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                      <Droplets className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      Cuerpos de Agua Cercanos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {incendioData.water_body_analysis.found ? (
                      <>
                        <div className="flex justify-between">
                          <span className="font-medium text-muted-foreground">Nombre:</span>
                          <span className="text-foreground">{incendioData.water_body_analysis.nearest_water_body.nombre}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-muted-foreground">Tipo:</span>
                          <span className="text-foreground">{incendioData.water_body_analysis.nearest_water_body.tipo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-muted-foreground">Distancia:</span>
                          <span className="text-foreground">{Math.round(incendioData.water_body_analysis.nearest_water_body.distance_meters)} m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-muted-foreground">Dirección:</span>
                          <span className="flex items-center gap-1 text-foreground">
                            <Navigation className="h-4 w-4" />
                            {incendioData.water_body_analysis.nearest_water_body.cardinal_direction}
                          </span>
                        </div>
                        {incendioData.water_body_analysis.nearest_water_body.coordinates && (
                          <div className="mt-2 p-2 bg-cyan-500/10 rounded border border-cyan-500/20">
                            <div className="text-xs font-medium text-foreground mb-1">Coordenadas:</div>
                            <div className="text-xs text-muted-foreground">
                              <div>Lat: {incendioData.water_body_analysis.nearest_water_body.coordinates.latitude.toFixed(5)}</div>
                              <div>Lng: {incendioData.water_body_analysis.nearest_water_body.coordinates.longitude.toFixed(5)}</div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-muted-foreground text-center py-4">
                        No se encontraron cuerpos de agua cercanos
                      </div>
                    )}
                  </CardContent>
                </Card>
                {/* Power Line Analysis */}
                <Card className="border-yellow-500/20 bg-yellow-500/5 flex flex-col h-full min-w-[260px] max-h-[340px] overflow-y-auto">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                      <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      Líneas Eléctricas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium",
                        incendioData.power_line_analysis.has_power_lines 
                          ? 'bg-destructive/20 text-destructive' 
                          : 'bg-green-500/20 text-green-600 dark:text-green-400'
                      )}>
                        {incendioData.power_line_analysis.has_power_lines ? 'PRESENTES' : 'NO DETECTADAS'}
                      </span>
                    </div>
                    {incendioData.power_line_analysis.has_power_lines && incendioData.power_line_analysis.nearest_line && (
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium text-muted-foreground">Línea:</span>
                          <span className="text-foreground text-sm">{incendioData.power_line_analysis.nearest_line.nombre}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-muted-foreground">Tensión:</span>
                          <span className="text-foreground">{incendioData.power_line_analysis.nearest_line.tension_kv} kV</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-muted-foreground">Distancia:</span>
                          <span className="text-foreground">{Math.round(incendioData.power_line_analysis.nearest_line.distance_meters)} m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-muted-foreground">Dirección:</span>
                          <span className="flex items-center gap-1 text-foreground">
                            <Navigation className="h-4 w-4" />
                            {incendioData.power_line_analysis.nearest_line.cardinal_direction}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                {/* Road Analysis */}
                <Card className="border-muted-foreground/20 bg-muted/10 flex flex-col h-full min-w-[260px] max-h-[340px] overflow-y-auto">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                      <MapPinIcon className="h-5 w-5 text-muted-foreground" />
                      Análisis de Rutas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {incendioData.road_analysis.found ? (
                      <>
                        <div className="flex justify-between">
                          <span className="font-medium text-muted-foreground">Ruta:</span>
                          <span className="text-foreground">{incendioData.road_analysis.nearest_road.nombre}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-muted-foreground">Categoría:</span>
                          <span className="text-foreground">{incendioData.road_analysis.nearest_road.categoria}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-muted-foreground">Distancia:</span>
                          <span className="text-foreground">{Math.round(incendioData.road_analysis.nearest_road.distance_meters)} m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-muted-foreground">Dirección:</span>
                          <span className="flex items-center gap-1 text-foreground">
                            <Navigation className="h-4 w-4" />
                            {incendioData.road_analysis.nearest_road.cardinal_direction}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-muted-foreground text-center py-4">
                        No se encontraron rutas cercanas
                      </div>
                    )}
                  </CardContent>
                </Card>
                {/* Brigade Analysis */}
                <Card className="border-green-500/20 bg-green-500/5 flex flex-col h-full min-w-[260px] max-h-[340px] overflow-y-auto">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                      <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                      Brigadas Cercanas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {incendioData.brigade_analysis.found ? (
                      <>
                        <div className="flex justify-between">
                          <span className="font-medium text-muted-foreground">Total Brigadas:</span>
                          <span className="text-foreground">{incendioData.brigade_analysis.total_brigades}</span>
                        </div>
                        <div className="space-y-2">
                          {(expandedBrigades ? incendioData.brigade_analysis.brigades : incendioData.brigade_analysis.brigades.slice(0, 2)).map((brigade: any, index: number) => (
                            <div key={index} className="p-2 bg-muted/20 rounded-lg border border-green-500/20">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-sm text-foreground">{brigade.nombre}</span>
                                <span className={cn(
                                  "px-2 py-1 rounded text-xs font-medium",
                                  brigade.estado === 'ACTIVO' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                )}>
                                  {brigade.estado}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div className="flex items-center gap-1">
                                  <MapPinIcon className="h-3 w-3" />
                                  {brigade.distance_km} km - {brigade.comuna}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {brigade.personal?.length || 0} personas
                                </div>
                                {brigade.equipamiento && (
                                  <div className="text-xs">
                                    {brigade.equipamiento.motobomba && <span className="mr-2">🔧 Motobomba</span>}
                                    {brigade.equipamiento.motosierra && <span className="mr-2">⚙️ Motosierra</span>}
                                    {brigade.equipamiento.helitransporte && <span className="mr-2">🚁 {brigade.equipamiento.helitransporte}</span>}
                                  </div>
                                )}
                                {expandedBrigades && (
                                  <div className="mt-2 pt-2 border-t border-green-500/20">
                                    <div className="text-xs font-medium text-foreground mb-1">Personal:</div>
                                    {brigade.personal?.map((person: any, personIndex: number) => (
                                      <div key={personIndex} className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-foreground">{person.code}: {person.name}</span>
                                        <a 
                                          href={`tel:${person.phone}`}
                                          className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                                        >
                                          <Phone className="h-3 w-3" />
                                          {person.phone}
                                        </a>
                                      </div>
                                    )) || <div className="text-xs text-muted-foreground">Sin personal asignado</div>}
                                    {brigade.telefono && (
                                      <div className="mt-2 pt-2 border-t border-green-500/20">
                                        <div className="text-xs font-medium text-foreground mb-1">Teléfono Principal:</div>
                                        <a 
                                          href={`tel:${brigade.telefono.split(',')[0].trim()}`}
                                          className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 text-xs"
                                        >
                                          <Phone className="h-3 w-3" />
                                          {brigade.telefono.split(',')[0].trim()}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {incendioData.brigade_analysis.total_brigades > 2 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExpandedBrigades(!expandedBrigades)}
                              className="w-full h-8 text-xs bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-700 dark:text-green-300"
                            >
                              {expandedBrigades ? (
                                <>
                                  <ChevronUp className="h-3 w-3 mr-1" />
                                  Mostrar menos
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                  +{incendioData.brigade_analysis.total_brigades - 2} brigadas más
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-muted-foreground text-center py-4">
                        No se encontraron brigadas cercanas
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <DrawerFooter className="border-t border-border sticky bottom-0 bg-background z-10">
            <DrawerClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
} 