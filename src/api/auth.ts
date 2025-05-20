
// Mock API functions for authentication

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    companyId?: string;
  };
  company?: {
    id: string;
    name: string;
  };
}

export interface MeResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    companyId?: string;
  };
  company?: {
    id: string;
    name: string;
  };
}

export async function loginAPI(data: LoginData): Promise<{ data: AuthResponse }> {
  // This is a mock implementation
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      resolve({
        data: {
          token: "mock.jwt.token",
          user: {
            id: "1",
            email: data.email,
            firstName: "Demo",
            lastName: "User",
            roles: ["User"],
          },
          company: {
            id: "1",
            name: "Demo Company",
          },
        },
      });
    }, 500);
  });
}

export async function getMeAPI(): Promise<{ data: MeResponse }> {
  // This is a mock implementation
  return new Promise((resolve, reject) => {
    // Get token from localStorage
    const token = localStorage.getItem("token");
    
    if (!token) {
      reject(new Error("No token found"));
      return;
    }
    
    // Simulate network delay
    setTimeout(() => {
      resolve({
        data: {
          user: {
            id: "1",
            email: "user@example.com",
            firstName: "Demo",
            lastName: "User",
            roles: ["User"],
          },
          company: {
            id: "1",
            name: "Demo Company",
          },
        },
      });
    }, 500);
  });
}
