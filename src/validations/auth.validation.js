import Joi from "joi";

export const emailSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(254).required(),
});

export const otpSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(254).required(),

  otp: Joi.string().pattern(/^\d{6}$/).required(),
});

export const profileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),

  about: Joi.string().trim().max(255).allow("").optional(),
});
