import { body } from "express-validator";

export const registerValidation = [
  body("fullName")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Full name must be at least 2 characters"),

  body("username")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters"),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Email is invalid"),

  body("phone")
    .trim()
    .isLength({ min: 6 })
    .withMessage("Phone number seems invalid"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  body("birthDate")
    .custom((value) => {
      if (isNaN(new Date(value).getTime())) {
        throw new Error("Birth date is invalid");
      }
      return true;
    }),
];
