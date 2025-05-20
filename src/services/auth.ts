
interface LoginResponse {
  token: string;
}

// This is a mock auth service for development
export const auth = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    // For development, simulate network delay
    await new Promise(r => setTimeout(r, 800));
    
    // Mock authentication - in real app this would call an API
    if (email === "admin@example.com" && password === "password") {
      // Mock admin token with encoded user information
      return {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJuYW1lIjoiQWRtaW4gVXNlciIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4ifQ.8tat9ElR1YMYjGnlGKl5MHyT2-vJXHKKfhpBdesNZzE"
      };
    } else if (email === "user@example.com" && password === "password") {
      // Mock regular user token
      return {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIiLCJuYW1lIjoiUmVndWxhciBVc2VyIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIifQ.aS4WyCOVQlk3TN_bSqg65QRImRRHWEsZw910EUwMNZs"
      };
    }
    
    throw new Error("Invalid credentials");
  }
};
