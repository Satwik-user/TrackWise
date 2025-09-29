const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

class AuthService {
  async login(credentials) {
    try {
      // Use JSON login endpoint with correct default credentials
      const response = await fetch(`${API_BASE_URL}/api/auth/login/json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username || 'admin',
          password: credentials.password || 'admin123',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(errorData.detail || errorData.message || 'Login failed');
      }

      const data = await response.json();
      
      // Store token
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('auth_token', data.access_token); // Also store as auth_token for consistency
      
      // Get user info if available
      try {
        const userResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          return { ...data, user: userData };
        }
      } catch (e) {
        console.warn('Could not fetch user info:', e);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  getToken() {
    return localStorage.getItem('token');
  }

  isAuthenticated() {
    return !!this.getToken();
  }
}

export const authService = new AuthService();
export default authService;