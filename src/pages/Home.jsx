import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { client } from "../sanityClient";
import UploadImages from "../components/UploadImages"; // Import Upload Component

const Home = () => {
  const [events, setEvents] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("events");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventsData = await client.fetch(
          `*[_type == "event"] | order(_updatedAt desc) {_id, name, startDateTime, mode, society, _updatedAt}`
        );
        setEvents(eventsData);
  
        const teamData = await client.fetch(
          `*[_type == "team"] | order(_updatedAt desc) {_id, name, position, society, _updatedAt}`
        );
        setTeamMembers(teamData);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []); 
  
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Navbar */}
      <div className="flex justify-between items-center bg-gray-800 p-4 shadow-md">
        <h1 className="text-2xl font-bold tracking-wide">Admin Dashboard</h1>
        <button
          className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

      {/* Tabs for Navigation */}
      <div className="flex justify-center border-b border-gray-700 mt-4">
        {["events", "team"].map((tab) => (
          <button
            key={tab}
            className={`px-6 py-3 text-lg font-semibold ${
              activeTab === tab ? "border-b-2 border-blue-500" : "text-gray-400"
            } hover:text-white transition`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "events" ? "Events" : "Team Members"}
          </button>
        ))}
      </div>

      {/* Upload Image Section */}
      <div className="max-w-4xl mx-auto w-full mt-6">
        <UploadImages />
      </div>

      {/* Content Area */}
      <div className="flex-grow flex flex-col p-6 max-w-6xl mx-auto w-full">
        {loading ? (
          <p className="text-center text-gray-400">Loading data...</p>
        ) : activeTab === "events" ? (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full flex-grow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Events</h2>
              <button
                onClick={() => navigate("/add-event")}
                className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition"
              >
                + Add Event
              </button>
            </div>
            <ul className="divide-y divide-gray-700">
              {events.length > 0 ? (
                events.map((event) => (
                  <li
                    key={event._id}
                    className="py-3 cursor-pointer hover:bg-gray-700 p-3 rounded"
                    onClick={() => navigate(`/edit-event/${event._id}`)}
                  >
                    <h3 className="text-lg font-semibold">{event.name}</h3>
                    <p className="text-sm text-gray-400">
                      {event.startDateTime
                        ? new Date(event.startDateTime).toLocaleString()
                        : "No date available"}{" "}
                      | <span className="font-medium">{event.mode}</span> |{" "}
                      <span className="text-blue-400">{event.society}</span>
                    </p>
                  </li>
                ))
              ) : (
                <p className="text-gray-500 mt-2">No events found.</p>
              )}
            </ul>
          </div>
        ) : (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full flex-grow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Team Members</h2>
              <button
                onClick={() => navigate("/add-team")}
                className="bg-green-500 px-4 py-2 rounded hover:bg-green-600 transition"
              >
                + Add Team Member
              </button>
            </div>
            <ul className="divide-y divide-gray-700">
              {teamMembers.length > 0 ? (
                teamMembers.map((member) => (
                  <li key={member._id} 
                  className="py-3 cursor-pointer hover:bg-gray-700 p-3 rounded"
                  onClick={() => navigate(`/edit-team/${member._id}`)}>
                    <h3 className="text-lg font-semibold">{member.name}</h3>
                    <p className="text-sm text-gray-400">
                      {member.position} |{" "}
                      <span className="text-green-400">{member.society}</span>
                    </p>
                  </li>
                ))
              ) : (
                <p className="text-gray-500 mt-2">No team members found.</p>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
