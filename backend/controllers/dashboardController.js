const User = require("../model/userSchema");
const Role = require("../model/roleSchema");
const Category = require("../model/CategorySchema");
const SubCategory = require("../model/SubCategorySchema");
const Brand = require("../model/brandSchema");
const Product = require("../model/productModel");
const ProductVariant = require("../model/productVarientSchema");
const Store = require("../model/storeSchema");
const StoreInventory = require("../model/storeInventarySchema");
const Order = require("../model/orderSchema");
const DeliveryPartner = require("../model/deliveryPartnerSchema");

const getDashboard = async (req, res, next) => {
  try {
    const userRole = String(req.user?.role || "customer")
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_");
    const userId = req.user?.id || req.user?._id;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const data = { role: userRole };

    // ==========================================
    // 1. DELIVERY PARTNER (Detailed Rider Data)
    // ==========================================
    if (userRole === "delivery_partner") {
      const [
        totalAssignedAllTime,
        deliveredTotalAllTime,
        deliveredToday,
        deliveredWeek,
        deliveredMonth,
        cancelledTotal,
        todayOrders,
        activeTasks,
        partnerProfile,
      ] = await Promise.all([
        Order.countDocuments({ deliveryPartner: userId }),
        Order.countDocuments({ deliveryPartner: userId, orderStatus: "delivered" }),
        Order.countDocuments({
          deliveryPartner: userId,
          orderStatus: "delivered",
          deliveredAt: { $gte: startOfToday },
        }),
        Order.countDocuments({
          deliveryPartner: userId,
          orderStatus: "delivered",
          deliveredAt: { $gte: sevenDaysAgo },
        }),
        Order.countDocuments({
          deliveryPartner: userId,
          orderStatus: "delivered",
          deliveredAt: { $gte: thirtyDaysAgo },
        }),
        Order.countDocuments({ deliveryPartner: userId, orderStatus: "cancelled" }),
        Order.find({
          deliveryPartner: userId,
          orderStatus: "delivered",
          deliveredAt: { $gte: startOfToday },
        }).select("deliveryFee totalAmount"),
        Order.find({
          deliveryPartner: userId,
          orderStatus: { $in: ["assigned", "out_for_delivery"] },
        })
          .populate("store", "name address phone")
          .sort({ createdAt: -1 }),
        DeliveryPartner.findOne({ user: userId }),
      ]);

      const earningsToday = todayOrders.reduce(
        (sum, o) => sum + (Number(o.deliveryFee) || 0),
        0
      );
      const totalEarningsAllTime = partnerProfile?.totalEarnings || 0;

      data.deliveryPartnerStats = {
        totalAssignedAllTime,
        deliveredTotalAllTime,
        deliveredToday,
        deliveredWeek,
        deliveredMonth,
        cancelledTotal,
        earningsToday,
        totalEarningsAllTime,
        isOnline: Boolean(partnerProfile?.isOnline),
        isAvailable: Boolean(partnerProfile?.isAvailable),
        activeTasks,
      };

      return res.status(200).json({ success: true, data });
    }

    // ==========================================
    // 2. STORE MANAGER (Scoped Branch Data)
    // ==========================================
    let managedStore = null;
    if (userRole === "store_manager" && userId) {
      managedStore = await Store.findOne({ manager: userId });
      if (managedStore) {
        data.store = {
          id: managedStore._id,
          name: managedStore.name,
          code: managedStore.code,
          address: managedStore.address,
        };
      }
    }

    const storeFilter = userRole === "store_manager" && managedStore ? { store: managedStore._id } : {};

    // Parallel DB Aggregations for High Speed
    // Exclude super_admin from all user counts
    const [superAdminRole] = await Promise.all([
      Role.findOne({ name: "super_admin" }).select("_id"),
    ]);
    const superAdminRoleId = superAdminRole?._id;
    const excludeSuperAdmin = superAdminRoleId
      ? { role: { $ne: superAdminRoleId } }
      : {};

    const [
      // Users (super_admin excluded)
      totalUsers,
      activeUsers,
      inactiveUsers,
      pendingUsers,
      // Stores
      totalStores,
      activeStores,
      inactiveStores,
      // Inventory
      totalInventoryItems,
      lowStockProducts,
      outOfStockProducts,
      // Catalog
      totalCategories,
      totalSubCategories,
      totalBrands,
      totalProducts,
      totalVariants,
      // Orders Pipeline
      placedOrders,
      confirmedOrders,
      packingOrders,
      assignedOrders,
      outForDelivery,
      todayDelivered,
      totalCancelled,
      todayAllOrders,
      weekOrders,
      // Fleet Deliveries
      onlineRiders,
      availableRiders,
      busyRiders,
    ] = await Promise.all([
      User.countDocuments(excludeSuperAdmin),
      User.countDocuments({ ...excludeSuperAdmin, status: "active" }),
      User.countDocuments({ ...excludeSuperAdmin, status: "inactive" }),
      User.countDocuments({ ...excludeSuperAdmin, status: "pending" }),

      Store.countDocuments(),
      Store.countDocuments({ status: "active" }),
      Store.countDocuments({ status: "inactive" }),

      StoreInventory.countDocuments(storeFilter),
      StoreInventory.countDocuments({
        ...storeFilter,
        status: "active",
        $expr: {
          $and: [
            { $gt: [{ $subtract: ["$quantity", "$reservedQuantity"] }, 0] },
            { $lte: [{ $subtract: ["$quantity", "$reservedQuantity"] }, "$reorderLevel"] },
          ],
        },
      }),
      StoreInventory.countDocuments({
        ...storeFilter,
        $expr: {
          $lte: [{ $subtract: ["$quantity", "$reservedQuantity"] }, 0],
        },
      }),

      Category.countDocuments({ isDeleted: false }),
      SubCategory.countDocuments({ isDeleted: false }),
      Brand.countDocuments(),
      Product.countDocuments(),
      ProductVariant.countDocuments(),

      Order.countDocuments({ ...storeFilter, orderStatus: "placed" }),
      Order.countDocuments({ ...storeFilter, orderStatus: "confirmed" }),
      Order.countDocuments({ ...storeFilter, orderStatus: "packing" }),
      Order.countDocuments({ ...storeFilter, orderStatus: "assigned" }),
      Order.countDocuments({ ...storeFilter, orderStatus: "out_for_delivery" }),
      Order.countDocuments({
        ...storeFilter,
        orderStatus: "delivered",
        deliveredAt: { $gte: startOfToday },
      }),
      Order.countDocuments({ ...storeFilter, orderStatus: "cancelled" }),
      Order.find({ ...storeFilter, createdAt: { $gte: startOfToday } }).select("totalAmount orderStatus"),
      Order.find({ ...storeFilter, createdAt: { $gte: sevenDaysAgo } }).select("totalAmount orderStatus createdAt"),

      DeliveryPartner.countDocuments({ isOnline: true }),
      DeliveryPartner.countDocuments({ isOnline: true, isAvailable: true }),
      DeliveryPartner.countDocuments({ isOnline: true, isAvailable: false }),
    ]);

    // Financial calculations
    const todayRevenue = todayAllOrders
      .filter((o) => o.orderStatus !== "cancelled")
      .reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);

    const weekRevenue = weekOrders
      .filter((o) => o.orderStatus !== "cancelled")
      .reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);

    // Dynamic 7-day revenue grouping
    const dayMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      dayMap[dayName] = 0;
    }

    weekOrders.forEach((o) => {
      if (o.orderStatus !== "cancelled") {
        const orderDay = new Date(o.createdAt).toLocaleDateString("en-US", { weekday: "short" });
        if (dayMap[orderDay] !== undefined) {
          dayMap[orderDay] += o.totalAmount || 0;
        }
      }
    });

    const weeklyTrendChart = Object.keys(dayMap).map((day) => ({
      day,
      revenue: dayMap[day],
    }));

    // Attach all variables to data response
    Object.assign(data, {
      totalUsers,
      activeUsers,
      inactiveUsers,
      pendingUsers,

      totalStores,
      activeStores,
      inactiveStores,

      totalInventoryItems,
      lowStockProducts,
      outOfStockProducts,

      totalCategories,
      totalSubCategories,
      totalBrands,
      totalProducts,
      totalVariants,

      placedOrders,
      confirmedOrders,
      packingOrders,
      assignedOrders,
      outForDelivery,
      todayDelivered,
      totalCancelled,
      todayOrdersCount: todayAllOrders.length,
      todayRevenue,
      weekRevenue,
      weeklyTrendChart,

      onlineRiders,
      availableRiders,
      busyRiders,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard };