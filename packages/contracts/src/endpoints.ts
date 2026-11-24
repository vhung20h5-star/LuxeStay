export const API_ENDPOINTS = Object.freeze({
  health: "/health",
  catalog: "/api/v1/catalog",
  propertyById: (id: string) => `/api/v1/properties/${encodeURIComponent(id)}`,
  propertyAvailability: (id: string) =>
    `/api/v1/properties/${encodeURIComponent(id)}/availability`,
  propertyReviews: (id: string) =>
    `/api/v1/properties/${encodeURIComponent(id)}/reviews`,
  validateVoucher: "/api/v1/vouchers/validate",
  reservations: "/api/v1/reservations",
  myReservations: "/api/v1/reservations/my",
  reservationById: (bookingId: string) =>
    `/api/v1/reservations/${encodeURIComponent(bookingId.trim().toUpperCase())}`,
  cancelReservation: (bookingId: string) =>
    `/api/v1/reservations/${encodeURIComponent(bookingId.trim().toUpperCase())}/cancel`,
  completeReservation: (bookingId: string) =>
    `/api/v1/reservations/${encodeURIComponent(bookingId.trim().toUpperCase())}/complete`,
  reservationNotifications: (bookingId: string) =>
    `/api/v1/reservations/${encodeURIComponent(bookingId.trim().toUpperCase())}/notifications`,
  authRegister: "/api/v1/auth/register",
  authLogin: "/api/v1/auth/login",
  authLogout: "/api/v1/auth/logout",
  authMe: "/api/v1/auth/me",
  authOtpRequest: "/api/v1/auth/otp/request",
  authOtpVerify: "/api/v1/auth/otp/verify",
  favorites: "/api/v1/favorites",
  toggleFavorite: (propertyId: string) =>
    `/api/v1/favorites/${encodeURIComponent(propertyId.trim())}/toggle`,
  paymentById: (transactionId: string) =>
    `/api/v1/payments/${encodeURIComponent(transactionId.trim().toUpperCase())}`,
  paymentSimulate: (transactionId: string) =>
    `/api/v1/payments/${encodeURIComponent(transactionId.trim().toUpperCase())}/simulate`,
  paymentWebhook: (provider: string) =>
    `/api/v1/payments/webhook/${encodeURIComponent(provider.trim().toLowerCase())}`,
  hostProperties: "/api/v1/host/properties",
  hostPropertyById: (id: string) => `/api/v1/host/properties/${encodeURIComponent(id.trim())}`,
  hostPropertyAvailability: (id: string) =>
    `/api/v1/host/properties/${encodeURIComponent(id.trim())}/availability`,
  hostReservations: "/api/v1/host/reservations",
  hostAnalytics: "/api/v1/host/analytics",
});
