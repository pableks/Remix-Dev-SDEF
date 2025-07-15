import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils/test-utils';
import { LoginForm } from './login-form';

// Mock the Remix hooks used in the component
vi.mock('@remix-run/react', () => ({
  useActionData: () => undefined,
  useNavigation: () => ({ state: 'idle' }),
  Form: ({ children, ...props }: any) => <form role="form" {...props}>{children}</form>,
}));

describe('LoginForm Component', () => {
  it('should render all form fields', () => {
    const { container } = render(<LoginForm />);
    
    expect(screen.getByPlaceholderText(/usuario@sdef.cl/i)).toBeInTheDocument();
    expect(container.querySelector('input[name="password"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
  });

  it('should render card title and description', () => {
    render(<LoginForm />);
    
    expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument();
    expect(screen.getByText(/ingresa tu usuario o email para acceder al sistema sdef/i)).toBeInTheDocument();
  });

  it('should validate required fields', () => {
    const { container } = render(<LoginForm />);
    
    const usernameInput = screen.getByPlaceholderText(/usuario@sdef.cl/i);
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    
    expect(usernameInput).toBeRequired();
    expect(passwordInput).toBeRequired();
  });

  it('should accept username input', () => {
    render(<LoginForm />);
    
    const usernameInput = screen.getByPlaceholderText(/usuario@sdef.cl/i);
    fireEvent.change(usernameInput, { target: { value: 'test@sdef.cl' } });
    
    expect(usernameInput).toHaveValue('test@sdef.cl');
  });

  it('should accept password input', () => {
    const { container } = render(<LoginForm />);
    
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(passwordInput).toHaveValue('password123');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should have correct form attributes', () => {
    render(<LoginForm />);
    
    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('method', 'POST');
  });

  it('should render forgot password link', () => {
    render(<LoginForm />);
    
    const forgotPasswordLink = screen.getByText(/¿olvidaste tu contraseña\?/i);
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/auth/forgot-password');
  });

  it('should render sign up link', () => {
    render(<LoginForm />);
    
    const signUpLink = screen.getByText(/registrarse/i);
    expect(signUpLink).toBeInTheDocument();
    expect(signUpLink.closest('a')).toHaveAttribute('href', '/auth/signup');
  });

  it('should have correct input names for form submission', () => {
    const { container } = render(<LoginForm />);
    
    const usernameInput = screen.getByPlaceholderText(/usuario@sdef.cl/i);
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    
    expect(usernameInput).toHaveAttribute('name', 'username');
    expect(passwordInput).toHaveAttribute('name', 'password');
  });

  it('should have correct placeholder text', () => {
    render(<LoginForm />);
    
    const usernameInput = screen.getByPlaceholderText(/usuario@sdef.cl/i);
    expect(usernameInput).toHaveAttribute('placeholder', 'usuario@sdef.cl');
  });

  it('should submit form with correct values', () => {
    const { container } = render(<LoginForm />);
    
    const usernameInput = screen.getByPlaceholderText(/usuario@sdef.cl/i);
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /ingresar/i });
    
    fireEvent.change(usernameInput, { target: { value: 'test@sdef.cl' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(usernameInput).toHaveValue('test@sdef.cl');
    expect(passwordInput).toHaveValue('password123');
    
    // Button should be enabled for submission
    expect(submitButton).not.toBeDisabled();
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('should apply custom className', () => {
    const { container } = render(<LoginForm className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should pass through additional props', () => {
    const { container } = render(<LoginForm data-testid="login-form" />);
    
    expect(container.firstChild).toHaveAttribute('data-testid', 'login-form');
  });
}); 