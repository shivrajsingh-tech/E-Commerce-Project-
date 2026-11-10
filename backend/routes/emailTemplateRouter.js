
const express = require("express");

const {
  getEmailTemplates,
  addEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  updateEmailTemplateStatus,
} = require("../controllers/emailTemplateController");

const authentication = require("../middleware/authentication");
const authorizePermissions = require("../middleware/authorizePermissions");

const router = express.Router();

router.use(authentication);

// View Email Templates
router.get(
  "/get-email-templates",
  authorizePermissions("email_templates.view"),
  getEmailTemplates
);

// Create Email Template
router.post(
  "/add-email-template",
  authorizePermissions("email_templates.create"),
  addEmailTemplate
);

// Update Email Template
router.put(
  "/update-email-template/:id",
  authorizePermissions("email_templates.update"),
  updateEmailTemplate
);

// Delete Email Template
router.delete(
  "/delete-email-template/:id",
  authorizePermissions("email_templates.delete"),
  deleteEmailTemplate
);

// Change Email Template Status
router.patch(
  "/update-email-template-status/:id",
  authorizePermissions("email_templates.status"),
  updateEmailTemplateStatus
);

module.exports = router;
