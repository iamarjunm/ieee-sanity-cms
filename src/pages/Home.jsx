import React, { useEffect, useState, useMemo, useCallback } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { client } from "../sanityClient";
import MediaLibrary from "../components/MediaLibrary";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  FaSpinner,
  FaRocket,
  FaUsers,
  FaCalendarAlt,
  FaImages,
  FaSearch,
  FaTimes,
  FaPlus,
  FaEdit,
  FaDownload,
  FaFileCsv,
} from "react-icons/fa";

const Home = () => {
  const [events, setEvents] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("events");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSociety, setSelectedSociety] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const navigate = useNavigate();

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItemType, setEditItemType] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null);

  // Fetch data from Sanity
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const eventsData = await client.fetch(
        `*[_type == "event"] | order(_updatedAt desc) {_id, name, startDateTime, endDateTime, mode, society, _updatedAt}`
      );
      setEvents(eventsData);

      const teamData = await client.fetch(
        `*[_type == "team"] | order(_updatedAt desc) {_id, name, position, society, year, _updatedAt}`
      );
      setTeamMembers(teamData);
    } catch (err) {
      console.error("Error fetching data:", err);
      alert("Failed to fetch data. Please check your connection or Sanity setup.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper functions
  const getEventStatus = useCallback((startDateTime, endDateTime) => {
    if (!startDateTime) return "N/A";
    const now = new Date();
    const start = new Date(startDateTime);
    const end = endDateTime ? new Date(endDateTime) : null;

    if (end && now > end) return "Completed";
    if (now >= start && (!end || now <= end)) return "Ongoing";
    return "Upcoming";
  }, []);

  const isNewItem = (updatedAt) => {
    if (!updatedAt) return false;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return new Date(updatedAt) > oneHourAgo;
  };

  // Filter and sort data
  const allSocieties = useMemo(() => {
    const societies = activeTab === "events" 
      ? events.map(e => e.society).filter(Boolean)
      : teamMembers.map(m => m.society).filter(Boolean);
    return [...new Set(societies)].sort();
  }, [events, teamMembers, activeTab]);

  const allYears = useMemo(() => {
    const years = new Set();
    if (activeTab === "events") {
      events.forEach(e => e.startDateTime && years.add(new Date(e.startDateTime).getFullYear().toString()));
    } else {
      teamMembers.forEach(m => m.year && years.add(m.year.toString()));
    }
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [events, teamMembers, activeTab]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = ['name', 'mode', 'society'].some(field => 
        String(event[field] || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesSociety = selectedSociety ? event.society === selectedSociety : true;
      const eventYear = event.startDateTime ? new Date(event.startDateTime).getFullYear().toString() : '';
      const matchesYear = selectedYear ? eventYear === selectedYear : true;
      
      return matchesSearch && matchesSociety && matchesYear;
    });
  }, [events, searchTerm, selectedSociety, selectedYear]);

  const filteredTeamMembers = useMemo(() => {
    return teamMembers.filter(member => {
      const matchesSearch = ['name', 'position', 'society'].some(field => 
        String(member[field] || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesSociety = selectedSociety ? member.society === selectedSociety : true;
      const matchesYear = selectedYear ? member.year?.toString() === selectedYear : true;
      
      return matchesSearch && matchesSociety && matchesYear;
    });
  }, [teamMembers, searchTerm, selectedSociety, selectedYear]);

  // UI handlers
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed. Please try again.");
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedSociety("");
    setSelectedYear("");
  };

  const handleWebhookRefetch = () => {
    console.log("Webhook signal received! Refetching data...");
    fetchData();
  };

  // Modal handlers
  const openEditModal = (type, item) => {
    setEditItemType(type);
    setItemToEdit(item);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditItemType(null);
    setItemToEdit(null);
  };

  const handleEditConfirm = () => {
    if (editItemType === 'event' && itemToEdit) {
      navigate(`/edit-event/${itemToEdit._id}`);
    } else if (editItemType === 'team' && itemToEdit) {
      navigate(`/edit-team/${itemToEdit._id}`);
    }
    closeEditModal();
  };

  // Data export functions
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert("No data to export!");
      return;
    }

    // Extract headers, excluding internal fields
    const headers = Object.keys(data[0]).filter(key => !['_type', '_rev'].includes(key));
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    data.forEach(item => {
      const row = headers.map(header => {
        // Handle dates and nested objects
        if (header === 'startDateTime' || header === 'endDateTime' || header === '_updatedAt') {
          return `"${new Date(item[header]).toLocaleString()}"`;
        }
        return `"${String(item[header] || '').replace(/"/g, '""')}"`;
      });
      csvContent += row.join(',') + '\n';
    });

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = (data, filename) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Dashboard statistics
  const dashboardStats = useMemo(() => {
    const upcomingEvents = events.filter(e => getEventStatus(e.startDateTime, e.endDateTime) === "Upcoming").length;
    const ongoingEvents = events.filter(e => getEventStatus(e.startDateTime, e.endDateTime) === "Ongoing").length;
    const completedEvents = events.filter(e => getEventStatus(e.startDateTime, e.endDateTime) === "Completed").length;

    return {
      totalEvents: events.length,
      upcomingEvents,
      ongoingEvents,
      completedEvents,
      totalTeamMembers: teamMembers.length,
    };
  }, [events, teamMembers, getEventStatus]);

  const recentActivity = useMemo(() => {
    const allItems = [
      ...events.map(e => ({ ...e, type: 'event', displayTime: new Date(e._updatedAt).toLocaleString() })),
      ...teamMembers.map(tm => ({ ...tm, type: 'team', displayTime: new Date(tm._updatedAt).toLocaleString() })),
    ];
    return allItems
      .sort((a, b) => new Date(b._updatedAt) - new Date(a._updatedAt))
      .slice(0, 3);
  }, [events, teamMembers]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white font-sans overflow-hidden">
      {/* Navbar */}
      <div className="flex justify-between items-center bg-gray-800 p-4 shadow-md sticky top-0 z-20 border-b border-gray-700">
        <div className="flex items-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-blue-400 mr-4">Admin Dashboard</h1>
          {auth.currentUser && (
            <span className="text-sm text-gray-400 hidden sm:block">
              Welcome, {auth.currentUser.email}!
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col p-6 max-w-7xl mx-auto w-full">

        {/* Dashboard Overview Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-green-400 mb-3 flex items-center">
                <FaCalendarAlt className="mr-2 text-green-500"/> Total Events
              </h3>
              <p className="text-5xl font-extrabold text-white">
                {loading ? <FaSpinner className="animate-spin" /> : dashboardStats.totalEvents}
              </p>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              <p className="flex justify-between items-center"><span className="text-blue-300">Upcoming:</span> <span className="font-bold">{dashboardStats.upcomingEvents}</span></p>
              <p className="flex justify-between items-center"><span className="text-orange-300">Ongoing:</span> <span className="font-bold">{dashboardStats.ongoingEvents}</span></p>
              <p className="flex justify-between items-center"><span className="text-red-300">Completed:</span> <span className="font-bold">{dashboardStats.completedEvents}</span></p>
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h3 className="text-xl font-bold text-yellow-400 mb-3 flex items-center">
              <FaUsers className="mr-2 text-yellow-500"/> Total Team Members
            </h3>
            <p className="text-5xl font-extrabold text-white">
              {loading ? <FaSpinner className="animate-spin" /> : dashboardStats.totalTeamMembers}
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 col-span-1 md:col-span-2">
            <h3 className="text-xl font-bold text-blue-400 mb-3 flex items-center">
              <FaRocket className="mr-2 text-blue-500"/> Recent Activity
            </h3>
            <ul className="text-gray-300 text-sm space-y-2 max-h-40 overflow-y-auto pr-2">
              {loading ? (
                <li className="text-center text-blue-400">
                  <FaSpinner className="animate-spin inline-block mr-2" /> Loading activity...
                </li>
              ) : recentActivity.length > 0 ? (
                recentActivity.map(item => (
                  <li key={item._id} className="truncate p-1 hover:bg-gray-700 rounded-md transition" title={`${item.name} (${item.type}) - ${item.displayTime}`}>
                    <span className={`inline-block mr-2 ${item.type === 'event' ? 'text-teal-300' : 'text-purple-300'}`}>
                      {item.type === 'event' ? <FaCalendarAlt /> : <FaUsers />}
                    </span>
                    <span className="font-semibold">{item.name}</span> ({item.type}) - {item.displayTime}
                    {isNewItem(item._updatedAt) && (
                      <span className="ml-2 bg-green-500 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                        NEW!
                      </span>
                    )}
                  </li>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent updates.</p>
              )}
            </ul>
          </div>
        </div>

        {/* Tabs for Navigation */}
        <div className="flex justify-center border-b border-gray-700 mt-6 mb-8 sticky top-16 bg-gray-900/80 backdrop-blur-sm z-10 rounded-b-lg">
          {["events", "team", "media"].map((tab) => (
            <button
              key={tab}
              className={`px-8 py-4 text-xl font-bold tracking-wide flex items-center gap-2 ${
                activeTab === tab
                  ? "border-b-4 border-blue-500 text-blue-400"
                  : "text-gray-400 hover:text-white"
              } transition duration-300 ease-in-out`}
              onClick={() => {
                setActiveTab(tab);
                setSearchTerm("");
                setSelectedSociety("");
                setSelectedYear("");
              }}
            >
              {tab === "events" && <FaCalendarAlt />}
              {tab === "team" && <FaUsers />}
              {tab === "media" && <FaImages />}
              {tab === "events" ? "Events" : tab === "team" ? "Team Members" : "Media Library"}
            </button>
          ))}
        </div>

        {/* Conditional Rendering based on activeTab */}
        {activeTab === "media" ? (
          <div className="w-full px-6 py-4 bg-gray-800 rounded-xl shadow-lg my-6 border border-gray-700 flex-grow">
            <MediaLibrary />
          </div>
        ) : (
          <>
            {/* Search, Filter & Actions Section */}
            <div className="w-full px-6 mt-6 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex-grow flex flex-wrap gap-4 items-center">
                <div className="relative flex-grow min-w-[200px]">
                  <input
                    type="text"
                    placeholder={`Search ${activeTab === "events" ? "events (name, mode, society)" : "team members (name, position, society)"}...`}
                    className="w-full p-3 pl-10 rounded-md bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      title="Clear search"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>

                <select
                  className="p-3 rounded-md bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 min-w-[150px]"
                  value={selectedSociety}
                  onChange={(e) => setSelectedSociety(e.target.value)}
                >
                  <option value="">All Societies</option>
                  {allSocieties.map((society) => (
                    <option key={society} value={society}>
                      {society}
                    </option>
                  ))}
                </select>

                <select
                  className="p-3 rounded-md bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 min-w-[120px]"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="">All Years</option>
                  {allYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>

                {(searchTerm || selectedSociety || selectedYear) && (
                  <button
                    onClick={handleClearFilters}
                    className="p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition duration-200 shadow-md flex items-center gap-2"
                  >
                    <FaTimes /> Clear Filters
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 mt-4 sm:mt-0">
                <button
                  onClick={handleWebhookRefetch}
                  className="p-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition duration-200 shadow-md flex items-center gap-2"
                  title="Manually refresh data from Sanity"
                >
                  <FaSpinner /> Refresh Data
                </button>
                <button
                  onClick={() => activeTab === "events" 
                    ? exportToCSV(filteredEvents, "events") 
                    : exportToCSV(filteredTeamMembers, "team_members")}
                  className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-md transition duration-200 shadow-md flex items-center gap-2"
                  title={`Export ${activeTab === "events" ? "Events" : "Team Members"} as CSV`}
                >
                  <FaFileCsv /> Export CSV
                </button>
                <button
                  onClick={() => activeTab === "events" 
                    ? exportToJSON(filteredEvents, "events") 
                    : exportToJSON(filteredTeamMembers, "team_members")}
                  className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition duration-200 shadow-md flex items-center gap-2"
                  title={`Export ${activeTab === "events" ? "Events" : "Team Members"} as JSON`}
                >
                  <FaDownload /> Export JSON
                </button>
              </div>
            </div>

            {/* Content Area for Events/Team */}
            <div className="flex-grow flex flex-col p-6 w-full">
              {loading ? (
                <div className="text-center text-blue-400 text-xl flex items-center justify-center p-8">
                  <FaSpinner className="animate-spin mr-2" />
                  Fetching cosmic data... Please wait.
                </div>
              ) : activeTab === "events" ? (
                <div className="bg-gray-800 p-6 rounded-xl shadow-2xl w-full flex-grow border border-gray-700">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-teal-400 flex items-center gap-2">
                      <FaCalendarAlt /> Events Overview ({filteredEvents.length})
                    </h2>
                    <button
                      onClick={() => navigate("/add-event")}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center gap-2"
                    >
                      <FaPlus /> Add New Event
                    </button>
                  </div>
                  <ul className="divide-y divide-gray-700 max-h-[60vh] overflow-y-auto pr-2">
                    {filteredEvents.length > 0 ? (
                      filteredEvents.map((event) => {
                        const status = getEventStatus(event.startDateTime, event.endDateTime);
                        const statusColor =
                          status === "Upcoming" ? "bg-blue-600" :
                          status === "Ongoing" ? "bg-green-600" :
                          "bg-red-600";
                        return (
                          <li
                            key={event._id}
                            className="py-4 px-3 rounded-lg flex items-center justify-between transition duration-200 ease-in-out hover:bg-gray-700"
                          >
                            <div onClick={() => openEditModal('event', event)} className="cursor-pointer flex-grow min-w-0">
                              <h3 className="text-xl font-semibold text-white flex items-center truncate">
                                {event.name}
                                <span className={`ml-3 text-xs font-bold px-2 py-1 rounded-full ${statusColor}`}>
                                  {status}
                                </span>
                                {isNewItem(event._updatedAt) && (
                                  <span className="ml-2 bg-green-500 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                    NEW!
                                  </span>
                                )}
                              </h3>
                              <p className="text-sm text-gray-400 mt-1 truncate">
                                🗓️{" "}
                                {event.startDateTime
                                  ? new Date(event.startDateTime).toLocaleString()
                                  : "No date available"}{" "}
                                | 💻 <span className="font-medium text-orange-300">{event.mode}</span> | 🏛️{" "}
                                <span className="text-blue-300">{event.society}</span>
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">Last Updated: {new Date(event._updatedAt).toLocaleString()}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModal('event', event); }}
                              className="ml-4 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition duration-200 shadow-md flex-shrink-0"
                              title="Edit Event"
                            >
                              <FaEdit />
                            </button>
                          </li>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No events found matching your criteria. Time to create some magic! ✨
                      </p>
                    )}
                  </ul>
                </div>
              ) : (
                <div className="bg-gray-800 p-6 rounded-xl shadow-2xl w-full flex-grow border border-gray-700">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
                      <FaUsers /> Team Members Directory ({filteredTeamMembers.length})
                    </h2>
                    <button
                      onClick={() => navigate("/add-team")}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center gap-2"
                    >
                      <FaPlus /> Add New Member
                    </button>
                  </div>
                  <ul className="divide-y divide-gray-700 max-h-[60vh] overflow-y-auto pr-2">
                    {filteredTeamMembers.length > 0 ? (
                      filteredTeamMembers.map((member) => (
                        <li
                          key={member._id}
                          className="py-4 px-3 rounded-lg flex items-center justify-between transition duration-200 ease-in-out hover:bg-gray-700"
                        >
                          <div onClick={() => openEditModal('team', member)} className="cursor-pointer flex-grow min-w-0">
                            <h3 className="text-xl font-semibold text-white flex items-center truncate">
                              {member.name}
                              {isNewItem(member._updatedAt) && (
                                <span className="ml-2 bg-green-500 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                  NEW!
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1 truncate">
                              💼 <span className="font-medium text-purple-300">{member.position}</span> | 🏛️{" "}
                              <span className="text-green-300">{member.society}</span> | 📅{" "}
                              <span className="text-yellow-300">{member.year || 'N/A'}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">Last Updated: {new Date(member._updatedAt).toLocaleString()}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal('team', member); }}
                            className="ml-4 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition duration-200 shadow-md flex-shrink-0"
                            title="Edit Team Member"
                          >
                            <FaEdit />
                          </button>
                        </li>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No team members found matching your criteria. Let's grow the team! 🚀
                      </p>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Single Item Edit Confirmation Modal */}
      <ConfirmationModal
        isOpen={isEditModalOpen}
        title={`Edit ${editItemType === 'event' ? 'Event' : 'Team Member'}`}
        message={`You are about to edit "${itemToEdit?.name || 'this item'}". Do you want to proceed?`}
        onConfirm={handleEditConfirm}
        onCancel={closeEditModal}
        confirmButtonText="Proceed to Edit"
        cancelButtonText="Cancel"
      />
    </div>
  );
};

export default Home;