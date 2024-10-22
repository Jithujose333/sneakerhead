const Order = require('../../models/orderSchema')
const moment = require('moment')






const getDashboard = async (req, res) => {
    try {
      const admin = req.session.admin;
      if (admin) {
        // Get filter from query
        const { filter } = req.query; // 'yearly', 'monthly', 'weekly'
        let dateFilter = {}; 
        const currentDate = new Date();
  
        // Filter based on time frame
        if (filter === 'yearly') {
          dateFilter.createdAt = { $gte: new Date(currentDate.getFullYear(), 0, 1) };
        } else if (filter === 'monthly') {
          dateFilter.createdAt = { $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1) };
        } else if (filter === 'weekly') {
          const weekStart = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
          dateFilter.createdAt = { $gte: weekStart };
        }
  
        // Fetch orders
        const orders = await Order.find(dateFilter).populate('userId');




 // Calculate total sales count, order amount, and discounts
 const totalSalesCount = orders.length; // Count of orders on current page

 const totalOrderAmount = orders.reduce((acc, order) => {
     return acc + (order.orderedItems ? order.orderedItems.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0);
 }, 0);

 const totalDiscount = orders.reduce((acc, order) => acc + (order.discount || 0), 0).toFixed(2);

 const today = moment().startOf('day'); // Get today's date (start of the day)

 // Filter orders placed today
 const todayOrders = orders.filter(order => moment(order.invoiceDate).isSame(today, 'day'));
 
 // Calculate total amount for today's orders
 const todayOrderAmount = todayOrders.reduce((acc, order) => {
     return acc + (order.orderedItems ? order.orderedItems.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0);
 }, 0).toFixed(2);
 
  
        // Aggregate sales data for charts
        const salesData = await Order.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
                day: { $dayOfMonth: "$createdAt" }
              },
              totalSales: { $sum: "$totalAmount" },
              totalOrders: { $sum: 1 }
            }
          },
          { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);
  
        // Best-selling products (Top 10)
        const bestSellingProducts = await Order.aggregate([
          { $unwind: "$orderedItems" },
          { $group: { _id: "$orderedItems.product", totalSold: { $sum: "$orderedItems.quantity" } } },
          { $sort: { totalSold: -1 } },
          { $limit: 10 },
          { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productDetails' } },
          { $unwind: "$productDetails" }
        ]);
  
        // Best-selling categories (Top 10)
        const bestSellingCategories = await Order.aggregate([
          { $unwind: "$orderedItems" },
          { $lookup: { from: 'products', localField: 'orderedItems.product', foreignField: '_id', as: 'productDetails' } },
          { $unwind: "$productDetails" },
          { $lookup: { from: 'categories', localField: 'productDetails.category', foreignField: '_id', as: 'categoryDetails' } },
          { $unwind: "$categoryDetails" },
          { $group: { _id: "$categoryDetails._id", name: { $first: "$categoryDetails.name" }, totalSold: { $sum: "$orderedItems.quantity" } } },
          { $sort: { totalSold: -1 } },
          { $limit: 10 }
        ]);
  
        // Best-selling brands (Top 10)
        const bestSellingBrands = await Order.aggregate([
          { $unwind: "$orderedItems" },
          { $lookup: { from: 'products', localField: 'orderedItems.product', foreignField: '_id', as: 'productDetails' } },
          { $unwind: "$productDetails" },
          { $group: { _id: "$productDetails.brand", totalSold: { $sum: "$orderedItems.quantity" } } },
          { $sort: { totalSold: -1 } },
          { $limit: 10 }
        ]);
  
        res.render('dashboard', {
          admin: "admin",
          orders,
          bestSellingProducts,
          bestSellingCategories,
          bestSellingBrands,
          salesData,  // Passing sales data for the chart
          filter ,     // Passing filter to adjust the chart rendering
          totalSalesCount,
          totalOrderAmount,
          totalDiscount,
          todayOrderAmount
        });
      } else {
        res.redirect('/admin/login');
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      res.status(500).redirect('pageerror');
    }
  };
  
// const getDashboard = async (req, res) => {
//   try {
//       const admin = req.session.admin;
//       if (admin) {
//           // Get filter from query
//           const { filter } = req.query; // 'yearly', 'monthly', 'weekly'
//           let dateFilter = {};
//           const currentDate = new Date();

//           // Filter based on time frame
//           if (filter === 'yearly') {
//               dateFilter.createdAt = { $gte: new Date(currentDate.getFullYear(), 0, 1) }; // From January 1st of the current year
//           } else if (filter === 'monthly') {
//               dateFilter.createdAt = { $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1) }; // From the first day of the current month
//           } else if (filter === 'weekly') {
//               const weekStart = new Date(currentDate);
//               weekStart.setDate(currentDate.getDate() - currentDate.getDay()); // Start of the week
//               dateFilter.createdAt = { $gte: weekStart }; // From the start of the week
//           }

//           // Fetch orders
//           const orders = await Order.find(dateFilter).populate('userId');

//           // Calculate total sales count, order amount, and discounts
//           const totalSalesCount = orders.length;
//           const totalOrderAmount = orders.reduce((acc, order) => {
//               return acc + (order.orderedItems ? order.orderedItems.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0);
//           }, 0).toFixed(2);

//           const totalDiscount = orders.reduce((acc, order) => acc + (order.discount || 0), 0).toFixed(2);

//           // Calculate today's orders
//           const today = moment().startOf('day');
//           const todayOrders = orders.filter(order => moment(order.invoiceDate).isSame(today, 'day'));

//           const todayOrderAmount = todayOrders.reduce((acc, order) => {
//               return acc + (order.orderedItems ? order.orderedItems.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0);
//           }, 0).toFixed(2);

//           // Aggregate sales data for charts
//           const salesData = await Order.aggregate([
//               { $match: dateFilter },
//               {
//                   $group: {
//                       _id: {
//                           year: { $year: "$createdAt" },  // Group by year
//                           month: { $month: "$createdAt" } // Group by month
//                       },
//                       totalSales: { $sum: "$totalAmount" }, // Total sales for each month
//                       totalOrders: { $sum: 1 } // Count of orders for each month
//                   }
//               },
//               { $sort: { "_id.year": 1, "_id.month": 1 } } // Sort by year and month
//           ]);

//           // Prepare sales data for chart
//           const labels = salesData.map(item => `${item._id.month}-${item._id.year}`); // Month-Year format
//           const ordersAmounts = salesData.map(item => item.totalOrders); // Total orders per month
//           const salesAmounts = salesData.map(item => item.totalSales); // Total sales per month

//           // Best-selling products (Top 10)
//           const bestSellingProducts = await Order.aggregate([
//               { $unwind: "$orderedItems" },
//               { $group: { _id: "$orderedItems.product", totalSold: { $sum: "$orderedItems.quantity" } } },
//               { $sort: { totalSold: -1 } },
//               { $limit: 10 },
//               { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productDetails' } },
//               { $unwind: "$productDetails" }
//           ]);

//           // Best-selling categories (Top 10)
//           const bestSellingCategories = await Order.aggregate([
//               { $unwind: "$orderedItems" },
//               { $lookup: { from: 'products', localField: 'orderedItems.product', foreignField: '_id', as: 'productDetails' } },
//               { $unwind: "$productDetails" },
//               { $lookup: { from: 'categories', localField: 'productDetails.category', foreignField: '_id', as: 'categoryDetails' } },
//               { $unwind: "$categoryDetails" },
//               { $group: { _id: "$categoryDetails._id", name: { $first: "$categoryDetails.name" }, totalSold: { $sum: "$orderedItems.quantity" } } },
//               { $sort: { totalSold: -1 } },
//               { $limit: 10 }
//           ]);

//           // Best-selling brands (Top 10)
//           const bestSellingBrands = await Order.aggregate([
//               { $unwind: "$orderedItems" },
//               { $lookup: { from: 'products', localField: 'orderedItems.product', foreignField: '_id', as: 'productDetails' } },
//               { $unwind: "$productDetails" },
//               { $group: { _id: "$productDetails.brand", totalSold: { $sum: "$orderedItems.quantity" } } },
//               { $sort: { totalSold: -1 } },
//               { $limit: 10 }
//           ]);

//           res.render('dashboard', {
//               admin: "admin",
//               orders,
//               bestSellingProducts,
//               bestSellingCategories,
//               bestSellingBrands,
//               salesData,  // Passing sales data for the chart
//               labels,      // Month-Year labels for the chart
//               ordersAmounts, // Total orders per month
//               salesAmounts, // Total sales per month
//               filter,     // Passing filter to adjust the chart rendering
//               totalSalesCount,
//               totalOrderAmount,
//               totalDiscount,
//               todayOrderAmount
//           });
//       } else {
//           res.redirect('/admin/login');
//       }
//   } catch (error) {
//       console.error('Error loading dashboard:', error);
//       res.status(500).send('Internal Server Error');
//   }
// };





module.exports ={
    getDashboard
}