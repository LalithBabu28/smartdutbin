import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AdminHome = () => {
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    age: "",
    password: "",
    rollnum: "",
  });
  const [selectedMonth, setSelectedMonth] = useState("January"); // Track selected month
  const [wasteData, setWasteData] = useState([]); // Store fetched waste data

  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const navigate = useNavigate();

  const [isAnalyseModalOpen, setIsAnalyseModalOpen] = useState(false);
  const [mlInput, setMlInput] = useState({
    season: "",
    day_type: "",
    day: "",
    meal_category: "",
    students: "",
  });
  const [mlOutput, setMlOutput] = useState(null);
  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };
  const [showDialog, setShowDialog] = useState(false);
  const [threshold, setThreshold] = useState("");

  const handleGenerate = async () => {
    try {
      const response = await axios.post(
        "http://localhost:5000/send-waste-alerts",
        {
          threshold: Number(threshold), // send as number
        }
      );
      alert(response.data.message);
      console.log("Recipients:", response.data.recipients);
      setThreshold("")
    } catch (error) {
      alert("Error sending emails");
      console.error(error);
    }
  };

  const fetchWasteSummary = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/waste-summary/${selectedMonth}`
      );
      const data = await response.json();
      console.log(data.data);

      if (data.success) {
        setWasteData(data.data);
        setShowDialog(!showDialog);
        setError("");
      } else {
        setError(data.message); // Show error message if API fails
      }
      console.log(wasteData);
    } catch (err) {
      console.error("Error fetching waste summary:", err);
      setError("An error occurred while fetching the data.");
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get("http://localhost:5000/students");
      console.log("Fetched Students:", res.data);
      setStudents(res.data);
      setError("");
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to fetch students.");
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleLogout = () => {
    navigate("/");
  };

  const validateForm = () => {
    const { name, phone, age, password, rollnum } = formData;
    if (!name || !phone || !age || !password || !rollnum) {
      setValidationError("All fields are required.");
      return false;
    }
    if (parseInt(age) < 18) {
      setValidationError("Age must be greater than or equal to 18.");
      return false;
    }
    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters long.");
      return false;
    }
    if (phone.length !== 10 || isNaN(phone)) {
      setValidationError("Phone number must be 10 digits long.");
      return false;
    }
    setValidationError("");
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      await axios.post("http://localhost:5000/students", formData);
      fetchStudents();
      setFormData({ name: "", phone: "", age: "", password: "", rollnum: "" });
      setError("");
    } catch (err) {
      setError("Failed to add student.");
    }
  };

  const handleDelete = async (rollnum) => {
    try {
      await axios.delete(`http://localhost:5000/students/${rollnum}`);
      fetchStudents();
      setError("");
    } catch (err) {
      setError("Failed to delete student.");
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;
    try {
      await axios.put(
        `http://localhost:5000/students/${editingStudentId}`,
        formData
      );
      fetchStudents();
      setError("");
      closeModal();
    } catch (err) {
      setError("Failed to update student.");
    }
  };

  const openModal = (student) => {
    setEditingStudentId(student.rollnum);
    setFormData({
      name: student.name,
      phone: student.phone,
      age: student.age,
      password: student.password,
      rollnum: student.rollnum,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStudentId(null);
    setFormData({ name: "", phone: "", age: "", password: "", rollnum: "" });
  };

  const analysisConfig = {
    fields: [
      { name: "season", placeholder: "Season : Summer , Winter , Spring" },
      { name: "day_type", placeholder: "Day Type : Weekday , Holiday" },
      { name: "day", placeholder: "Day : Sunday , Monday , ..." },
      {
        name: "meal_category",
        placeholder: "Meal Category : Lunch / Breakfast / Dinner",
      },
      { name: "students", placeholder: "no. of students " },
    ],
    endpoint: "http://localhost:5001/predict",
  };

  const handleAnalyse = async () => {
    try {
      // Log the input data to verify it
      console.log("Sending mlInput:", mlInput);

      // Optional: Add frontend validation
      if (
        !mlInput.season ||
        !mlInput.day_type ||
        !mlInput.day ||
        !mlInput.meal_category ||
        !mlInput.students
      ) {
        throw new Error("All fields must be filled.");
      }
      if (isNaN(mlInput.students) || parseInt(mlInput.students) <= 0) {
        throw new Error("Students must be a positive integer.");
      }

      const response = await axios.post(analysisConfig.endpoint, mlInput);
      console.log("Prediction response:", response.data);
      setMlOutput(response.data);
      setError("");
    } catch (error) {
      if (error.response) {
        // Server responded with a status code outside 2xx
        console.error(
          "Server error:",
          error.response.status,
          error.response.data
        );
        setError(
          `Prediction failed: ${
            error.response.data.error || "Unknown server error"
          }`
        );
      } else if (error.request) {
        // No response received (e.g., server not running or CORS issue)
        console.error("No response received:", error.request);
        setError(
          "Prediction failed: No response from server. Is the Flask app running?"
        );
      } else {
        // Error setting up the request (e.g., validation error)
        console.error("Request setup error:", error.message);
        setError(`Prediction failed: ${error.message}`);
      }
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex flex-row justify-between">
        <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
        <button
          className="bg-red-500 text-white px-4 my-3 rounded"
          onClick={handleLogout}
        >
          Log out
        </button>
      </div>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {validationError && (
        <div className="text-red-600 mb-4">{validationError}</div>
      )}
      <div className="mb-6 space-y-3">
        <input
          className="border p-2 rounded w-full"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <input
          className="border p-2 rounded w-full"
          placeholder="Roll Number"
          value={formData.rollnum}
          onChange={(e) =>
            setFormData({ ...formData, rollnum: e.target.value })
          }
        />
        <input
          className="border p-2 rounded w-full"
          placeholder="Phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
        <input
          className="border p-2 rounded w-full"
          placeholder="Age"
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
        />
        <input
          className="border p-2 rounded w-full"
          placeholder="Password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
        />
        <div className="flex justify-between items-center">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            onClick={handleCreate}
          >
            Add Student
          </button>
          <div className="flex items-center space-x-2">
            <select
              className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={selectedMonth}
              onChange={handleMonthChange}
            >
              {[
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].map((month, index) => (
                <option key={index} value={month}>
                  {month}
                </option>
              ))}
            </select>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              onClick={fetchWasteSummary}
            >
              Generate
            </button>
          </div>
          <button
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
            onClick={() => {
              console.log("Opening analyse modal");
              setIsAnalyseModalOpen(true);
            }}
          >
            Analyse
          </button>
        </div>{" "}
      </div>
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-xl w-full">
            <h2 className="text-xl font-semibold mb-4">
              Waste Summary - {selectedMonth}
            </h2>

            {wasteData.length > 0 ? (
              <table className="min-w-full table-auto text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 border-b text-left">
                      Roll Number
                    </th>
                    <th className="px-4 py-2 border-b text-left">
                      Total Waste (gram)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {wasteData.map((entry, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 border-b">{entry.rollnum}</td>
                      <td className="px-4 py-2 border-b">
                        {entry.total_waste}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No data available for this month.</p>
            )}
            <div className="flex items-center space-x-2 mt-4">
              <input
                type="number"
                className="border p-2 rounded w-1/2"
                placeholder="Enter the Threshold value"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              ></input>{" "}
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                onClick={handleGenerate}
              >
                Generate
              </button>
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={() => setShowDialog(false)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="table-auto w-full bg-white shadow-md rounded">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Roll Number</th>
            <th className="px-4 py-2">Phone</th>
            <th className="px-4 py-2">Age</th>

             <th className="px-4 py-2">Actions</th> 
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.rollnum} className="text-center">
              <td className="px-4 py-2">{student.name}</td>
              <td className="px-4 py-2">{student.rollnum}</td>
              <td className="px-4 py-2">{student.phone}</td>
              <td className="px-4 py-2">{student.age}</td>
              <td className="px-4 py-2 space-x-2">
                <button
                  className="bg-yellow-500 text-white px-2 py-1 rounded"
                  onClick={() => openModal(student)}
                >
                  Edit
                </button>
                <button
                  className="bg-red-500 text-white px-2 py-1 rounded"
                  onClick={() => handleDelete(student.rollnum)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-1/3 ">
            <h2 className="text-2xl font-bold mb-4">Edit Student</h2>
            <input
              className="border p-2 rounded w-full mb-3"
              placeholder="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <input
              className="border p-2 rounded w-full mb-3"
              placeholder="Roll Number"
              value={formData.rollnum}
              onChange={(e) =>
                setFormData({ ...formData, rollnum: e.target.value })
              }
            />
            <input
              className="border p-2 rounded w-full mb-3"
              placeholder="Phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
            <input
              className="border p-2 rounded w-full mb-3"
              placeholder="Age"
              value={formData.age}
              onChange={(e) =>
                setFormData({ ...formData, age: e.target.value })
              }
            />

            <input
              className="border p-2 rounded w-full mb-3"
              placeholder="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
            <div className="flex justify-between">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={handleUpdate}
              >
                Update
              </button>
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded"
                onClick={closeModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isAnalyseModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-1/3 h-[60vh] overflow-y-scroll  ">
            <h2 className="text-2xl font-bold mb-4">Waste Prediction Input</h2>
            {analysisConfig.fields.map((field) => (
              <input
                key={field.name}
                className="border p-2 rounded w-full mb-3"
                placeholder={field.placeholder}
                value={mlInput[field.name]}
                onChange={(e) =>
                  setMlInput({ ...mlInput, [field.name]: e.target.value })
                }
              />
            ))}
            <div className="flex justify-between mt-4">
              <button
                className="bg-green-500 text-white px-4 py-2 rounded"
                onClick={handleAnalyse}
              >
                Predict
              </button>
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded"
                onClick={() => {
                  console.log("Closing analyse modal");
                  setIsAnalyseModalOpen(false);
                  setMlInput({
                    season: "",
                    day_type: "",
                    day: "",
                    meal_category: "",
                    students: "",
                  });
                  setMlOutput(null);
                }}
              >
                Cancel
              </button>
            </div>
            <div>
              {mlOutput && (
                <div className="mt-4 text-sm">
                  <p className="text-lg font-semibold mb-2">
                    <strong>Prediction Result:</strong>
                  </p>
                  {/* Predictions Table */}
                  {mlOutput.predictions && (
                    <div className="mb-4">
                      <h3 className="text-md font-medium mb-1">
                        Predicted Waste by Dish:
                      </h3>
                      <table className="table-auto w-full bg-gray-50 border border-gray-200 rounded">
                        <thead>
                          <tr className="bg-gray-200">
                            <th className="px-4 py-2 text-left">Dish Name</th>
                            <th className="px-4 py-2 text-left">
                              Predicted Waste (kg)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(mlOutput.predictions).map(
                            ([dishName, waste], index) => (
                              <tr
                                key={index}
                                className={
                                  index % 2 === 0 ? "bg-white" : "bg-gray-100"
                                }
                              >
                                <td className="px-4 py-2">{dishName}</td>
                                <td className="px-4 py-2">
                                  {waste.toFixed(2)}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Summary Section */}
                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <h3 className="text-md font-medium mb-2">Summary:</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <p>
                        <strong>Total Waste:</strong>{" "}
                        {mlOutput.total_waste
                          ? mlOutput.total_waste.toFixed(2)
                          : "N/A"}{" "}
                        kg
                      </p>
                      <p>
                        <strong>Total Prepared:</strong>{" "}
                        {mlOutput.total_prepared
                          ? mlOutput.total_prepared.toFixed(2)
                          : "N/A"}{" "}
                        kg
                      </p>
                      <p>
                        <strong>Min Cost:</strong> ₹
                        {mlOutput.total_min_cost
                          ? mlOutput.total_min_cost.toFixed(2)
                          : "N/A"}
                      </p>
                      <p>
                        <strong>Max Cost:</strong> ₹
                        {mlOutput.total_max_cost
                          ? mlOutput.total_max_cost.toFixed(2)
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}{" "}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHome;
