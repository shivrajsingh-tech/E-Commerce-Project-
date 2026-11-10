const mongoose = require("mongoose");
const User = require("../model/userSchema");
const Role = require("../model/roleSchema");
const Order = require("../model/orderSchema");

// Helper: Customer Role IDs nikalna
const getCustomerRoleIds = async () => {
  const roles = await Role.find({
    name: { $in: ["customer", "user"] },
  }).select("_id");
  return roles.map((r) => r._id);
};

// 1. GET ALL CUSTOMERS (With Orders Summary)
exports.getAllCustomers = async (req, res) => {
  try {
    const customerRoleIds = await getCustomerRoleIds();

    const customers = await User.find({
      role: { $in: customerRoleIds },
    })
      .select("-password -resetOtp -resetOtpExpires")
      .populate("role", "name")
      .sort({ createdAt: -1 });

    // Customer ke orders count aggregate karna
    const customerIds = customers.map((c) => c._id);
    const orderStats = await Order.aggregate([
      {
        $match: {
          customer: { $in: customerIds },
        },
      },
      {
        $group: {
          _id: "$customer",
          totalOrders: { $sum: 1 },
          pendingOrders: {
            $sum: {$cond: [
                {
                  $in: [
                    "$orderStatus",
                    ["placed", "confirmed", "assigned", "out_for_delivery"],
                  ],
                },
                1,
                0,
              ],
            },
          },
          deliveredOrders: {
            $sum: {$cond: [{ $eq: ["$orderStatus", "delivered"] }, 1, 0] },
          },
          cancelledOrders: {
            $sum: {$cond: [{ $eq: ["$orderStatus", "cancelled"] }, 1, 0] },
          },
          totalSpent: { $sum: "$totalAmount" },
        },
      },
    ]);

    const statsMap = {};
    orderStats.forEach((stat) => {
      statsMap[stat._id.toString()] = stat;
    });

    const enrichedCustomers = customers.map((cust) => {
      const stats = statsMap[cust._id.toString()] || {
        totalOrders: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        totalSpent: 0,
      };

      return {
        ...cust.toObject(),
        stats,
      };
    });

    return res.status(200).json({
      success: true,
      customers: enrichedCustomers,
    });
  } catch (error) {
    console.error("Get all customers error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch customers",
    });
  }
};

// 2. GET SINGLE CUSTOMER KE ORDERS (With Status Filter)
exports.getCustomerOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    const filter = {
      $or: [{ customer: id }, { user: id }],
    };

    if (status && status !== "all") {
      if (status === "pending") {
        filter.orderStatus = {
          $in: ["placed", "confirmed", "assigned", "out_for_delivery"],
        };
      } else {
        filter.orderStatus = status;
      }
    }

    const orders = await Order.find(filter)
      .populate("items.product", "name images")
      .populate("address")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Get customer orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch customer orders",
    });
  }
};

// 3. TOGGLE CUSTOMER STATUS (active / inactive)
exports.toggleCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active or inactive",
      });
    }

    const updatedCustomer = await User.findByIdAndUpdate(
      id,
      { status },
      { returnDocument: "after" }
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: `Customer marked as ${status}`,
      customer: updatedCustomer,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. UPDATE CUSTOMER PROFILE
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone } = req.body;

    const customer = await User.findByIdAndUpdate(
      id,
      { firstName, lastName, phone },
      { returnDocument: "after" }
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      customer,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. DELETE CUSTOMER
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};