export const ROLES = ["CUSTOMER", "PROVIDER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ACCOUNT_STATUSES = ["ACTIVE", "PENDING", "SUSPENDED", "DEACTIVATED"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const VERIFICATION_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const URGENCIES = ["NORMAL", "HIGH", "URGENT"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const EXPERTISE_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
export type ExpertiseLevel = (typeof EXPERTISE_LEVELS)[number];

export const BOOKING_STATUSES = [
  "REQUESTED", "ACCEPTED", "ON_THE_WAY", "IN_PROGRESS",
  "COMPLETED", "CANCELLED", "REJECTED", "RESCHEDULED",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const REQUEST_STATUSES = [
  "PENDING", "MATCHED", "ASSIGNED", "BOOKED", "COMPLETED", "CANCELLED", "NO_PROVIDER",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const PAYMENT_STATUSES = ["UNPAID", "PAID", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Human microcopy for machine statuses. */
export const BOOKING_LABEL: Record<string, string> = {
  REQUESTED: "Waiting for provider",
  ACCEPTED: "Confirmed",
  ON_THE_WAY: "On the way",
  IN_PROGRESS: "Work in progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Declined",
  RESCHEDULED: "Rescheduled",
};

export const CUSTOMER_STATUS_MESSAGE: Record<string, string> = {
  REQUESTED: "We've sent your request. Waiting for the provider to confirm.",
  ACCEPTED: "Your booking is confirmed.",
  ON_THE_WAY: "Your technician is on the way.",
  IN_PROGRESS: "Your technician has started the work.",
  COMPLETED: "Service completed. Your invoice is ready.",
  CANCELLED: "This booking was cancelled.",
  REJECTED: "The provider could not take this job.",
  RESCHEDULED: "This booking has been rescheduled.",
};

export const REQUEST_LABEL: Record<string, string> = {
  PENDING: "Finding providers",
  MATCHED: "Providers found",
  ASSIGNED: "Provider assigned",
  BOOKED: "Booked",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_PROVIDER: "No provider available",
};

export const URGENCY_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  HIGH: "Priority",
  URGENT: "Urgent",
};

export const NOTIFICATION_TYPES = [
  "REQUEST_CREATED", "PROVIDER_MATCHED", "BOOKING_CREATED", "BOOKING_ACCEPTED",
  "BOOKING_REJECTED", "PROVIDER_ON_WAY", "SERVICE_STARTED", "SERVICE_COMPLETED",
  "INVOICE_GENERATED", "REVIEW_REQUESTED", "REVIEW_RECEIVED", "BOOKING_CANCELLED",
  "BOOKING_RESCHEDULED", "PROVIDER_REPLACED", "PROVIDER_APPROVED", "PROVIDER_REJECTED",
  "ACCOUNT_SUSPENDED", "ACCOUNT_ACTIVATED", "NEW_MESSAGE",
] as const;

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Mock Dhaka-style locations with fictional coordinates. */
export const AREAS = [
  { name: "Dhanmondi", latitude: 23.7461, longitude: 90.3742 },
  { name: "Gulshan", latitude: 23.7925, longitude: 90.4078 },
  { name: "Banani", latitude: 23.7936, longitude: 90.4005 },
  { name: "Uttara", latitude: 23.8759, longitude: 90.3795 },
  { name: "Mirpur", latitude: 23.8223, longitude: 90.3654 },
  { name: "Mohammadpur", latitude: 23.7654, longitude: 90.3589 },
  { name: "Bashundhara", latitude: 23.8203, longitude: 90.4265 },
  { name: "Badda", latitude: 23.7806, longitude: 90.4256 },
  { name: "Farmgate", latitude: 23.7583, longitude: 90.3896 },
  { name: "Motijheel", latitude: 23.7330, longitude: 90.4172 },
] as const;
