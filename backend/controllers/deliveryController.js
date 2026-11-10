const Order = require("../model/orderSchema");
const DeliveryPartner = require("../model/deliveryPartnerSchema");
const User = require("../model/userSchema");
const Store = require("../model/storeSchema");
const EmailTemplate = require("../model/emailTemplate");
const { sendemail } = require("../utils/mailer");

// Helper: 4-digit numeric OTP generator
const generateNumericOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// 1. GET NEARBY AVAILABLE PARTNERS
const getNearbyAvailablePartners = async (req, res) => {
  try {
    const partners = await DeliveryPartner.find({
      isOnline: true,
      isAvailable: true,
    })
      .populate({
        path: "user",
        select: "firstName lastName phone email role status",
        populate: {
          path: "role",
          select: "name",
        },
      })
      .lean();

    const formattedPartners = partners
      .filter((p) => {
        if (!p.user) return false;
        if (p.user.status === "inactive") return false;
        if (p.status && p.status !== "active") return false;

        let roleName = "";
        if (typeof p.user.role === "string") {
          roleName = p.user.role;
        } else {
          roleName = p.user.role?.name || "";
        }

        roleName = roleName
          .toLowerCase()
          .trim()
          .replace(/[\s-]+/g, "_");

        return roleName === "delivery_partner";
      })
      .map((p) => ({
        _id: p.user._id, // User ID for assignment reference
        partnerProfileId: p._id,
        firstName: p.user.firstName || "Rider",
        lastName: p.user.lastName || "",
        phone: p.user.phone || "N/A",
        email: p.user.email || "",
        vehicleType: p.vehicleType || "bike",
        vehicleNumber: p.vehicleNumber || "N/A",
        isOnline: p.isOnline === true,
        isAvailable: p.isAvailable === true,
        totalDeliveries: p.totalDeliveries || 0,
      }));

    return res.status(200).json({
      success: true,
      count: formattedPartners.length,
      partners: formattedPartners,
    });
  } catch (error) {
    console.error("getNearbyAvailablePartners Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 2. ASSIGN DELIVERY PARTNER & SEND CKEDITOR TEMPLATE EMAIL
const assignDeliveryPartner = async (req, res) => {
  try {
    const { orderId, deliveryPartnerId } = req.body;

    const order = await Order.findById(orderId).populate(
      "user",
      "email firstName lastName phone"
    );
    if (!order) {
      return res.status(404).json({ success: false, message: "Order nahi mila." });
    }

    // Handle both User ID or Partner Profile ID lookup securely
    let partnerProfile = await DeliveryPartner.findOne({
      $or: [{ user: deliveryPartnerId }, { _id: deliveryPartnerId }],
    }).populate("user", "firstName lastName phone");

    if (!partnerProfile || !partnerProfile.isOnline || !partnerProfile.isAvailable) {
      return res.status(400).json({
        success: false,
        message: "Delivery partner abhi offline ya busy hai.",
      });
    }

    const secureOtp = generateNumericOtp();

    // Assign the User ID linked to the delivery partner profile for order tracking
    order.deliveryPartner = partnerProfile.user._id;
    order.orderStatus = "assigned";
    order.deliveryOtp = secureOtp;
    order.assignedAt = new Date();
    await order.save();

    partnerProfile.isAvailable = false;
    await partnerProfile.save();

    await User.findByIdAndUpdate(partnerProfile.user._id, {
      $set: { isAvailable: false },
    });

    const customerEmail =
      order.deliveryAddress?.email ||
      order.user?.email ||
      order.customerEmail;

    const customerName =
      order.deliveryAddress?.receiverName ||
      order.user?.firstName ||
      "Customer";

    const riderName = `${partnerProfile.user?.firstName || "Delivery Partner"} ${
      partnerProfile.user?.lastName || ""
    }`.trim();
    const riderPhone = partnerProfile.user?.phone || "N/A";
    const vehicleType = partnerProfile.vehicleType || "bike";
    const vehicleNumber = partnerProfile.vehicleNumber || "N/A";
    const displayOrderId = order.orderId || String(order._id).slice(-6);

    if (customerEmail) {
      try {
        const template = await EmailTemplate.findOne({
          $or: [
            { name: { $regex: /delivery|otp/i } },
            { subject: { $regex: /delivery|otp/i } },
          ],
          status: "active",
        });

        let emailSubject = `Your Delivery OTP for Order #${displayOrderId} - ElibCart`;
        let emailHtml = "";

        if (template && (template.body || template.content)) {
          const rawTemplate = template.body || template.content;
          const replacePlaceholders = (text) =>
            text
              .replace(/{{\s*customerName\s*}}/gi, customerName)
              .replace(/{{\s*orderId\s*}}/gi, displayOrderId)
              .replace(/{{\s*otp\s*}}/gi, secureOtp)
              .replace(/{{\s*riderName\s*}}/gi, riderName)
              .replace(/{{\s*riderPhone\s*}}/gi, riderPhone)
              .replace(/{{\s*vehicleType\s*}}/gi, vehicleType)
              .replace(/{{\s*vehicleNumber\s*}}/gi, vehicleNumber);

          emailSubject = replacePlaceholders(template.subject || emailSubject);
          emailHtml = replacePlaceholders(rawTemplate);
        } else {
          emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <h2>Order Out for Delivery!</h2>
              <p>Hi ${customerName}, your delivery partner is <strong>${riderName}</strong> (${riderPhone}).</p>
              <h1 style="color: #4f46e5; letter-spacing: 5px;">${secureOtp}</h1>
              <p>Give this OTP to the rider upon receiving your package.</p>
            </div>
          `;
        }

        await sendemail({
          to: customerEmail,
          subject: emailSubject,
          html: emailHtml,
        });
      } catch (mailErr) {
        console.error("Failed to send delivery OTP email:", mailErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Delivery partner assigned successfully and OTP sent to customer!",
      orderStatus: order.orderStatus,
    });
  } catch (error) {
    console.error("assignDeliveryPartner Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. TOGGLE DUTY STATUS
const toggleDutyStatus = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let partnerProfile = await DeliveryPartner.findOne({ user: userId });

    if (!partnerProfile) {
      partnerProfile = await DeliveryPartner.create({
        user: userId,
        vehicleType: "bike",
        isOnline: false,
        isAvailable: true,
        status: "active",
      });
    }

    const nextOnlineState = !partnerProfile.isOnline;
    partnerProfile.isOnline = nextOnlineState;
    partnerProfile.isAvailable = nextOnlineState ? true : false;
    await partnerProfile.save();

    await User.findByIdAndUpdate(userId, {
      $set: {
        isOnline: nextOnlineState,
        isAvailable: partnerProfile.isAvailable,
      },
    });

    return res.status(200).json({
      success: true,
      isOnline: nextOnlineState,
      isAvailable: partnerProfile.isAvailable,
      message: `Duty set to ${nextOnlineState ? "Online" : "Offline"}`,
    });
  } catch (error) {
    console.error("toggleDutyStatus Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. MARK PICKED UP
const markPickedUp = async (req, res) => {
  try {
    const partnerId = req.user?.id || req.user?._id;
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required" });
    }

    const order = await Order.findOne({
      $or: [{ _id: orderId }, { orderId: orderId }],
      deliveryPartner: partnerId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order nahi mila." });
    }

    order.orderStatus = "out_for_delivery";
    order.pickedUpAt = new Date();
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order picked up. Status changed to Out For Delivery.",
      orderStatus: order.orderStatus,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. VERIFY OTP AND DELIVER
const verifyOtpAndDeliver = async (req, res) => {
  try {
    const partnerId = req.user?.id || req.user?._id;
    const { orderId, otp } = req.body;

    const order = await Order.findOne({
      $or: [{ _id: orderId }, { orderId: orderId }],
      deliveryPartner: partnerId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order nahi mila." });
    }

    if (String(order.deliveryOtp) !== String(otp).trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Customer se check karke sahi OTP enter karein.",
      });
    }

    order.orderStatus = "delivered";
    order.paymentStatus = "SUCCESS";
    order.deliveredAt = new Date();
    order.deliveryOtp = null;
    // ⚠️ Note: order.deliveryPartner ko null mat karo taaki history me rider ka naam dikhta rahe!
    await order.save();

    await DeliveryPartner.findOneAndUpdate(
      { user: partnerId },
      {
        $set: { isAvailable: true },
        $inc: { totalDeliveries: 1, totalEarnings: Number(order.deliveryFee || 40) },
      }
    );

    await User.findByIdAndUpdate(partnerId, {
      $set: { isAvailable: true },
    });

    return res.status(200).json({
      success: true,
      message: "OTP Verified successfully! Order delivered.",
      orderStatus: order.orderStatus,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNearbyAvailablePartners,
  assignDeliveryPartner,
  toggleDutyStatus,
  markPickedUp,
  verifyOtpAndDeliver,
};