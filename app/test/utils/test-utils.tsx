import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Simple custom render function for React components
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, options);
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render }; 