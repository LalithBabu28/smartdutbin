const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "marfeb@2005", // update if needed
  database: "miniproject",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    process.exit(1); // Exit the process with a failure code
  }
  console.log("Connected to MySQL");
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required",
    });
  }

  const query = "SELECT * FROM students WHERE name = ? AND password = ?";
  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "An error occurred while checking credentials.",
      });
    }

    if (results.length > 0) {
      const user = results[0];
      console.log(user.name);
      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          rollnum: user.rollnum,
          phone: user.phone,
          age: user.age,
          type: user.type,
        },
      });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "kevinadeline123@gmail.com", // 🔁 Replace with your Gmail
    pass: "yxzw dnae yzuh xndh", // 🔁 Use App password if 2FA is enabled
  },
});

app.post("/send-waste-alerts", (req, res) => {
  const wasteThreshold = req.body.threshold; // <-- dynamic value from frontend

  const query = `
    SELECT s.name, s.gmail_id, SUM(w.waste_amount) AS total_waste
    FROM students s
    JOIN waste_logs w ON s.rollnum = w.rollnum
    WHERE s.type = 'student'
    GROUP BY s.rollnum, s.gmail_id, s.name
  `;

  db.query(query, [wasteThreshold], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res
        .status(500)
        .json({ message: "Failed to fetch data", error: err });
    }

    if (results.length === 0) {
      return res
        .status(200)
        .json({ message: "No students exceeded the waste threshold." });
    }

    // Send email to each student
    results.forEach((student) => {
      console.log(student);
      let subject, text;

      if (student.total_waste > wasteThreshold) {
        subject = "⚠️ Waste Management Alert - Threshold Exceeded";
        text = `Dear ${student.name},\n\nYour total food waste this month is ${
          student.total_waste
        }, which exceeds the allowed threshold of ${wasteThreshold}.\nPlease manage your food portions more responsibly.\n\nYour fine amount will be ₹${(
          (student.total_waste / 100) * 25 +
          student.total_waste
        ).toFixed(2)}/-\n\nThank you.`;
      } else {
        subject = "✅ Waste Management Notice - Within Limit";
        text = `Dear ${student.name},\n\nYour total food waste this month is ${student.total_waste}, which is within the allowed threshold of ${wasteThreshold}.\n\nHowever, a default fine of ₹3000/- will still be considered as per hostel policy.\n\nThank you.`;
      }
      const mailOptions = {
        from: "kevinadeline123@gmail.com",
        to: student.gmail_id,
        subject: subject,
        text: text,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(`Failed to send email to ${student.gmail_id}:`, error);
        } else {
          console.log(`Email sent to ${student.gmail_id}`);
        }
      });
    });

    res.status(200).json({
      message: "Emails sent to students exceeding the waste threshold.",
      recipients: results.map((s) => s.email),
    });
  });
});

// Get all students
app.get("/students", (req, res) => {
  const query = "SELECT * FROM students WHERE type = 'student'";
  db.query(query, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "An error occurred while fetching students.",
      });
    }
    console.log("SUCCESS", results);
    res.json(results);
  });
});

// Add a student
app.post("/students", (req, res) => {
  const { name, phone, age, password, rollnum } = req.body;

  if (!name || !phone || !age || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields (name, phone, age, password) are required",
    });
  }

  const type = "student";

  const query =
    "INSERT INTO students (name, phone, age, password, rollnum, type) VALUES (?, ?,  ?, ?, ?, ?)";

  db.query(
    query,
    [name, phone, age, password, rollnum, type],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred while adding the student.",
        });
      }
      res
        .status(201)
        .json({ success: true, message: "Student added successfully." });
    }
  );
});

//Group By
app.get("/waste-summary/:month", (req, res) => {
  const monthName = req.params.month;

  // Map month names to numbers (January -> 1, February -> 2, etc.)
  const monthMap = {
    January: 1,
    February: 2,
    March: 3,
    April: 4,
    May: 5,
    June: 6,
    July: 7,
    August: 8,
    September: 9,
    October: 10,
    November: 11,
    December: 12,
  };

  const monthNumber = monthMap[monthName];
  if (!monthNumber) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid month name. Please use a valid month name (e.g., January, February).",
    });
  }

  // Query to sum waste_amount for each student for the given month
  const query = `
    SELECT rollnum, SUM(waste_amount) AS total_waste
    FROM waste_logs
    WHERE MONTH(created_at) = ? 
    GROUP BY rollnum
  `;
  db.query(query, [monthNumber], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "An error occurred while fetching the waste summary.",
      });
    }
    console.log(results);

    // Return the results
    res.json({
      success: true,
      data: results,
    });
  });
});

// Delete a student
app.delete("/students/:id", (req, res) => {
  const query = "DELETE FROM students WHERE rollnum = ? AND type = 'student'";

  db.query(query, [req.params.id], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "An error occurred while deleting the student.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found or already deleted.",
      });
    }

    res.json({ success: true, message: "Student deleted successfully." });
  });
});

// Update student
app.put("/students/:id", (req, res) => {
  const { name, phone, age, password } = req.body;

  if (!name || !phone || !age || !password) {
    return res.status(400).json({
      success: false,
      message:
        "All fields (name, phone, age, password) are required to update.",
    });
  }

  const query =
    "UPDATE students SET name = ?, phone = ?, age = ?, password = ? WHERE rollnum = ? AND type = 'student'";

  db.query(
    query,
    [name, phone, age, password, req.params.id],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "An error occurred while updating the student.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Student not found or no changes made.",
        });
      }

      res.json({ success: true, message: "Student updated successfully." });
    }
  );
});

// Get wastage details for a specific student
app.get("/wastage-details/:rollnum", (req, res) => {
  const rollnum = req.params.rollnum;
  const query = `
    SELECT waste_amount, created_at
    FROM waste_logs
    WHERE rollnum = ?
    ORDER BY created_at DESC
  `;
  db.query(query, [rollnum], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "An error occurred while fetching wastage details.",
      });
    }
    res.json({
      success: true,
      data: results,
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
