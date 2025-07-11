import type {LayerProps} from 'react-map-gl/maplibre';
import {range} from 'd3-array';
import {scaleQuantile} from 'd3-scale';
import type GeoJSON from 'geojson';

// Layer configuration system
export const LAYER_CONFIGS = [
  {
    id: 'centrales-enhanced',
    name: 'Centrales Enhanced',
    file: '/recursos_actualizados_centrales_point_enhanced.geojson',
    color: '#4CAF50',
    enabled: true,
    type: 'point-enhanced' as const
  },
  {
    id: 'zonasur-activas',
    name: 'Zona Sur (Activas)',
    file: '/recursos_actualizados_zonasur_activas.geojson',
    color: '#ff0000',
    enabled: true,
    type: 'point-enhanced' as const
  },
  {
    id: 'hidro-poligonos',
    name: 'Cuerpos de Agua',
    file: '/hidro_polig_multipolygon.geojson',
    color: '#2563eb',
    enabled: true,
    type: 'water-polygons' as const
  },
  {
    id: 'golpe-unico',
    name: 'Golpe Único',
    file: '/golpe_unico.geojson',
    color: '#dc2626',
    enabled: true,
    type: 'priority-polygons' as const
  },
  {
    id: 'red-vial',
    name: 'Red Vial Valparaíso',
    file: '/red_vial_valparaiso.geojson',
    color: '#6b7280',
    enabled: true,
    type: 'road-network' as const
  },
  {
    id: 'comunas-administrativas',
    name: 'Comunas Administrativas',
    file: '/comunas_administrativas.geojson',
    color: '#10b981',
    enabled: false,
    type: 'administrative-regions' as const
  },
  {
    id: 'sistema-electrico',
    name: 'Sistema Eléctrico',
    file: '/sistema_electrico.geojson',
    color: '#eab308',
    enabled: false,
    type: 'electrical-system' as const
  }
];

// Types
export interface IconGroup {
  iconPath: string;
  iconId: string;
  features: any[];
  color?: string;
  scale?: number;
  labelColor?: string;
}

export interface EnhancedLayer {
  layer: any;
  data: any;
  textLayer?: any;
  strokeLayer?: any;
}

export interface LayerConfig {
  id: string;
  name: string;
  file: string;
  color: string;
  enabled: boolean;
  type: 'point-enhanced' | 'water-polygons' | 'priority-polygons' | 'road-network' | 'administrative-regions' | 'electrical-system';
}

// Helper function to convert KML ABGR color to CSS RGBA
export const convertKmlColor = (kmlColor: string): string => {
  if (!kmlColor || kmlColor.length !== 8) return '#000000';
  
  // KML color format is AABBGGRR (Alpha, Blue, Green, Red)
  const alpha = parseInt(kmlColor.substr(0, 2), 16) / 255;
  const blue = parseInt(kmlColor.substr(2, 2), 16);
  const green = parseInt(kmlColor.substr(4, 2), 16);
  const red = parseInt(kmlColor.substr(6, 2), 16);
  
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

// Helper function to get icon path
export const getIconPath = (feature: any): string => {
  const kmlIconHref = feature.properties?.kml_icon_href;
  
  // Map common KML icon references to actual files
  if (kmlIconHref) {
    if (kmlIconHref.includes('frecuencia') || kmlIconHref.includes('frequency')) {
      return '/files/frecuencia_1.png';
    } else if (kmlIconHref.includes('casco') || kmlIconHref.includes('helmet')) {
      return '/files/casco-de-seguridad_01_1.png';
    }
  }
  
  // Check style URL for fallback
  const styleUrl = feature.properties?.kml_styleUrl;
  if (styleUrl) {
    if (styleUrl.includes('frecuencia')) {
      return '/files/frecuencia_1.png';
    } else if (styleUrl.includes('casco')) {
      return '/files/casco-de-seguridad_01_1.png';
    }
  }
  
  // Default to frecuencia icon
  return '/files/frecuencia_1.png';
};

// Helper function to get icon color from KML style
export const getIconColor = (feature: any): string => {
  const kmlStyleUrl = feature.properties?.kml_styleUrl;
  
  const styleColorMap = {
    '#msn_frecuencia10': 'ff00ffff',
    '#msn_frecuencia000': 'ff00ffff',
    '#sn_frecuencia2': 'ff00ffff',
    '#msn_casco-de-seguridad00034': 'ff0000ff'
  };
  
  const kmlColor = styleColorMap[kmlStyleUrl] || 'ff00ffff';
  return convertKmlColor(kmlColor);
};

// Helper function to get label color from KML style
export const getLabelColor = (feature: any): string => {
  const kmlLabelColor = feature.properties?.kml_label_color;
  if (kmlLabelColor) {
    return kmlLabelColor;
  }
  
  return convertKmlColor('aa00ffaa');
};

// Helper function to get icon scale
export const getIconScale = (feature: any): number => {
  const kmlIconScale = feature.properties?.kml_icon_scale;
  // Scale down significantly since PNG files are typically large
  // Default to 0.03 for reasonable size (much smaller than before)
  const baseScale = 0.03;
  return kmlIconScale ? parseFloat(kmlIconScale) * baseScale : baseScale;
};

// Helper function to get water type colors
export const getWaterTypeColor = (feature: any): string => {
  const tipoMagua = feature.properties?.TIPO_MAGUA;
  switch (tipoMagua) {
    case 'Embalse':
      return '#1d4ed8';
    case 'Laguna':
      return '#3b82f6';
    case 'Río':
      return '#06b6d4';
    default:
      return '#2563eb';
  }
};

// Helper function to get display name for water bodies
export const getWaterDisplayName = (feature: any): string => {
  const name = feature.properties?.Name || feature.properties?.NOMBRE;
  if (!name || name.trim() === '') {
    const tipo = feature.properties?.TIPO_MAGUA || 'Cuerpo de Agua';
    const fid = feature.properties?.FID;
    return `${tipo}${fid ? ` #${fid}` : ''}`;
  }
  return name;
};

// Helper function to get priority level color
export const getPriorityColor = (feature: any): string => {
  const name = feature.properties?.Name || '';
  const sourceLayer = feature.properties?.source_layer || '';
  
  if (name.includes('ALTA') || sourceLayer.includes('P.ALTA')) {
    return '#dc2626';
  } else if (name.includes('MEDIA') || sourceLayer.includes('P.MEDIA')) {
    return '#ea580c';
  } else if (name.includes('BAJA') || sourceLayer.includes('P.BAJA')) {
    return '#f59e0b';
  }
  return '#dc2626';
};

// Helper function to get road type color based on source layer
export const getRoadTypeColor = (sourceLayer: string): string => {
  switch (sourceLayer) {
    case 'autopistas':
      return '#dc2626';
    case 'rutas_troncales':
      return '#ea580c';
    case 'rutas_colectoras':
      return '#f59e0b';
    case 'rutas_locales':
      return '#84cc16';
    case 'caminos_publicos':
      return '#22d3ee';
    case 'otros_viales':
      return '#6b7280';
    default:
      return '#6b7280';
  }
};

// Helper function to get road type display name
export const getRoadTypeDisplayName = (sourceLayer: string): string => {
  switch (sourceLayer) {
    case 'autopistas':
      return 'Autopistas';
    case 'rutas_troncales':
      return 'Rutas Troncales';
    case 'rutas_colectoras':
      return 'Rutas Colectoras';
    case 'rutas_locales':
      return 'Rutas Locales';
    case 'caminos_publicos':
      return 'Caminos Públicos';
    case 'otros_viales':
      return 'Otros Viales';
    default:
      return 'Vías de Transporte';
  }
};

// Helper function to get administrative region color based on source layer
export const getAdministrativeRegionColor = (sourceLayer: string): string => {
  // Different colors for different provinces/regions
  switch (sourceLayer) {
    case 'P. San Antonio_MultiPolygon':
      return '#3b82f6'; // Blue
    case 'P. Valparaíso_MultiPolygon':
      return '#10b981'; // Green
    case 'P. Petorca_MultiPolygon':
      return '#f59e0b'; // Orange
    case 'P. Quillota_MultiPolygon':
      return '#8b5cf6'; // Purple
    case 'P. San Felipe de Aconcagua_MultiPolygon':
      return '#ef4444'; // Red
    case 'P. Los Andes_MultiPolygon':
      return '#06b6d4'; // Cyan
    case 'P. Isla de Pascua_MultiPolygon':
      return '#84cc16'; // Lime
    case 'P. Marga Marga_MultiPolygon':
      return '#f97316'; // Orange
    default:
      // Generate a consistent color based on source layer name
      const hash = sourceLayer.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const hue = Math.abs(hash) % 360;
      return `hsl(${hue}, 70%, 50%)`;
  }
};

// Helper function to get administrative region display name
export const getAdministrativeRegionDisplayName = (sourceLayer: string): string => {
  switch (sourceLayer) {
    case 'P. San Antonio_MultiPolygon':
      return 'Provincia San Antonio';
    case 'P. Valparaíso_MultiPolygon':
      return 'Provincia Valparaíso';
    case 'P. Petorca_MultiPolygon':
      return 'Provincia Petorca';
    case 'P. Quillota_MultiPolygon':
      return 'Provincia Quillota';
    case 'P. San Felipe de Aconcagua_MultiPolygon':
      return 'Provincia San Felipe de Aconcagua';
    case 'P. Los Andes_MultiPolygon':
      return 'Provincia Los Andes';
    case 'P. Isla de Pascua_MultiPolygon':
      return 'Provincia Isla de Pascua';
    case 'P. Marga Marga_MultiPolygon':
      return 'Provincia Marga Marga';
    case 'Comunas_Administrativas_MultiPolygon':
      return 'Comunas Administrativas';
    case 'regional-limits':
      return 'Límites Regionales';
    default:
      return sourceLayer.replace('_MultiPolygon', '').replace('P. ', 'Provincia ');
  }
};

// Helper function to get electrical system color based on voltage level
export const getElectricalSystemColor = (sourceLayer: string): string => {
  switch (sourceLayer) {
    case '500 kV_MultiLineString':
      return '#dc2626'; // Red for highest voltage (500kV)
    case '220 kV_MultiLineString':
      return '#ea580c'; // Orange for medium-high voltage (220kV)
    case '110 kV_MultiLineString':
      return '#eab308'; // Yellow for medium voltage (110kV)
    case '66 kV_MultiLineString':
      return '#84cc16'; // Green for lower voltage (66kV)
    case '33 kV_MultiLineString':
      return '#06b6d4'; // Cyan for low voltage (33kV)
    case '13.8 kV_MultiLineString':
      return '#8b5cf6'; // Purple for very low voltage (13.8kV)
    default:
      return '#6b7280'; // Gray for unknown voltage levels
  }
};

// Helper function to get electrical system line width based on voltage level
export const getElectricalSystemLineWidth = (sourceLayer: string): number => {
  switch (sourceLayer) {
    case '500 kV_MultiLineString':
      return 4; // Thickest lines for highest voltage
    case '220 kV_MultiLineString':
      return 3; // Medium-thick lines
    case '110 kV_MultiLineString':
      return 2; // Medium lines
    case '66 kV_MultiLineString':
      return 1.5; // Thinner lines
    case '33 kV_MultiLineString':
      return 1; // Thin lines
    case '13.8 kV_MultiLineString':
      return 0.8; // Very thin lines
    default:
      return 1; // Default line width
  }
};

// Helper function to get electrical system display name
export const getElectricalSystemDisplayName = (sourceLayer: string): string => {
  switch (sourceLayer) {
    case '500 kV_MultiLineString':
      return 'Líneas 500kV';
    case '220 kV_MultiLineString':
      return 'Líneas 220kV';
    case '110 kV_MultiLineString':
      return 'Líneas 110kV';
    case '66 kV_MultiLineString':
      return 'Líneas 66kV';
    case '33 kV_MultiLineString':
      return 'Líneas 33kV';
    case '13.8 kV_MultiLineString':
      return 'Líneas 13.8kV';
    default:
      return sourceLayer.replace('_MultiLineString', '').replace(' kV', 'kV');
  }
};

// Utility function to update percentiles
export function updatePercentiles(
  featureCollection: GeoJSON.FeatureCollection<GeoJSON.Geometry>,
  accessor: (f: GeoJSON.Feature<GeoJSON.Geometry>) => number
): GeoJSON.FeatureCollection<GeoJSON.Geometry> {
  const {features} = featureCollection;
  const scale = scaleQuantile().domain(features.map(accessor)).range(range(9));
  return {
    type: 'FeatureCollection',
    features: features.map(f => {
      const value = accessor(f);
      const properties = {
        ...f.properties,
        value,
        percentile: scale(value)
      };
      return {...f, properties};
    })
  };
}

// Layer creation functions
export const createRoadNetworkLayers = (data: any): EnhancedLayer[] => {
  const layers: EnhancedLayer[] = [];
  
  // Group features by source layer
  const roadsByType = data.features.reduce((acc, feature) => {
    const sourceLayer = feature.properties?.source_layer || 'otros_viales';
    if (!acc[sourceLayer]) {
      acc[sourceLayer] = [];
    }
    acc[sourceLayer].push(feature);
    return acc;
  }, {});

  // Create a layer for each road type
  Object.entries(roadsByType).forEach(([sourceLayer, features]) => {
    const roadData = {
      type: 'FeatureCollection',
      features
    };

    const color = getRoadTypeColor(sourceLayer);
    const displayName = getRoadTypeDisplayName(sourceLayer);

    layers.push({
      layer: {
        id: `road-${sourceLayer}`,
        type: 'line',
        paint: {
          'line-color': color,
          'line-width': [
            'case',
            ['==', ['get', 'source_layer'], 'autopistas'], 4,
            ['==', ['get', 'source_layer'], 'rutas_troncales'], 3,
            ['==', ['get', 'source_layer'], 'rutas_colectoras'], 2,
            1
          ],
          'line-opacity': 0.9 // Increased opacity for better visibility
        },
        metadata: {
          displayName,
          sourceLayer,
          color
        }
      },
      data: roadData
    });
  });

  return layers;
};

export const createPriorityPolygonLayers = (data: any): EnhancedLayer[] => {
  if (!data || !data.features) return [];
  
  const layers: EnhancedLayer[] = [];
  
  // Create fill layer for priority zones
  const fillLayer = {
    id: 'priority-polygons-fill',
    type: 'fill',
    layout: {},
    paint: {
      'fill-color': [
        'case',
        ['in', 'ALTA', ['get', 'Name']], '#dc2626',
        ['in', 'MEDIA', ['get', 'Name']], '#ea580c', 
        ['in', 'BAJA', ['get', 'Name']], '#f59e0b',
        '#dc2626' // Default red
      ],
      'fill-opacity': 0.4, // Reduced opacity as in example
      'fill-outline-color': '#ffffff' // White outline
    }
  };
  
  // Create stroke layer for priority zones with white borders
  const strokeLayer = {
    id: 'priority-polygons-stroke',
    type: 'line',
    layout: {},
    paint: {
      'line-color': '#ffffff', // White borders as requested
      'line-width': 2,
      'line-opacity': 0.9
    }
  };
  
  // Create text layer for labels
  const textLayer = {
    id: 'priority-polygons-text',
    type: 'symbol',
    layout: {
      'text-field': ['get', 'Name'],
      'text-font': ['Open Sans Regular'],
      'text-size': 11,
      'text-anchor': 'center',
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-max-width': 10,
      'text-line-height': 1.2
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#000000',
      'text-halo-width': 2
    }
  };
  
  layers.push({ 
    layer: fillLayer, 
    data: data, 
    textLayer,
    strokeLayer
  });
  
  return layers;
};

export const createWaterPolygonLayers = (data: any): EnhancedLayer[] => {
  const layers: EnhancedLayer[] = [];
  
  // Group features by water type
  const waterByType = data.features.reduce((acc, feature) => {
    const tipoMagua = feature.properties?.TIPO_MAGUA || 'Otros';
    if (!acc[tipoMagua]) {
      acc[tipoMagua] = [];
    }
    acc[tipoMagua].push(feature);
    return acc;
  }, {});

  // Create a layer for each water type
  Object.entries(waterByType).forEach(([tipoMagua, features]) => {
    const waterData = {
      type: 'FeatureCollection',
      features
    };

    const color = getWaterTypeColor(features[0]);

    layers.push({
      layer: {
        id: `water-${tipoMagua.toLowerCase()}`,
        type: 'fill',
        paint: {
          'fill-color': color,
          'fill-opacity': 0.7, // Increased opacity for better visibility
          'fill-outline-color': color
        },
        metadata: {
          displayName: tipoMagua,
          waterType: tipoMagua,
          color
        }
      },
      data: waterData
    });
  });

  return layers;
};

export const createEnhancedCentralesLayers = (data: any, layerType: string): EnhancedLayer[] => {
  const enhancedLayers: EnhancedLayer[] = [];

  // Group features by icon path
  const iconGroups: { [key: string]: IconGroup } = data.features.reduce((acc, feature) => {
    const iconPath = getIconPath(feature);
    if (!acc[iconPath]) {
      acc[iconPath] = {
        iconPath,
        iconId: `${layerType}-${iconPath.replace(/[^a-zA-Z0-9]/g, '-')}`,
        features: [],
        color: getIconColor(feature),
        labelColor: getLabelColor(feature),
        scale: getIconScale(feature)
      };
    }
    acc[iconPath].features.push(feature);
    return acc;
  }, {});

  // Create layers for each icon group
  Object.values(iconGroups).forEach((group: IconGroup) => {
    const iconId = group.iconId;
    const labelColor = group.labelColor || '#aaff00';

    const layerData = {
      type: 'FeatureCollection',
      features: group.features
    };

    // Main icon layer
    const layer: LayerProps = {
      id: iconId,
      type: 'symbol',
      layout: {
        'icon-image': iconId,
        'icon-size': [
          'case',
          ['has', 'kml_icon_scale'],
          ['*', ['to-number', ['get', 'kml_icon_scale']], 0.03], // Scale down PNG files significantly
          0.03 // Default very small size for PNG files
        ],
        'icon-anchor': 'center',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-offset': [0, 0]
      },
      paint: {
        'icon-opacity': 0.9
      }
    };
    
    // Text layer for labels
    const textLayer: LayerProps = {
      id: `${iconId}-text`,
      type: 'symbol',
      layout: {
        'text-field': ['get', 'Name'],
        'text-font': ['Open Sans Regular'],
        'text-size': 12,
        'text-offset': [0.7, 0], // Move text to the right of the icon
        'text-anchor': 'left',   // Anchor text to the left side of the offset point
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      paint: {
        'text-color': labelColor,
        'text-halo-color': '#000000',
        'text-halo-width': 1
      }
    };

    enhancedLayers.push({
      layer,
      data: layerData,
      textLayer
    });
  });
  
  return enhancedLayers;
};

// SVG placemark icon as data URI
export const placemarkIcon = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 20 12 20s12-12.8 12-20c0-6.6-5.4-12-12-12z" fill="#000000" stroke="#ffffff" stroke-width="2"/>
    <circle cx="12" cy="12" r="4" fill="#ffffff"/>
  </svg>`
)}`;

// Layer creation function for administrative regions
export const createAdministrativeRegionLayers = (data: any): EnhancedLayer[] => {
  const layers: EnhancedLayer[] = [];
  
  // Separate regional limits from administrative regions
  const regionalLimits: any[] = [];
  const administrativeRegions: any[] = [];
  
  data.features.forEach((feature: any) => {
    const name = feature.properties?.Name || '';
    if (name.includes('LIMITE REGIONAL') || name.includes('REGIONAL LIMIT')) {
      regionalLimits.push(feature);
    } else {
      administrativeRegions.push(feature);
    }
  });

  // Handle regional limits as lines only
  if (regionalLimits.length > 0) {
    const regionalLimitData = {
      type: 'FeatureCollection',
      features: regionalLimits
    };

    const strokeLayer = {
      id: 'administrative-regions-regional-limits',
      type: 'line',
      paint: {
        'line-color': '#dc2626', // Red color for regional limits
        'line-width': 3,
        'line-opacity': 0.9,
        'line-dasharray': [5, 5] // Dashed line for regional boundaries
      },
      metadata: {
        displayName: 'Límites Regionales',
        sourceLayer: 'regional-limits',
        color: '#dc2626'
      }
    };

    layers.push({
      layer: strokeLayer,
      data: regionalLimitData
    });
  }

  // Group remaining features by source layer
  const regionsBySourceLayer = administrativeRegions.reduce((acc: any, feature: any) => {
    const sourceLayer = feature.properties?.source_layer || 'unknown';
    if (!acc[sourceLayer]) {
      acc[sourceLayer] = [];
    }
    acc[sourceLayer].push(feature);
    return acc;
  }, {});

  // Create a layer for each source layer (province)
  Object.entries(regionsBySourceLayer).forEach(([sourceLayer, features]: [string, any]) => {
    const regionData = {
      type: 'FeatureCollection',
      features
    };

    const color = getAdministrativeRegionColor(sourceLayer);
    const displayName = getAdministrativeRegionDisplayName(sourceLayer);

    // Create fill layer with low opacity
    const fillLayer = {
      id: `administrative-regions-fill-${sourceLayer}`,
      type: 'fill',
      paint: {
        'fill-color': color,
        'fill-opacity': 0.15, // Low opacity as requested
        'fill-outline-color': color
      },
      metadata: {
        displayName,
        sourceLayer,
        color
      }
    };

    // Create stroke layer for borders
    const strokeLayer = {
      id: `administrative-regions-stroke-${sourceLayer}`,
      type: 'line',
      paint: {
        'line-color': color,
        'line-width': 2,
        'line-opacity': 0.8
      },
      metadata: {
        displayName,
        sourceLayer,
        color
      }
    };

    // Create text layer for labels (only for non-regional-limit features)
    const textLayer = {
      id: `administrative-regions-text-${sourceLayer}`,
      type: 'symbol',
      layout: {
        'text-field': ['get', 'Name'],
        'text-font': ['Open Sans Regular'],
        'text-size': 12,
        'text-anchor': 'center',
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'text-max-width': 12,
        'text-line-height': 1.2
      },
      paint: {
        'text-color': color,
        'text-halo-color': '#ffffff',
        'text-halo-width': 1
      },
      metadata: {
        displayName,
        sourceLayer,
        color
      }
    };

    layers.push({
      layer: fillLayer,
      data: regionData,
      textLayer,
      strokeLayer
    });
  });

  return layers;
};

// Layer creation function for electrical system
export const createElectricalSystemLayers = (data: any): EnhancedLayer[] => {
  const layers: EnhancedLayer[] = [];
  
  // Group features by voltage level (source layer)
  const linesByVoltage = data.features.reduce((acc: any, feature: any) => {
    const sourceLayer = feature.properties?.source_layer || 'unknown';
    if (!acc[sourceLayer]) {
      acc[sourceLayer] = [];
    }
    acc[sourceLayer].push(feature);
    return acc;
  }, {});

  // Create a layer for each voltage level
  Object.entries(linesByVoltage).forEach(([sourceLayer, features]: [string, any]) => {
    const electricalData = {
      type: 'FeatureCollection',
      features
    };

    const color = getElectricalSystemColor(sourceLayer);
    const lineWidth = getElectricalSystemLineWidth(sourceLayer);
    const displayName = getElectricalSystemDisplayName(sourceLayer);

    // Create line layer for electrical transmission lines
    const lineLayer = {
      id: `electrical-system-${sourceLayer}`,
      type: 'line',
      paint: {
        'line-color': color,
        'line-width': lineWidth,
        'line-opacity': 0.8
      },
      metadata: {
        displayName,
        sourceLayer,
        color,
        lineWidth
      }
    };

    // Create text layer for line labels (showing line names)
    const textLayer = {
      id: `electrical-system-text-${sourceLayer}`,
      type: 'symbol',
      layout: {
        'text-field': ['get', 'Name'],
        'text-font': ['Open Sans Regular'],
        'text-size': 10,
        'text-anchor': 'center',
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'text-max-width': 15,
        'text-line-height': 1.2,
        'symbol-placement': 'line',
        'text-rotation-alignment': 'map'
      },
      paint: {
        'text-color': color,
        'text-halo-color': '#ffffff',
        'text-halo-width': 1,
        'text-opacity': 0.8
      },
      metadata: {
        displayName,
        sourceLayer,
        color
      }
    };

    layers.push({
      layer: lineLayer,
      data: electricalData,
      textLayer
    });
  });

  return layers;
}; 