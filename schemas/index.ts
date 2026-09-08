import { z } from "zod";
import { URGENCIES, EXPERTISE_LEVELS, ROLES, ACCOUNT_STATUSES } from "@/lib/constants";
import { PATTERNS, MESSAGES } from "@/lib/validation";

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long")
  .regex(/[a-zA-Z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[^0-9+]/g, ""))
  .refine((value) => PATTERNS.phone.test(value), MESSAGES.phone);

/** Letters only — the same rule the browser enforces while typing. */
const personName = z
  .string()
  .trim()
  .min(2, "Enter your full name")
  .max(80, "That name is too long")
  .refine((value) => PATTERNS.name.test(value), MESSAGES.name);

const email = z.string().trim().toLowerCase().email(MESSAGES.email);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
  remember: z.coerce.boolean().optional().default(false),
  next: z.string().optional(),
});

export const customerRegisterSchema = z
  .object({
    name: personName,
    email,
    phone,
    password,
    confirmPassword: z.string(),
    address: z.string().trim().min(5, "Enter your address").max(200),
    area: z.string().trim().min(2, "Choose your area"),
    terms: z.coerce.boolean().refine((v) => v === true, "Please accept the terms"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const providerRegisterSchema = z
  .object({
    name: personName,
    businessName: z.string().trim().min(2, "Enter your business name").max(80),
    email,
    phone,
    password,
    confirmPassword: z.string(),
    address: z.string().trim().min(5, "Enter your address").max(200),
    area: z.string().trim().min(2, "Choose your service area"),
    experienceYears: z.coerce.number().int().min(0).max(50),
    serviceRadiusKm: z.coerce.number().min(1).max(50).default(12),
    serviceIds: z.array(z.string().min(1)).min(1, "Select at least one service"),
    terms: z.coerce.boolean().refine((v) => v === true, "Please accept the terms"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: personName,
  phone,
  address: z.string().trim().min(5).max(200),
  area: z.string().trim().min(2),
});

export const serviceRequestSchema = z.object({
  serviceId: z.string().min(1, "Choose a service"),
  title: z.string().trim().min(4, "Add a short title").max(120),
  description: z.string().trim().min(10, "Describe the problem in a little more detail").max(2000),
  address: z.string().trim().min(5, "Enter the service address").max(200),
  area: z.string().trim().min(2, "Choose an area"),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  preferredStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose a time"),
  urgency: z.enum(URGENCIES),
  contactPhone: phone,
  imageUrl: z.string().optional().nullable(),
  autoAssign: z.coerce.boolean().optional().default(false),
});

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  qualityRating: z.coerce.number().int().min(1).max(5).optional(),
  professionalismRating: z.coerce.number().int().min(1).max(5).optional(),
  punctualityRating: z.coerce.number().int().min(1).max(5).optional(),
  valueRating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(1000).optional(),
});

export const availabilitySchema = z.object({
  days: z
    .array(
      z.object({
        dayOfWeek: z.coerce.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        isAvailable: z.coerce.boolean(),
      }),
    )
    .length(7),
});

export const timeOffSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).default("00:00"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).default("23:59"),
  reason: z.string().trim().max(120).optional(),
});

export const matchingConfigSchema = z
  .object({
    availabilityWeight: z.coerce.number().min(0).max(100),
    distanceWeight: z.coerce.number().min(0).max(100),
    ratingWeight: z.coerce.number().min(0).max(100),
    priceWeight: z.coerce.number().min(0).max(100),
    expertiseWeight: z.coerce.number().min(0).max(100),
    workloadWeight: z.coerce.number().min(0).max(100),
    urgencyDistanceMultiplier: z.coerce.number().min(1).max(3),
    urgencyAvailabilityMultiplier: z.coerce.number().min(1).max(3),
    serviceFeePercent: z.coerce.number().min(0).max(50),
    urgencyFeePercent: z.coerce.number().min(0).max(100),
    distanceFeePerKm: z.coerce.number().int().min(0).max(500),
  })
  .refine(
    (d) =>
      Math.abs(
        d.availabilityWeight + d.distanceWeight + d.ratingWeight +
        d.priceWeight + d.expertiseWeight + d.workloadWeight - 100,
      ) < 0.01,
    { message: "The six matching weights must total exactly 100%", path: ["availabilityWeight"] },
  );

export const adminUserSchema = z.object({
  name: personName,
  email,
  phone,
  role: z.enum(ROLES),
  password,
  area: z.string().trim().min(2),
  address: z.string().trim().min(5).max(200),
  confirmAdmin: z.coerce.boolean().optional().default(false),
});

export const adminStatusSchema = z.object({
  userId: z.string().min(1),
  accountStatus: z.enum(ACCOUNT_STATUSES),
});

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().min(5).max(300),
  icon: z.string().trim().min(1).max(8),
  active: z.coerce.boolean().default(true),
});

export const serviceSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(5).max(300),
  basePrice: z.coerce.number().int().min(50).max(200000),
  estimatedDuration: z.coerce.number().int().min(15).max(1440),
  active: z.coerce.boolean().default(true),
});

export const providerServiceSchema = z.object({
  serviceId: z.string().min(1),
  price: z.coerce.number().int().min(50).max(200000),
  experienceYears: z.coerce.number().int().min(0).max(50),
  expertiseLevel: z.enum(EXPERTISE_LEVELS),
});

export const rescheduleSchema = z.object({
  bookingId: z.string().min(1),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;
