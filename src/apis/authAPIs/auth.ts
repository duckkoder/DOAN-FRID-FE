import api from "../axios";

export const login = async (credentials: { username: string; password: string, isRemember: boolean }) => {
//   const response = await api.post("/auth/login", credentials);
    // Mock response for demonstration purposes
    const mockResponse = {
      data: {
        user: {
          id: 1,
          username: credentials.username,
          role: credentials.username.includes("admin") ? "admin" : credentials.username.includes("teacher") ? "teacher" : "student",
          email: "teacher@example.com",
          avatar: "https://example.com/avatar.jpg",
          is_verified: true,
        },
        tokens: {
            accessToken: "mock-jwt-token",
            refreshToken: "mock-refresh-token",
        }
    
      },
    };
    return mockResponse.data;
  };

export const register = async (userData: {
  username: string;
  password: string;
  email: string;
}) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};
