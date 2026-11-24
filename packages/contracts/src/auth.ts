import { z } from "zod";
import { AuthProviderSchema } from "./common.js";
import { EMAIL_REGEX, VN_PHONE_REGEX } from "./booking.js";

export const AuthUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  phone: z.string().min(1).optional(),
  fullName: z.string().min(1),
  avatar: z.string().min(1).optional(),
  provider: AuthProviderSchema,
  createdAt: z.string().min(1),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthSessionDataSchema = z.object({
  user: AuthUserSchema.nullable(),
});

export type AuthSessionData = z.infer<typeof AuthSessionDataSchema>;

export const RegisterInputSchema = z.object({
  fullName: z.string().trim().min(2, "Họ và tên cần tối thiểu 2 ký tự.").max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((val) => EMAIL_REGEX.test(val), "Địa chỉ email chưa đúng định dạng."),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || VN_PHONE_REGEX.test(val.replace(/[\s.-]/g, "")),
      "Số điện thoại chưa đúng định dạng Việt Nam."
    )
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  password: z
    .string()
    .min(6, "Mật khẩu cần tối thiểu 6 ký tự.")
    .max(128, "Mật khẩu quá dài."),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((val) => EMAIL_REGEX.test(val), "Địa chỉ email chưa đúng định dạng."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const OtpRequestInputSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email hoặc số điện thoại.")
    .refine(
      (val) => EMAIL_REGEX.test(val) || VN_PHONE_REGEX.test(val.replace(/[\s.-]/g, "")),
      "Vui lòng nhập đúng định dạng email hoặc số điện thoại Việt Nam."
    ),
});

export type OtpRequestInput = z.infer<typeof OtpRequestInputSchema>;

export const OtpRequestResultSchema = z.object({
  identifier: z.string().min(1),
  channel: z.enum(["email", "sms"]),
  expiresAt: z.string().min(1),
  devCode: z.string().length(6).optional(),
});

export type OtpRequestResult = z.infer<typeof OtpRequestResultSchema>;

export const OtpVerifyInputSchema = z.object({
  identifier: z.string().trim().min(1, "Thiếu email hoặc số điện thoại."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Mã OTP gồm đúng 6 chữ số."),
  fullName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
});

export type OtpVerifyInput = z.infer<typeof OtpVerifyInputSchema>;

export const FavoritesSyncInputSchema = z.object({
  propertyIds: z.array(z.string().trim().min(1)).max(100),
});

export type FavoritesSyncInput = z.infer<typeof FavoritesSyncInputSchema>;

export const FavoritesListDataSchema = z.object({
  propertyIds: z.array(z.string().min(1)).readonly(),
});

export type FavoritesListData = z.infer<typeof FavoritesListDataSchema>;
