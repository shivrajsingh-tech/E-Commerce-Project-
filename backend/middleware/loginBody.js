const { body } = require("express-validator");

const loginBody = [
    body("email")
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Enter a valid email"),

    body("password")
        .notEmpty()
        .withMessage("Password is required")
];

module.exports = loginBody;