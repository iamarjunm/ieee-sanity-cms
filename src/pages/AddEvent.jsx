import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { client } from "../sanityClient";
import { v4 as uuidv4 } from "uuid";

const AddEvent = () => {
  const navigate = useNavigate();
  const [eventData, setEventData] = useState({
    name: "",
    startDateTime: "",
    endDateTime: "",
    mode: "online",
    eventOverview: "",
    formLink: "",
    description: "",
    prizePool: "",
    teamSize: 1,
    entryFee: "",
    society: "ieee-sb",
    category: "technical",
    contactInfo: { contactPerson: "", contactPhone: "" },
  });

  const [poster, setPoster] = useState(null);
  const [images, setImages] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "teamSize") {
      setEventData((prev) => ({ ...prev, [name]: Number(value) }));
    } else if (name === "contactPerson" || name === "contactPhone") {
      setEventData((prev) => ({
        ...prev,
        contactInfo: { ...prev.contactInfo, [name]: value },
      }));
    } else {
      setEventData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e, setFile) => {
    const file = e.target.files[0];
    setFile(file);
  };

  const handleMultipleFilesChange = (e, setFiles) => {
    const files = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...files]);
  };

  const handleRemovePoster = () => {
    setPoster(null);
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveResource = (index) => {
    setResources((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file) => {
    const asset = await client.assets.upload("file", file);
    return asset._id;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      // Upload poster if a new file is selected
      let posterRef = null;
      if (poster) {
        const posterAsset = await client.assets.upload("image", poster);
        posterRef = posterAsset._id; // Use the _id of the uploaded asset
      }
  
      // Upload images if new files are selected
      const uploadedImages = await Promise.all(
        images.map((file) => client.assets.upload("image", file))
      );
      const imageRefs = uploadedImages.map((asset) => ({
        _key: uuidv4(), // Add a unique _key
        _type: "image",
        asset: {
          _type: "reference",
          _ref: asset._id, // Use the _id of the uploaded asset
        },
      }));
  
      // Upload resources if new files are selected
      const uploadedResources = await Promise.all(
        resources.map((file) => client.assets.upload("file", file))
      );
      const resourceRefs = uploadedResources.map((asset) => ({
        _key: uuidv4(), // Add a unique _key
        _type: "file",
        asset: {
          _type: "reference",
          _ref: asset._id, // Use the _id of the uploaded asset
        },
      }));
  
      // Create new event object
      const newEvent = {
        _type: "event",
        _id: uuidv4(),
        ...eventData,
        images: imageRefs,
        resources: resourceRefs,
      };
  
      // Add poster only if it exists
      if (posterRef) {
        newEvent.poster = {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: posterRef, // Use the _id of the uploaded poster
          },
        };
      }
  
      // Save the new event to Sanity
      await client.create(newEvent);
      navigate("/");
    } catch (error) {
      console.error("Error adding event:", error);
      alert("Failed to create event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-3xl">
        <h1 className="text-3xl font-semibold text-center mb-6">Add New Event</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Name */}
          <div>
            <label className="block text-gray-300 mb-1">Event Name</label>
            <input
              type="text"
              name="name"
              value={eventData.name}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-1">Start Date & Time</label>
              <input
                type="datetime-local"
                name="startDateTime"
                value={eventData.startDateTime}
                onChange={handleChange}
                className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1">End Date & Time</label>
              <input
                type="datetime-local"
                name="endDateTime"
                value={eventData.endDateTime}
                onChange={handleChange}
                className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-gray-300 mb-1">Event Mode</label>
            <select
              name="mode"
              value={eventData.mode}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          {/* Event Overview */}
          <div>
            <label className="block text-gray-300 mb-1">Event Overview</label>
            <textarea
              name="eventOverview"
              value={eventData.eventOverview}
              onChange={handleChange}
              className="w-full p-3 h-28 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Form Link */}
          <div>
            <label className="block text-gray-300 mb-1">Form Link</label>
            <input
              type="url"
              name="formLink"
              value={eventData.formLink}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block text-gray-300 mb-1">Detailed Description</label>
            <textarea
              name="description"
              value={eventData.description}
              onChange={handleChange}
              className="w-full p-3 h-28 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Team Size & Prize Pool */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-1">Team Size</label>
              <input
                type="number"
                name="teamSize"
                value={eventData.teamSize}
                onChange={handleChange}
                min="1"
                className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1">Prize Pool</label>
              <input
                type="text"
                name="prizePool"
                value={eventData.prizePool}
                onChange={handleChange}
                className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          {/* Entry Fee */}
          <div>
            <label className="block text-gray-300 mb-1">Entry Fee</label>
            <input
              type="text"
              name="entryFee"
              value={eventData.entryFee}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Organizing Society */}
          <div>
            <label className="block text-gray-300 mb-1">Organizing Society</label>
            <select
              name="society"
              value={eventData.society}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="ieee-sb">IEEE SB</option>
              <option value="ieee-cs">IEEE CS</option>
              <option value="ieee-wie">IEEE WIE</option>
              <option value="ieee-cis">IEEE CIS</option>
              <option value="genesis">Genesis</option>
            </select>
          </div>

          {/* Event Category */}
          <div>
            <label className="block text-gray-300 mb-1">Event Category</label>
            <select
              name="category"
              value={eventData.category}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="technical">Technical</option>
              <option value="cultural">Cultural</option>
            </select>
          </div>

          {/* Upload Poster */}
          <div>
            <label className="block text-gray-300 mb-1">Event Poster</label>
            {poster && (
              <div className="mb-4 flex items-center gap-4">
                <img
                  src={URL.createObjectURL(poster)}
                  alt="Event Poster"
                  className="w-32 h-32 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={handleRemovePoster}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-white"
                >
                  Remove Poster
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, setPoster)}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 cursor-pointer"
            />
          </div>

          {/* Upload Images */}
          <div>
            <label className="block text-gray-300 mb-1">Event Images</label>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-4">
                {images.map((img, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(img)}
                      alt={`Event Image ${index + 1}`}
                      className="w-32 h-32 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 px-2 py-1 rounded-full text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleMultipleFilesChange(e, setImages)}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 cursor-pointer"
            />
          </div>

          {/* Upload Resources */}
          <div>
            <label className="block text-gray-300 mb-1">Resources</label>
            {resources.length > 0 && (
              <div className="mb-4">
                {resources.map((res, index) => (
                  <div key={index} className="flex items-center gap-4 mb-2">
                    <span className="text-blue-400">Resource {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveResource(index)}
                      className="bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              multiple
              onChange={(e) => handleMultipleFilesChange(e, setResources)}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 cursor-pointer"
            />
          </div>

          {/* Contact Person */}
          <div>
            <label className="block text-gray-300 mb-1">Contact Person</label>
            <input
              type="text"
              name="contactPerson"
              value={eventData.contactInfo.contactPerson}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-gray-300 mb-1">Contact Phone</label>
            <input
              type="text"
              name="contactPhone"
              value={eventData.contactInfo.contactPhone}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-semibold text-white transition"
            >
              {loading ? "Saving..." : "Add Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEvent;