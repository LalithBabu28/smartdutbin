import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const StudentPage = () => {
  const [student, setStudent] = useState(null);
  const [wastageDetails, setWastageDetails] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudentDetails = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem("student"));
        if (!userData || userData.type !== "student") {
          navigate("/login");
        } else {
          setStudent(userData);
          // Fetch wastage details
          const response = await axios.get(`http://localhost:5000/wastage-details/${userData.rollnum}`);
          if (response.data.success) {
            setWastageDetails(response.data.data);
          }
        }
      } catch (error) {
        navigate("/login");
      }
    };
    fetchStudentDetails();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      {student ? (
        <div className="bg-white p-6 rounded shadow-md w-full max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Student Details</h2>
          <div className="mb-3">
            <strong>Name:</strong> {student.name}
          </div>
          <div className="mb-3">
            <strong>Roll Number:</strong> {student.rollnum}
          </div>
          <div className="mb-3">
            <strong>Phone:</strong> {student.phone}
          </div>
          <div className="mb-3">
            <strong>Age:</strong> {student.age}
          </div>

          <h3 className="text-xl font-semibold mt-6 mb-4">Wastage Details</h3>
          {wastageDetails.length > 0 ? (
            <div className="overflow-x-auto h-80">
              <table className="min-w-full bg-white border">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border">Waste Amount</th>
                    <th className="py-2 px-4 border">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {wastageDetails.map((entry, index) => (
                    <tr key={index}>
                      <td className="py-2 px-4 border">{entry.waste_amount}</td>
                      <td className="py-2 px-4 border">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No wastage details available.</p>
          )}

          <button
            onClick={handleLogout}
            className="mt-6 bg-red-500 text-white px-4 py-2 rounded w-full"
          >
            Logout
          </button>
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
};

export default StudentPage;