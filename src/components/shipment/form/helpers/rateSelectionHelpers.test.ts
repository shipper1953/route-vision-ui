import { describe, it, expect, afterEach, vi } from "vitest";
import { findRecommendedRateByDate } from "./rateSelectionHelpers";
import type { ShipmentResponse, SmartRate, Rate } from "@/services/easypost";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("findRecommendedRateByDate", () => {
  const baseResponse: Omit<ShipmentResponse, "rates"> & { rates: Rate[] } = {
    id: "shp_123",
    object: "shipment",
    status: "created",
    selected_rate: null,
    rates: []
  };

  it("prefers the cheapest guaranteed SmartRate that meets the required delivery date", () => {
    const smartRates: SmartRate[] = [
      {
        id: "sr_guaranteed_cheapest",
        carrier: "UPS",
        service: "2Day",
        rate: "18.00",
        delivery_days: 2,
        delivery_date: "2024-05-09",
        delivery_date_guaranteed: true,
        time_in_transit: 2
      },
      {
        id: "sr_non_guaranteed_cheaper",
        carrier: "USPS",
        service: "Priority",
        rate: "12.00",
        delivery_days: 3,
        delivery_date: "2024-05-09",
        delivery_date_guaranteed: false,
        time_in_transit: 3
      },
      {
        id: "sr_guaranteed_pricier",
        carrier: "FedEx",
        service: "Express",
        rate: "25.00",
        delivery_days: 1,
        delivery_date: "2024-05-08",
        delivery_date_guaranteed: true,
        time_in_transit: 1
      }
    ];

    const response: ShipmentResponse = {
      ...baseResponse,
      smartRates,
      rates: []
    };

    const result = findRecommendedRateByDate(response, "2024-05-10");

    expect(result?.id).toBe("sr_guaranteed_cheapest");
  });

  it("selects the cheapest viable SmartRate when none are guaranteed but meet the requirement", () => {
    const smartRates: SmartRate[] = [
      {
        id: "sr_viable_low",
        carrier: "UPS",
        service: "Ground",
        rate: "10.00",
        delivery_days: 3,
        delivery_date: "2024-05-09",
        delivery_date_guaranteed: false,
        time_in_transit: 3
      },
      {
        id: "sr_viable_high",
        carrier: "UPS",
        service: "Saver",
        rate: "12.00",
        delivery_days: 2,
        delivery_date: "2024-05-08",
        delivery_date_guaranteed: false,
        time_in_transit: 2
      },
      {
        id: "sr_not_viable",
        carrier: "UPS",
        service: "Slow",
        rate: "5.00",
        delivery_days: 5,
        delivery_date: "2024-05-12",
        delivery_date_guaranteed: false,
        time_in_transit: 5
      }
    ];

    const response: ShipmentResponse = {
      ...baseResponse,
      smartRates,
      rates: []
    };

    const result = findRecommendedRateByDate(response, "2024-05-10");

    expect(result?.id).toBe("sr_viable_low");
  });

  it("falls back to the fastest SmartRate when none meet the required delivery date", () => {
    const smartRates: SmartRate[] = [
      {
        id: "sr_fastest",
        carrier: "UPS",
        service: "Express",
        rate: "30.00",
        delivery_days: 1,
        delivery_date: "2024-05-12",
        delivery_date_guaranteed: false,
        time_in_transit: 1
      },
      {
        id: "sr_slower",
        carrier: "FedEx",
        service: "Ground",
        rate: "20.00",
        delivery_days: 4,
        delivery_date: "2024-05-14",
        delivery_date_guaranteed: false,
        time_in_transit: 4
      },
      {
        id: "sr_unknown",
        carrier: "USPS",
        service: "Parcel",
        rate: "15.00",
        delivery_days: 6,
        delivery_date: undefined,
        delivery_date_guaranteed: false,
        time_in_transit: 6
      }
    ];

    const response: ShipmentResponse = {
      ...baseResponse,
      smartRates,
      rates: []
    };

    const result = findRecommendedRateByDate(response, "2024-05-10");

    expect(result?.id).toBe("sr_fastest");
  });

  it("uses standard rates when SmartRates are unavailable and selects the cheapest viable option", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-01T00:00:00Z"));

    const rates: Rate[] = [
      {
        id: "rate_viable",
        carrier: "UPS",
        service: "Ground",
        rate: "15.00",
        delivery_days: 2,
        delivery_date: null
      },
      {
        id: "rate_not_viable",
        carrier: "UPS",
        service: "Economy",
        rate: "10.00",
        delivery_days: 5,
        delivery_date: null
      },
      {
        id: "rate_unknown",
        carrier: "USPS",
        service: "Parcel",
        rate: "8.00",
        delivery_days: undefined as unknown as number,
        delivery_date: null
      }
    ];

    const response: ShipmentResponse = {
      ...baseResponse,
      smartRates: [],
      rates
    };

    const result = findRecommendedRateByDate(response, "2024-05-04");

    expect(result?.id).toBe("rate_viable");
  });

  it("falls back to the fastest standard rate when none meet the deadline", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-01T00:00:00Z"));

    const rates: Rate[] = [
      {
        id: "rate_fastest",
        carrier: "UPS",
        service: "2Day",
        rate: "25.00",
        delivery_days: 2,
        delivery_date: null
      },
      {
        id: "rate_slower",
        carrier: "FedEx",
        service: "Ground",
        rate: "12.00",
        delivery_days: 4,
        delivery_date: null
      },
      {
        id: "rate_unknown",
        carrier: "USPS",
        service: "Parcel",
        rate: "9.00",
        delivery_days: undefined as unknown as number,
        delivery_date: null
      }
    ];

    const response: ShipmentResponse = {
      ...baseResponse,
      smartRates: undefined,
      rates
    };

    const result = findRecommendedRateByDate(response, "2024-05-02");

    expect(result?.id).toBe("rate_fastest");
  });
});
