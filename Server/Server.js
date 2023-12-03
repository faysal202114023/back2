const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const db = require("./db");
const cors = require("cors");
const ejs = require("ejs");
const pdf = require("html-pdf");
const Order = require("./Schema/orderSchema");
const TrainRoute = require("./Schema/trainRoute"); // Adjust the path accordingly
const Ticket = require("./Schema/ticketSchema");
const Payment = require("./Schema/paymentSchema");
const User = require("./Schema/userDetails");
const MissingPersonReport = require("./Schema/MissingPersonReportSchema.js");
const Emergency = require("./Schema/EmergencySchema");

const multer = require("multer");

// Set up Multer to handle file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Limit file size to 5 MB
});

const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const JWT_SECRET = "jwt-secret-key";
const app = express();

app.use(cookieParser());

app.use(bodyParser.json());
// Define a middleware function to check the database connection status
const checkDatabaseConnection = (req, res, next) => {
  if (mongoose.connection.readyState == 2) {
    // Connection is not open (1 is the readyState for an open connection)
    return res.status(503).json({ Message: "Database is Connecting" });
  } else if (mongoose.connection.readyState !== 1) {
    // Connection is not open (1 is the readyState for an open connection)
    return res.status(503).json({ error: "Database not connected" });
  }
  // Connection is open, continue processing the request
  next();
};

app.use(cors());

// Apply the middleware to all routes
app.use(checkDatabaseConnection);

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});

app.post("/get-ticket-link", async (req, res) => {
  try {
    const { paymentMethod, amount, phoneNumber, password, ticketId, userId } =
      req.body;

    // You may need to perform authentication and authorization checks here

    // Find the payment document based on the provided parameters
    const payment = await Payment.findOne({ ticketId });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Find additional information based on the ticket
    const ticket = await Ticket.findOne({ _id: ticketId })
      .populate({
        path: "trainRouteId",
        select: ["trainName", "routes"],
        populate: { path: "routes", select: ["stationName"] },
      })
      .populate("userId", ["email"]);

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Include necessary information in the response
    const responseData = {
      payment: payment.toObject(),
      userId,
      trainName: ticket.trainRouteId.trainName,
      stationName: ticket.trainRouteId.routes[0].stationName, // Assuming the first station in the route
      seatNumber: ticket.bookedSeat, // Assuming bookedSeat is an array
      totalAmount: amount,
      phoneNo: phoneNumber,
      username: ticket.userId.email,
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching ticket link:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/store-payment-details", async (req, res) => {
  try {
    const { paymentMethod, amount, phoneNumber, password, ticketId } = req.body;

    // Store payment details in MongoDB
    const payment = new Payment({
      paymentMethod,
      ticketId,
      amount,
      phoneNumber,
      password,
    });

    await payment.save();

    res.status(200).json({ message: "Payment details stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/store-order", async (req, res) => {
  try {
    const { total, seatNumber, cabinNumber, email } = req.body;
    console.log(req.body);

    // Create a new order instance
    const newOrder = new Order({
      total,
      seatNumber,
      cabinNumber,
      email,
    });

    // Save the order to the database
    await newOrder.save();

    res.status(201).json({ message: "Order stored successfully" });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ status: "error", message: "User already exists" });
    }

    // Create a new user
    const newUser = new User({ email, password });
    await newUser.save();

    res.json({ status: "ok", message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

//login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(401)
        .json({ status: "error", error: "Invalid credentials" });
    }

    if (user.password === password) {
      // Include isAdmin field in the response
      return res.json({
        email: user.email,
        userId: user._id.toString(),
        isAdmin: user.isAdmin, // Include isAdmin field
        message: "Logged in successfully.",
        status: "ok",
      });
    }

    return res.json({ status: "error", error: "Invalid Password" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "error", error: "Internal server error" });
  }
});

app.get("/allStationNames", async (req, res) => {
  try {
    const uniqueStationNames = await TrainRoute.distinct("routes.stationName");
    if (uniqueStationNames.length === 0) {
      return res.status(404).json({ error: "No station names found" });
    }
    res.status(200).json(uniqueStationNames);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/trainRouteSearch", async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromLowerCase = from.toLowerCase();
    const toLowerCase = to.toLowerCase();
    const routes = await TrainRoute.find({
      $and: [
        { "routes.stationName": { $regex: new RegExp(fromLowerCase, "i") } },
        { "routes.stationName": { $regex: new RegExp(toLowerCase, "i") } },
      ],
    });
    // console.log(routes);

    const validRoutes = routes.filter((route) => {
      const fromIndex = route.routes.findIndex(
        (station) => station.stationName.toLowerCase() === fromLowerCase
      );
      const toIndex = route.routes.findIndex(
        (station) => station.stationName.toLowerCase() === toLowerCase
      );
      return fromIndex < toIndex;
    });

    if (validRoutes.length === 0) {
      return res.status(404).json({ error: "No valid routes found" });
    }

    const matchingTrains = validRoutes.map((route) => ({
      trainName: route.trainName,
      startingPoint: route.startingPoint,
      endingPoint: route.endingPoint,
      _id: route._id,
    }));
    res.status(200).json(matchingTrains);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// get the array of booked seat no for a specific train route id

// New endpoint to get the array of booked seat numbers for a specific train route ID
app.get("/booked-seats/:trainRouteId", async (req, res) => {
  try {
    const trainRouteId = req.params.trainRouteId;

    // Find all tickets for the specified train route ID
    const tickets = await Ticket.find({ trainRouteId });

    // Extract and concatenate all booked seat numbers from the tickets
    const bookedSeatNumbers = tickets.reduce((allSeats, ticket) => {
      allSeats.push(...ticket.bookedSeat);
      return allSeats;
    }, []);

    res.json({ bookedSeatNumbers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/ticket-details/:ticketId", async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const ticketDetails = await Ticket.findById(ticketId)
      .populate({
        path: "trainRouteId",
        model: TrainRoute,
      })
      .exec();

    res.json(ticketDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//admin
app.get("/reservation", async (req, res) => {
  try {
    // Fetch all payments excluding sensitive information like passwords
    const payments = await Payment.find({}, { password: 0 });

    res.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/reservation/:id", async (req, res) => {
  try {
    const paymentId = req.params.id;

    // Validate if the provided ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ error: "Invalid payment ID" });
    }

    // Find and delete the payment record by ID, excluding the password field
    const deletedPayment = await Payment.findByIdAndDelete(paymentId, {
      password: 0,
    });

    if (!deletedPayment) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    res.json({ message: "Payment record deleted successfully" });
  } catch (error) {
    console.error("Error deleting payment record:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/user-list", async (req, res) => {
  try {
    // Fetch all users
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

// Route to book a ticket
app.post("/book-ticket", async (req, res) => {
  const { trainRouteId, bookedSeat, userId } = req.body;

  try {
    // Check if the specified train route exists
    const trainRoute = await TrainRoute.findById(trainRouteId);
    if (!trainRoute) {
      return res.status(404).json({ error: "Train route not found" });
    }

    // Check if the seats are available
    const bookedSeatsForRoute = await Ticket.findOne({ trainRouteId });
    if (bookedSeatsForRoute) {
      const reservedSeats = bookedSeatsForRoute.bookedSeat;

      for (const seat of bookedSeat) {
        if (reservedSeats.includes(seat)) {
          return res.status(400).json({ message: "Seat already booked" });
        }
      }
    }

    // Create a new ticket and update the booked seats
    const ticket = new Ticket({
      trainRouteId,
      userId,
      bookedSeat,
    });

    await ticket.save();

    res
      .status(201)
      .json({
        ticket: ticket,
        message: "Ticket booked successfully",
        ticketId: ticket._id.toString(),
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/user-list/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate if the provided ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Find and delete the user by ID
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/user-list", async (req, res) => {
  try {
    const { email, password, isAdmin } = req.body;

    // Validate required fields (add more validation as needed)
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please provide email and password" });
    }

    // Create a new user
    const newUser = new User({
      email,
      password,
      isAdmin: isAdmin || false, // Default to false if not provided
    });

    // Save the user to the database
    const savedUser = await newUser.save();

    res.json(savedUser);
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/orders/:id", async (req, res) => {
  try {
    const orderId = req.params.id;

    // Validate if the provided ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    // Find and delete the order by ID
    const deletedOrder = await Order.findByIdAndDelete(orderId);

    if (!deletedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/train-list", async (req, res) => {
  try {
    // Fetch all train routes from the TrainRoute model
    const trainRoutes = await TrainRoute.find();

    // Send the fetched train routes as a response
    res.json(trainRoutes);
  } catch (error) {
    console.error("Error fetching train routes:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/save-emergency", async (req, res) => {
  try {
    const { emergencyType, additionalDetails } = req.body;

    // Create a new Emergency instance
    const emergency = new Emergency({
      emergencyType,
      additionalDetails,
    });

    // Save the emergency to the database
    await emergency.save();

    console.log("Emergency report saved successfully");
    res.status(200).json({ message: "Emergency report saved successfully" });
  } catch (error) {
    console.error("Error saving emergency report:", error.message);
    res
      .status(500)
      .json({ error: "Internal Server Error", message: error.message });
  }
});

app.post(
  "/save-missing-person-report",
  upload.array("photos", 5),
  async (req, res) => {
    try {
      const { reporterName, missingPersonName } = req.body;
      const photos = req.files;

      if (!photos || photos.length === 0) {
        console.error("No files uploaded");
        return res.status(400).json({ error: "No files uploaded" });
      }

      // Continue with processing photos
      const photoData = photos.map((photo) => ({
        data: photo.buffer,
        contentType: photo.mimetype,
      }));

      // Create a new MissingPersonReport instance
      const missingPersonReport = new MissingPersonReport({
        reporterName,
        missingPersonName,
        photos: photoData,
      });

      // Log received data for debugging
      console.log("Received Data:");
      console.log("Reporter Name:", reporterName);
      console.log("Missing Person Name:", missingPersonName);
      console.log("Number of Photos:", photos.length);

      // Log the created MissingPersonReport for debugging
      console.log("Created MissingPersonReport:", missingPersonReport);

      // Save the report to the database
      await missingPersonReport.save();

      // Respond with success message
      res
        .status(200)
        .json({ message: "Missing person report saved successfully" });
    } catch (error) {
      console.error("Error saving missing person report:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

app.get("/admin/missing-person-reports", async (req, res) => {
  try {
    // Fetch all missing person reports from the database
    const missingPersonReports = await MissingPersonReport.find();

    // Respond with the fetched data
    res.status(200).json(missingPersonReports);
  } catch (error) {
    console.error("Error fetching missing person reports:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/admin/emergencies", async (req, res) => {
  try {
    const emergencies = await Emergency.find();
    res.json(emergencies);
  } catch (error) {
    console.error("Error fetching emergencies:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/delete-emergency/:emergencyId", async (req, res) => {
  const { emergencyId } = req.params;

  try {
    // Find the emergency by ID and delete it
    const deletedEmergency = await Emergency.findByIdAndDelete(emergencyId);

    if (!deletedEmergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    res.status(200).json({ message: "Emergency deleted successfully" });
  } catch (error) {
    console.error("Error deleting emergency:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/delete-report/:id", async (req, res) => {
  const reportId = req.params.id;

  try {
    // Find the report by ID
    const report = await MissingPersonReport.findById(reportId);

    // Check if the report exists
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Delete the report
    await MissingPersonReport.deleteOne({ _id: reportId });

    res.status(200).json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/add-train", async (req, res) => {
  try {
    const trainData = req.body;
    const newTrain = new TrainRoute(trainData);
    const savedTrain = await newTrain.save();

    res.status(201).json(savedTrain);
  } catch (error) {
    console.error("Error adding train:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/delete-train/:trainId", async (req, res) => {
  const { trainId } = req.params;

  try {
    const deletedTrain = await TrainRoute.findByIdAndDelete(trainId);

    if (!deletedTrain) {
      return res.status(404).json({ message: "Train not found" });
    }

    res.json({ message: "Train deleted successfully", deletedTrain });
  } catch (error) {
    console.error("Error deleting train:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
