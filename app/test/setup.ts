import '@testing-library/jest-dom';

// Mock global objects that might not be available in test environment
global.ResizeObserver = global.ResizeObserver || class ResizeObserver {
  constructor(cb: any) {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock MapLibre GL JS for map components
global.maplibregl = {
  Map: class MockMap {
    constructor() {}
    on() {}
    off() {}
    remove() {}
    addSource() {}
    removeSource() {}
    addLayer() {}
    removeLayer() {}
    setStyle() {}
    getStyle() {}
    isStyleLoaded() { return true; }
    loaded() { return true; }
    getSource() { return {}; }
    hasImage() { return false; }
    addImage() {}
    removeImage() {}
    easeTo() {}
    flyTo() {}
    setCenter() {}
    getCenter() { return { lng: 0, lat: 0 }; }
    setZoom() {}
    getZoom() { return 10; }
    setPitch() {}
    getPitch() { return 0; }
    setMaxPitch() {}
    setBearing() {}
    getBearing() { return 0; }
    setTerrain() {}
    setSky() {}
    queryRenderedFeatures() { return []; }
    project() { return { x: 0, y: 0 }; }
    unproject() { return { lng: 0, lat: 0 }; }
    getBounds() { return { _ne: { lng: 0, lat: 0 }, _sw: { lng: 0, lat: 0 } }; }
    fitBounds() {}
    resize() {}
  },
  NavigationControl: class MockNavigationControl {
    constructor() {}
    onAdd() { return document.createElement('div'); }
    onRemove() {}
  },
  Marker: class MockMarker {
    constructor() {}
    setLngLat() { return this; }
    addTo() { return this; }
    remove() {}
    getElement() { return document.createElement('div'); }
    setDraggable() { return this; }
    on() { return this; }
    off() { return this; }
  },
  Popup: class MockPopup {
    constructor() {}
    setLngLat() { return this; }
    setHTML() { return this; }
    addTo() { return this; }
    remove() {}
    isOpen() { return false; }
  },
  supported: () => true,
};

// Mock URL.createObjectURL for file handling
global.URL.createObjectURL = vi.fn(() => 'mocked-url');
global.URL.revokeObjectURL = vi.fn();

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('')),
  },
});

// Mock geolocation API
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  },
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock MutationObserver
global.MutationObserver = class MutationObserver {
  constructor() {}
  observe() {}
  disconnect() {}
};

// Mock canvas context for map rendering
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
}));

// Mock WebGL context for map rendering
HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
  if (type === 'webgl' || type === 'webgl2') {
    return {
      getExtension: vi.fn(),
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      createProgram: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      useProgram: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      getAttribLocation: vi.fn(),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      drawArrays: vi.fn(),
      viewport: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      depthFunc: vi.fn(),
      blendFunc: vi.fn(),
      createTexture: vi.fn(),
      bindTexture: vi.fn(),
      texImage2D: vi.fn(),
      texParameteri: vi.fn(),
      generateMipmap: vi.fn(),
      activeTexture: vi.fn(),
      uniform1i: vi.fn(),
      uniform1f: vi.fn(),
      uniform2f: vi.fn(),
      uniform3f: vi.fn(),
      uniform4f: vi.fn(),
      uniformMatrix4fv: vi.fn(),
      getUniformLocation: vi.fn(),
      deleteShader: vi.fn(),
      deleteProgram: vi.fn(),
      deleteBuffer: vi.fn(),
      deleteTexture: vi.fn(),
      isContextLost: vi.fn(() => false),
      canvas: document.createElement('canvas'),
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
    };
  }
  return null;
}); 