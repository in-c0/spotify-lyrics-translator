export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let expirationTime: number | null = null;

export const setTokens = (tokens: TokenResponse) => {
  expirationTime = Date.now() + tokens.expires_in * 500000; 
  localStorage.setItem('access_token', tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem('refresh_token', tokens.refresh_token); 
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!accessToken || !expirationTime) {
    return null;
  }

  if (Date.now() > expirationTime) {
    const newTokens = await refreshAccessToken();
    if (newTokens) {
      setTokens(newTokens);
    } else {
      return null;
    }
  }

  return accessToken;
};

export const refreshAccessToken = async (): Promise<TokenResponse | null> => {
  refreshToken = localStorage.getItem('spotifyRefreshToken');
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch('/api/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data: TokenResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  expirationTime = null;
  localStorage.removeItem('spotifyRefreshToken');
};