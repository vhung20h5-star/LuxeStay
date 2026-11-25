import type {
  ActivitiesCatalogResponse,
  ActivitiesQueryParams,
  ActivityBooking,
  ActivityDetailResponse,
  AuthUser,
  BookingDetails,
  CatalogSnapshot,
  CreateReviewInput,
  CreateReviewResult,
  DealDetail,
  DealsHub,
  LoginInput,
  NotificationLog,
  OtpRequestInput,
  OtpRequestResult,
  OtpVerifyInput,
  PaymentGatewaySession,
  PaymentSimulateInput,
  PaymentWebhookResult,
  Property,
  PropertyAvailabilityData,
  RegisterInput,
  ReservationSubmitter,
  ServiceBookingIntent,
  ValidateVoucherInput,
  VoucherValidationResult,
} from "@luxestay/contracts";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface StorageEventLike {
  key: string | null;
}

export interface StorageEventTargetLike {
  addEventListener(type: "storage", listener: (event: StorageEventLike) => void): void;
  removeEventListener(type: "storage", listener: (event: StorageEventLike) => void): void;
}

export interface FavoritesRepository {
  getSnapshot(): readonly string[];
  getServerSnapshot(): readonly string[];
  toggle(propertyId: string): readonly string[];
  setAll(propertyIds: readonly string[]): readonly string[];
  subscribe(listener: () => void): () => void;
}

export interface CatalogRepository {
  getSnapshot(options?: { signal?: AbortSignal }): Promise<CatalogSnapshot>;
  getPropertyById(id: string, options?: { signal?: AbortSignal }): Promise<Property | null>;
}

export interface DealsRepository {
  getDealsHub(options?: { signal?: AbortSignal }): Promise<DealsHub>;
  getDealBySlug(slug: string, options?: { signal?: AbortSignal }): Promise<DealDetail | null>;
}

export interface ReservationManagerPort {
  lookup(
    bookingId: string,
    contact?: string,
    options?: { signal?: AbortSignal }
  ): Promise<BookingDetails>;
  cancel(
    bookingId: string,
    input: { contact?: string; reason?: string },
    options?: { signal?: AbortSignal }
  ): Promise<BookingDetails>;
  cancelActivityItem(
    bookingId: string,
    itemId: string,
    input: { contact?: string; reason?: string },
    options?: { signal?: AbortSignal }
  ): Promise<BookingDetails>;
  complete(
    bookingId: string,
    input?: { contact?: string },
    options?: { signal?: AbortSignal }
  ): Promise<BookingDetails>;
  listMine(options?: { signal?: AbortSignal }): Promise<readonly BookingDetails[]>;
  listNotifications(
    bookingId: string,
    contact?: string,
    options?: { signal?: AbortSignal }
  ): Promise<readonly NotificationLog[]>;
}

export interface ActivitiesPort {
  listActivities(
    query?: ActivitiesQueryParams,
    options?: { signal?: AbortSignal }
  ): Promise<ActivitiesCatalogResponse>;
  getActivityBySlug(
    slug: string,
    options?: { signal?: AbortSignal }
  ): Promise<ActivityDetailResponse | null>;
  createBooking(
    intent: ServiceBookingIntent,
    options?: { signal?: AbortSignal }
  ): Promise<ActivityBooking>;
  lookupBooking(
    bookingId: string,
    contact?: string,
    options?: { signal?: AbortSignal }
  ): Promise<ActivityBooking>;
  listMyBookings(options?: { signal?: AbortSignal }): Promise<readonly ActivityBooking[]>;
  cancelBooking(
    bookingId: string,
    input: { contact?: string; reason?: string },
    options?: { signal?: AbortSignal }
  ): Promise<ActivityBooking>;
}

export interface PropertyExperiencePort {
  getAvailability(
    propertyId: string,
    range?: { from?: string; to?: string },
    options?: { signal?: AbortSignal }
  ): Promise<PropertyAvailabilityData>;
  submitReview(
    propertyId: string,
    input: CreateReviewInput,
    options?: { signal?: AbortSignal }
  ): Promise<CreateReviewResult>;
}

export interface AuthPort {
  me(options?: { signal?: AbortSignal }): Promise<AuthUser | null>;
  register(input: RegisterInput): Promise<AuthUser>;
  login(input: LoginInput): Promise<AuthUser>;
  requestOtp(input: OtpRequestInput): Promise<OtpRequestResult>;
  verifyOtp(input: OtpVerifyInput): Promise<AuthUser>;
  logout(): Promise<void>;
  getRemoteFavorites(): Promise<readonly string[]>;
  syncFavorites(
    propertyIds: readonly string[],
    mode?: "merge" | "replace"
  ): Promise<readonly string[]>;
  toggleRemoteFavorite(propertyId: string): Promise<readonly string[]>;
}

export interface PaymentGatewayPort {
  getGatewaySession(
    transactionId: string,
    options?: { signal?: AbortSignal }
  ): Promise<PaymentGatewaySession>;
  simulateOutcome(
    transactionId: string,
    input: PaymentSimulateInput,
    options?: { signal?: AbortSignal }
  ): Promise<PaymentWebhookResult>;
  validateVoucher(
    input: ValidateVoucherInput,
    options?: { signal?: AbortSignal }
  ): Promise<VoucherValidationResult>;
}

export interface InMemoryReservationAdapter extends ReservationSubmitter {
  getSubmittedBookings(): readonly BookingDetails[];
}

export interface AppPorts {
  favorites: FavoritesRepository;
  reservations: ReservationSubmitter;
  reservationManager: ReservationManagerPort;
  paymentGateway: PaymentGatewayPort;
  propertyExperience: PropertyExperiencePort;
  activities: ActivitiesPort;
}
