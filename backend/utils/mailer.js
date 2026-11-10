const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendemail = async ({ to, subject, text, html }) => {
    if (!to || !subject || !html) {
        throw new Error("Email recipient, subject and HTML are required");
    }

    const fallbackText =
        text ||
        html
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text: fallbackText,
        html:html || " ",
    });

    console.log("Email sent:", info.messageId);
    return info;
};

module.exports = { sendemail };