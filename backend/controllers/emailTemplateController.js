const EmailTemplate = require("../model/emailTemplate");

// GET ALL EMAIL TEMPLATES
const getEmailTemplates = async (req, res) => {
    try {
        const {
            search = "",
            type = "",
            status = "",
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;

        const currentPage = Math.max(1, parseInt(page, 10) || 1);
        const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

        const allowedSortFields = [
            "name",
            "subject",
            "type",
            "status",
            "createdAt",
            "updatedAt",
        ];

        const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

        const filter = {};

        if (search.trim()) {
            const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const searchRegex = new RegExp(escapedSearch, "i");
            filter.$or = [
                { name: searchRegex },
                { subject: searchRegex },
                { type: searchRegex },
            ];
        }

        if (type.trim()) {
            filter.type = type.trim();
        }

        if (["active", "inactive"].includes(status)) {
            filter.status = status;
        }

        const totalTemplates = await EmailTemplate.countDocuments(filter);

        const templates = await EmailTemplate.find(filter)
            .sort({
                [safeSortBy]: order === "asc" ? 1 : -1,
                _id: -1,
            })
            .skip((currentPage - 1) * pageLimit)
            .limit(pageLimit);

        return res.status(200).json({
            success: true,
            templates,
            pagination: {
                currentPage,
                limit: pageLimit,
                totalTemplates,
                totalPages: Math.ceil(totalTemplates / pageLimit),
            },
        });
    } catch (error) {
        console.error("Get email templates error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch email templates",
        });
    }
};

// ADD EMAIL TEMPLATE
const addEmailTemplate = async (req, res) => {
    try {
        const { name, type, subject, body } = req.body;

        if (
            typeof name !== "string" ||
            typeof type !== "string" ||
            typeof subject !== "string" ||
            typeof body !== "string" ||
            !name.trim() ||
            !type.trim() ||
            !subject.trim() ||
            !body.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, type, subject, and body are required",
            });
        }

        const template = await EmailTemplate.create({
            name: name.trim(),
            type: type.trim(),
            subject: subject.trim(),
            body,
            status: "active",
        });

        return res.status(201).json({
            success: true,
            message: "Email template created successfully",
            template,
        });
    } catch (error) {
        console.error("Add email template error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create email template",
        });
    }
};

// UPDATE EMAIL TEMPLATE
const updateEmailTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, subject, body } = req.body;

        if (
            typeof name !== "string" ||
            typeof type !== "string" ||
            typeof subject !== "string" ||
            typeof body !== "string" ||
            !name.trim() ||
            !type.trim() ||
            !subject.trim() ||
            !body.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, type, subject, and body are required",
            });
        }

        const template = await EmailTemplate.findByIdAndUpdate(
            id,
            {
                name: name.trim(),
                type: type.trim(),
                subject: subject.trim(),
                body,
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!template) {
            return res.status(404).json({
                success: false,
                message: "Email template not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Email template updated successfully",
            template,
        });
    } catch (error) {
        console.error("Update email template error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update email template",
        });
    }
};

// DELETE EMAIL TEMPLATE
const deleteEmailTemplate = async (req, res) => {
    try {
        const template = await EmailTemplate.findByIdAndDelete(req.params.id);

        if (!template) {
            return res.status(404).json({
                success: false,
                message: "Email template not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Email template deleted successfully",
        });
    } catch (error) {
        console.error("Delete email template error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete email template",
        });
    }
};

// UPDATE TEMPLATE STATUS
const updateEmailTemplateStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be active or inactive",
            });
        }

        const template = await EmailTemplate.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!template) {
            return res.status(404).json({
                success: false,
                message: "Email template not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Template status updated successfully",
            template,
        });
    } catch (error) {
        console.error("Update template status error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update template status",
        });
    }
};

module.exports = {
    getEmailTemplates,
    addEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    updateEmailTemplateStatus,
};