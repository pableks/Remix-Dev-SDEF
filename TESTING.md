# Testing Guide for My-App-Geo

This guide covers unit testing setup and best practices for the My-App-Geo application using Vitest, React Testing Library, and coverage reporting.

## 🛠️ Setup

### Dependencies

The following testing dependencies have been added to the project:

```bash
pnpm add -D vitest @vitest/ui @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @remix-run/testing
```

### Configuration Files

The following files have been configured for testing:

- `vite.config.ts` - Vitest configuration with coverage settings
- `app/test/setup.ts` - Test environment setup with mocks for MapLibre GL JS
- `app/test/utils/test-utils.tsx` - Custom render utilities
- `package.json` - Test scripts

## 📋 Available Scripts

```bash
# Run tests in watch mode (development)
pnpm test

# Run tests once
pnpm test:run

# Run tests with UI interface
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## 🧪 Testing Patterns

### 1. Authentication Component Testing

Testing login forms and authentication flows:

```typescript
// app/components/auth/login-form.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils/test-utils';
import { LoginForm } from './login-form';

// Mock Remix hooks
vi.mock('@remix-run/react', () => ({
  useActionData: () => undefined,
  useNavigation: () => ({ state: 'idle' }),
  Form: ({ children, ...props }: any) => <form role="form" {...props}>{children}</form>,
}));

describe('LoginForm Component', () => {
  it('should render all form fields', () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText(/usuario \/ email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
  });

  it('should handle form submission', () => {
    render(<LoginForm />);
    
    const usernameInput = screen.getByLabelText(/usuario \/ email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    
    fireEvent.change(usernameInput, { target: { value: 'test@sdef.cl' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(usernameInput).toHaveValue('test@sdef.cl');
    expect(passwordInput).toHaveValue('password123');
  });
});
```

### 2. API Function Testing

Testing API calls with mocked responses:

```typescript
// app/apis/user.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginUser, getCurrentUser } from './user';
import { API } from '~/config/api';

// Mock the API module
vi.mock('~/config/api', () => ({
  API: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const mockAPI = vi.mocked(API);

describe('User API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loginUser', () => {
    it('should login user successfully', async () => {
      const mockResponse = {
        data: {
          access: 'mock-access-token',
          refresh: 'mock-refresh-token'
        }
      };

      mockAPI.post.mockResolvedValueOnce(mockResponse);

      const result = await loginUser({
        username: 'test@sdef.cl',
        password: 'password123'
      });

      expect(mockAPI.post).toHaveBeenCalledWith('/api/auth/login/', {
        username: 'test@sdef.cl',
        password: 'password123'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle login errors', async () => {
      const mockError = new Error('Invalid credentials');
      mockAPI.post.mockRejectedValueOnce(mockError);

      await expect(loginUser({
        username: 'test@sdef.cl',
        password: 'wrongpassword'
      })).rejects.toThrow('Invalid credentials');
    });
  });
});
```

### 3. Map Component Testing

Testing map components with extensive mocking:

```typescript
// app/components/DispatchMapComponent.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/utils/test-utils';
import DispatchMapComponent from './DispatchMapComponent';

// Mock MapLibre GL components
vi.mock('react-map-gl/maplibre', () => ({
  Map: ({ children, ...props }: any) => (
    <div data-testid="map" {...props}>{children}</div>
  ),
  Marker: ({ children, ...props }: any) => (
    <div data-testid="marker" {...props}>{children}</div>
  ),
  NavigationControl: () => <div data-testid="navigation-control" />,
}));

describe('DispatchMapComponent', () => {
  it('should render the map component', () => {
    render(<DispatchMapComponent />);
    
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.getByTestId('navigation-control')).toBeInTheDocument();
  });

  it('should handle incident declaration', async () => {
    const mockResponse = {
      incendio: { id_incendio: 1, nombre: 'Test Incident' }
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    render(<DispatchMapComponent />);
    
    const declareButton = screen.getByText(/declarar incendio/i);
    fireEvent.click(declareButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/incendios/declarar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('longitude')
      });
    });
  });
});
```

### 4. Async Operations Testing

Testing async operations with proper waiting:

```typescript
it('should handle async search operations', async () => {
  const mockSearchResponse = [{
    lat: '-33.0472',
    lon: '-71.6127',
    display_name: 'Valparaíso, Chile'
  }];

  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(mockSearchResponse)
  });

  render(<DispatchMapComponent />);
  
  const searchInput = screen.getByPlaceholderText(/buscar ubicación/i);
  const searchButton = screen.getByRole('button', { name: /search/i });
  
  fireEvent.change(searchInput, { target: { value: 'Valparaíso' } });
  fireEvent.click(searchButton);

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('nominatim.openstreetmap.org/search')
    );
  });
});
```

## 🎯 Testing Best Practices

### 1. Test Structure

- Use descriptive test names that explain what is being tested
- Group related tests with `describe` blocks
- Follow the AAA pattern: Arrange, Act, Assert

### 2. Mocking Strategy

#### API Mocking
```typescript
// Mock the entire API module
vi.mock('~/config/api', () => ({
  API: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));
```

#### Remix Hooks Mocking
```typescript
// Mock Remix hooks for components
vi.mock('@remix-run/react', () => ({
  useActionData: () => undefined,
  useNavigation: () => ({ state: 'idle' }),
  useNavigate: () => vi.fn(),
  Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
}));
```

#### MapLibre GL JS Mocking
```typescript
// Mock map library components
vi.mock('react-map-gl/maplibre', () => ({
  Map: ({ children, ...props }: any) => <div data-testid="map" {...props}>{children}</div>,
  Marker: (props: any) => <div data-testid="marker" {...props} />,
  NavigationControl: () => <div data-testid="navigation-control" />,
}));
```

### 3. User Interactions

Use `@testing-library/user-event` for realistic user interactions:

```typescript
import { userEvent } from '@testing-library/user-event';

const user = userEvent.setup();
await user.click(button);
await user.type(input, 'test value');
```

### 4. Accessibility Testing

Test for accessibility by using semantic queries:

```typescript
// Good - tests accessibility
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email address/i);

// Avoid - fragile and doesn't test accessibility
screen.getByTestId('submit-button');
```

### 5. Error Handling

Test error scenarios:

```typescript
it('should handle API errors', async () => {
  const mockError = new Error('Network error');
  mockAPI.post.mockRejectedValueOnce(mockError);

  await expect(loginUser(loginData)).rejects.toThrow('Network error');
});
```

## 📊 Coverage

The coverage configuration excludes:
- `node_modules/`
- Test files (`app/test/`)
- Configuration files
- Build output
- Type definitions

View coverage reports:
- Terminal: Run `pnpm test:coverage`
- HTML: Open `coverage/index.html` in browser
- JSON: Check `coverage/coverage.json`

## 🔍 Common Testing Scenarios

### Testing State Changes

```typescript
it('should toggle search visibility', () => {
  render(<DispatchMapComponent />);
  
  const toggleButton = screen.getByTitle(/búsqueda avanzada/i);
  
  expect(screen.queryByText(/búsqueda por coordenadas/i)).not.toBeInTheDocument();
  
  fireEvent.click(toggleButton);
  
  expect(screen.getByText(/búsqueda por coordenadas/i)).toBeInTheDocument();
});
```

### Testing Form Validation

```typescript
it('should validate coordinate inputs', () => {
  const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});
  
  render(<DispatchMapComponent />);
  
  // Open coordinate search
  fireEvent.click(screen.getByTitle(/búsqueda avanzada/i));
  
  // Enter invalid coordinates
  fireEvent.change(screen.getByLabelText(/latitud/i), { target: { value: '999' } });
  fireEvent.change(screen.getByLabelText(/longitud/i), { target: { value: '999' } });
  fireEvent.click(screen.getByText(/buscar coordenadas/i));
  
  expect(mockAlert).toHaveBeenCalledWith('Por favor ingresa coordenadas válidas');
  
  mockAlert.mockRestore();
});
```

### Testing Loading States

```typescript
it('should show loading state during API calls', async () => {
  // Mock slow API response
  global.fetch = vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve({
      ok: true,
      json: () => Promise.resolve({ data: 'success' })
    }), 100))
  );

  render(<DispatchMapComponent />);
  
  const button = screen.getByText(/declarar incendio/i);
  fireEvent.click(button);

  // Check loading state
  expect(button).toBeDisabled();

  // Wait for completion
  await waitFor(() => {
    expect(button).not.toBeDisabled();
  });
});
```

## 🚀 Running Tests

### Development Workflow

1. **Watch Mode**: Run `pnpm test` for continuous testing during development
2. **Single Run**: Run `pnpm test:run` before committing changes
3. **Coverage**: Run `pnpm test:coverage` to check test coverage
4. **UI Mode**: Run `pnpm test:ui` for interactive testing interface

### CI/CD Integration

Add to your CI/CD pipeline:

```yaml
- name: Run tests
  run: pnpm test:run

- name: Generate coverage
  run: pnpm test:coverage

- name: Upload coverage reports
  uses: codecov/codecov-action@v3
```

## 📝 Test Organization

```
app/
├── test/
│   ├── setup.ts              # Test environment setup
│   └── utils/
│       └── test-utils.tsx    # Custom render utilities
├── components/
│   ├── auth/
│   │   └── login-form.test.tsx
│   └── DispatchMapComponent.test.tsx
└── apis/
    └── user.test.ts
```

## 🔧 Troubleshooting

### Common Issues

1. **MapLibre GL JS Errors**: Ensure proper mocking in `app/test/setup.ts`
2. **Async Test Failures**: Use `waitFor` for async operations
3. **Mock Cleanup**: Always clear mocks in `beforeEach` hooks
4. **Canvas Errors**: Mock canvas context in test setup

### Debug Tips

- Use `screen.debug()` to see rendered output
- Add `console.log` statements in tests for debugging
- Use `vi.fn().mockImplementation()` for complex mocks
- Check mock call arguments with `expect(mockFn).toHaveBeenCalledWith()`

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [Remix Testing](https://remix.run/docs/en/main/guides/testing)

This testing setup provides comprehensive coverage for authentication, API calls, and map-based dispatch functionality while maintaining good performance and reliability. 