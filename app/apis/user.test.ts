import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError } from 'axios';
import { 
  registerUser, 
  loginUser, 
  refreshAuthToken, 
  getCurrentUser, 
  requestPasswordReset, 
  submitPasswordReset, 
  verifyPasswordResetToken, 
  resetPasswordSubmit,
  logoutUser 
} from './user';
import { API } from '~/config/api';

// Mock the API module
vi.mock('~/config/api', () => ({
  API: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock Remix session functions
vi.mock('~/sessions.server', () => ({
  getSession: vi.fn(),
  destroySession: vi.fn(),
}));

// Mock Remix redirect
vi.mock('@remix-run/node', () => ({
  redirect: vi.fn(),
}));

// Replace the API import with our mocked version
const mockAPI = API as any;

// Import the mocked session functions
import { getSession, destroySession } from '~/sessions.server';
const mockGetSession = vi.mocked(getSession);
const mockDestroySession = vi.mocked(destroySession);

describe('User API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        user: {
          email: 'test@sdef.cl',
          username: 'testuser',
          password: 'password123'
        }
      };

      const mockResponse = {
        data: {
          user: { id: 1, email: 'test@sdef.cl', username: 'testuser' },
          message: 'User registered successfully'
        }
      };

      mockAPI.post.mockResolvedValueOnce(mockResponse);

      const result = await registerUser(userData);

      expect(mockAPI.post).toHaveBeenCalledWith('/api/auth/register', userData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle registration errors', async () => {
      const userData = {
        user: {
          email: 'test@sdef.cl',
          username: 'testuser',
          password: 'password123'
        }
      };

      const mockError = new AxiosError('Registration failed');
      mockAPI.post.mockRejectedValueOnce(mockError);

      await expect(registerUser(userData)).rejects.toThrow('Registration failed');
      expect(mockAPI.post).toHaveBeenCalledWith('/api/auth/register', userData);
    });
  });

  describe('loginUser', () => {
    it('should login user successfully', async () => {
      const loginData = {
        username: 'test@sdef.cl',
        password: 'password123'
      };

      const mockResponse = {
        data: {
          access: 'mock-access-token',
          refresh: 'mock-refresh-token'
        }
      };

      mockAPI.post.mockResolvedValueOnce(mockResponse);

      const result = await loginUser(loginData);

      expect(mockAPI.post).toHaveBeenCalledWith('/api/auth/login', loginData);
      expect(result).toEqual(mockResponse);
      expect(result.data.access).toBe('mock-access-token');
      expect(result.data.refresh).toBe('mock-refresh-token');
    });

    it('should handle login errors', async () => {
      const loginData = {
        username: 'test@sdef.cl',
        password: 'wrongpassword'
      };

      const mockError = new AxiosError('Invalid credentials');
      mockAPI.post.mockRejectedValueOnce(mockError);

      await expect(loginUser(loginData)).rejects.toThrow('Invalid credentials');
      expect(mockAPI.post).toHaveBeenCalledWith('/api/auth/login', loginData);
    });
  });

  describe('refreshAuthToken', () => {
    it('should refresh auth token successfully', async () => {
      const refreshData = {
        refresh: 'mock-refresh-token'
      };

      const mockResponse = {
        data: {
          access: 'new-access-token'
        }
      };

      mockAPI.post.mockResolvedValueOnce(mockResponse);

      const result = await refreshAuthToken(refreshData);

      expect(mockAPI.post).toHaveBeenCalledWith('/api/auth/token/refresh', refreshData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle refresh token errors', async () => {
      const refreshData = {
        refresh: 'expired-refresh-token'
      };

      const mockError = new AxiosError('Token expired');
      mockAPI.post.mockRejectedValueOnce(mockError);

      await expect(refreshAuthToken(refreshData)).rejects.toThrow('Token expired');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const accessToken = 'mock-access-token';
      const mockResponse = {
        data: {
          id: 1,
          email: 'test@sdef.cl',
          username: 'testuser',
          role: 'user'
        }
      };

      mockAPI.get.mockResolvedValueOnce(mockResponse);

      const result = await getCurrentUser(accessToken);

      expect(mockAPI.get).toHaveBeenCalledWith('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle unauthorized errors', async () => {
      const accessToken = 'invalid-token';
      const mockError = new AxiosError('Unauthorized');
      mockAPI.get.mockRejectedValueOnce(mockError);

      await expect(getCurrentUser(accessToken)).rejects.toThrow('Unauthorized');
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      const email = 'test@sdef.cl';
      const mockResponse = {
        data: {
          message: 'Password reset email sent'
        }
      };

      mockAPI.post.mockResolvedValueOnce(mockResponse);

      const result = await requestPasswordReset(email);

      expect(mockAPI.post).toHaveBeenCalledWith('/api/auth/reset-password', { email });
      expect(result).toEqual(mockResponse);
    });

    it('should handle password reset request errors', async () => {
      const email = 'nonexistent@sdef.cl';
      const mockError = new AxiosError('User not found');
      mockAPI.post.mockRejectedValueOnce(mockError);

      await expect(requestPasswordReset(email)).rejects.toThrow('User not found');
    });
  });

  describe('submitPasswordReset', () => {
    it('should submit password reset successfully', async () => {
      const resetData = {
        password: 'newpassword123',
        token: 'reset-token'
      };

      const mockResponse = {
        data: {
          message: 'Password reset successful'
        }
      };

      mockAPI.post.mockResolvedValueOnce(mockResponse);

      const result = await submitPasswordReset(resetData);

      expect(mockAPI.post).toHaveBeenCalledWith('/api/auth/reset-password/submit', resetData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle invalid reset token', async () => {
      const resetData = {
        password: 'newpassword123',
        token: 'invalid-token'
      };

      const mockError = new AxiosError('Invalid reset token');
      mockAPI.post.mockRejectedValueOnce(mockError);

      await expect(submitPasswordReset(resetData)).rejects.toThrow('Invalid reset token');
    });
  });

  describe('verifyPasswordResetToken', () => {
    it('should verify password reset token successfully', async () => {
      const token = 'valid-reset-token';
      const mockResponse = {
        data: {
          valid: true
        }
      };

      mockAPI.get.mockResolvedValueOnce(mockResponse);

      const result = await verifyPasswordResetToken(token);

      expect(mockAPI.get).toHaveBeenCalledWith('/api/auth/reset-password/verify', {
        params: { token },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle invalid reset token verification', async () => {
      const token = 'invalid-token';
      const mockError = new AxiosError('Invalid token');
      mockAPI.get.mockRejectedValueOnce(mockError);

      await expect(verifyPasswordResetToken(token)).rejects.toThrow('Invalid token');
    });
  });

  describe('resetPasswordSubmit', () => {
    it('should reset password successfully', async () => {
      const resetData = {
        token: 'reset-token',
        password: 'newpassword123'
      };

      const mockResponse = {
        data: {
          message: 'Password reset successful'
        }
      };

      mockAPI.post.mockResolvedValueOnce(mockResponse);

      const result = await resetPasswordSubmit(resetData);

      expect(mockAPI.post).toHaveBeenCalledWith('/api/auth/reset-password/submit', resetData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('logoutUser', () => {
    it('should logout user successfully', async () => {
      const mockRequest = new Request('http://localhost/logout');
      const mockSession = {
        id: 'mock-session-id',
        data: {},
        has: vi.fn(),
        get: vi.fn().mockReturnValue('mock-refresh-token'),
        set: vi.fn(),
        flash: vi.fn(),
        unset: vi.fn(),
      };
      
      mockGetSession.mockResolvedValue(mockSession);
      mockDestroySession.mockResolvedValue('destroyed-session-cookie');
      
      const mockRedirect = vi.fn().mockReturnValue({ 
        status: 302, 
        headers: { 'Set-Cookie': 'destroyed-session-cookie' } 
      });

      // Mock the redirect function
      vi.mocked(await import('@remix-run/node')).redirect = mockRedirect;

      mockAPI.delete.mockResolvedValueOnce({ data: { message: 'Logged out successfully' } });

      await logoutUser(mockRequest);

      expect(mockGetSession).toHaveBeenCalledWith(null);
      expect(mockAPI.delete).toHaveBeenCalledWith('/api/auth/logout', {
        data: { refresh: 'mock-refresh-token' },
      });
      expect(mockDestroySession).toHaveBeenCalledWith(mockSession);
      expect(mockRedirect).toHaveBeenCalledWith('/auth/login', {
        headers: {
          'Set-Cookie': 'destroyed-session-cookie',
        },
      });
    });

    it('should handle logout errors', async () => {
      const mockRequest = new Request('http://localhost/logout');
      const mockSession = {
        id: 'mock-session-id',
        data: {},
        has: vi.fn(),
        get: vi.fn().mockReturnValue('mock-refresh-token'),
        set: vi.fn(),
        flash: vi.fn(),
        unset: vi.fn(),
      };
      
      mockGetSession.mockResolvedValue(mockSession);

      const mockError = new AxiosError('Logout failed');
      mockError.response = {
        data: { error: 'Invalid refresh token' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      mockAPI.delete.mockRejectedValueOnce(mockError);

      const result = await logoutUser(mockRequest);

      expect(result).toEqual({
        errors: [
          'Invalid refresh token',
          'Logout failed',
        ],
      });
    });
  });
}); 