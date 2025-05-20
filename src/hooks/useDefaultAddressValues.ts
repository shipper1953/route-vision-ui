
export function useDefaultAddressValues() {
  // Load default shipping address from localStorage
  const getDefaultShippingAddress = () => {
    return {
      fromName: localStorage.getItem("fromName") || "John Doe",
      fromCompany: localStorage.getItem("fromCompany") || "Ship Tornado",
      fromStreet1: localStorage.getItem("fromStreet1") || "123 Main St",
      fromStreet2: localStorage.getItem("fromStreet2") || "",
      fromCity: localStorage.getItem("fromCity") || "Boston",
      fromState: localStorage.getItem("fromState") || "MA",
      fromZip: localStorage.getItem("fromZip") || "02108",
      fromCountry: localStorage.getItem("fromCountry") || "US",
      fromPhone: localStorage.getItem("fromPhone") || "555-123-4567",
      fromEmail: localStorage.getItem("fromEmail") || "john@shiptornado.com",
    };
  };

  return {
    getDefaultShippingAddress
  };
}
