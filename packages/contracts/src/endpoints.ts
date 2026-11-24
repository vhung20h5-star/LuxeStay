export const API_ENDPOINTS = Object.freeze({
  health: "/health",
  catalog: "/api/v1/catalog",
  propertyById: (id: string) => `/api/v1/properties/${encodeURIComponent(id)}`,
  reservations: "/api/v1/reservations",
});
