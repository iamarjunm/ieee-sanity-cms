import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { client } from "../sanityClient";
import { v4 as uuidv4 } from "uuid";
import imageUrlBuilder from "@sanity/image-url";

// Configure urlFor
const builder = imageUrlBuilder(client);
function urlFor(source) {
  return builder.image(source);
}

const EditEvent = () => {
  const { id } = useParams();
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
    society: "",
    category: "technical",
    contactInfo: {
      contactPerson: "",
      contactPhone: "",
    },
    poster: null,
    images: [],
    resources: [],
  });
  const [posterFile, setPosterFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [resourceFiles, setResourceFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper function to convert ISO 8601 datetime to "YYYY-MM-DDTHH:MM" format
  const formatDateTimeForInput = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000; // Convert offset to milliseconds
    const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
  };

  useEffect(() => {
    const fetchEvent = async () => {
      const event = await client.fetch(
        `*[_type == "event" && _id == $id][0]{
          name,
          startDateTime,
          endDateTime,
          mode,
          eventOverview,
          formLink,
          description,
          prizePool,
          teamSize,
          entryFee,
          society,
          category,
          contactInfo,
          poster{
            asset->{_ref}
          },
          images[]{
            asset->{_ref}
          },
          resources[]{
            asset->{_ref}
          }
        }`,
        { id }
      );

      if (event) {
        setEventData({
          ...event,
          startDateTime: formatDateTimeForInput(event.startDateTime),
          endDateTime: formatDateTimeForInput(event.endDateTime),
          contactInfo: event.contactInfo || { contactPerson: "", contactPhone: "" },
          poster: event.poster || null,
          images: event.images || [],
          resources: event.resources || [],
          eventOverview: event.eventOverview || "", // Ensure eventOverview is a string
          description: event.description || "", // Ensure description is a string
        });
      }
      setLoading(false);
    };
    fetchEvent();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setEventData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
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
    setEventData((prev) => ({ ...prev, poster: null }));
    setPosterFile(null);
  };

  const handleRemoveImage = (index) => {
    setEventData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleRemoveResource = (index) => {
    setEventData((prev) => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index),
    }));
  };

  const handleDeleteEvent = async () => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      setLoading(true);
      try {
        await client.delete(id);
        navigate("/");
      } catch (error) {
        console.error("Error deleting event:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload poster if a new file is selected
      let posterRef = eventData.poster?.asset?._ref; // Use existing _ref if available
      if (posterFile) {
        const posterAsset = await client.assets.upload("image", posterFile);
        posterRef = posterAsset._id; // Use the _id of the uploaded asset
      }

      // Upload new images if files are selected
      const uploadedImages = await Promise.all(
        imageFiles.map((file) => client.assets.upload("image", file))
      );
      const newImageRefs = uploadedImages.map((asset) => ({
        _key: uuidv4(), // Add a unique _key
        _type: "image",
        asset: {
          _type: "reference",
          _ref: asset._id, // Use the _id of the uploaded asset
        },
      }));

      // Combine existing images with new images
      const allImageRefs = [
        ...eventData.images
          .filter((img) => img?.asset?._ref) // Filter out invalid images
          .map((img) => ({
            _key: uuidv4(), // Add a unique _key
            _type: "image",
            asset: {
              _type: "reference",
              _ref: img.asset._ref, // Use the existing _ref
            },
          })),
        ...newImageRefs,
      ];

      // Upload new resources if files are selected
      const uploadedResources = await Promise.all(
        resourceFiles.map((file) => client.assets.upload("file", file))
      );
      const newResourceRefs = uploadedResources.map((asset) => ({
        _key: uuidv4(), // Add a unique _key
        _type: "file",
        asset: {
          _type: "reference",
          _ref: asset._id, // Use the _id of the uploaded asset
        },
      }));

      // Combine existing resources with new resources
      const allResourceRefs = [
        ...eventData.resources
          .filter((res) => res?.asset?._ref) // Filter out invalid resources
          .map((res) => ({
            _key: uuidv4(), // Add a unique _key
            _type: "file",
            asset: {
              _type: "reference",
              _ref: res.asset._ref, // Use the existing _ref
            },
          })),
        ...newResourceRefs,
      ];

      // Prepare the update payload
      const updatePayload = {
        ...eventData,
        images: allImageRefs,
        resources: allResourceRefs,
      };

      // Add poster only if it exists
      if (posterRef) {
        updatePayload.poster = {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: posterRef, // Use the _id of the uploaded poster
          },
        };
      } else {
        // If poster is removed, unset the poster field
        await client.patch(id).unset(["poster"]).commit();
      }

      // Update event data in Sanity
      await client
        .patch(id)
        .set(updatePayload)
        .commit();

      navigate("/");
    } catch (error) {
      console.error("Error updating event:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-3xl">
        <h1 className="text-3xl font-semibold text-center mb-6">Edit Event</h1>
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
            <label className="block text-gray-300 mb-1">Event Overview (Before Event)</label>
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
            <label className="block text-gray-300 mb-1">Detailed Description (Post Event)</label>
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
            {eventData.poster?.asset?._ref && (
              <div className="mb-4 flex items-center gap-4">
                <img
                  src={urlFor(eventData.poster).url()}
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
              onChange={(e) => handleFileChange(e, setPosterFile)}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 cursor-pointer"
            />
          </div>

          {/* Upload Images */}
          <div>
            <label className="block text-gray-300 mb-1">Event Images</label>
            {eventData.images?.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-4">
                {eventData.images.map((img, index) => (
                  img?.asset?._ref && (
                    <div key={index} className="relative">
                      <img
                        src={urlFor(img).url()}
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
                  )
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleMultipleFilesChange(e, setImageFiles)}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 cursor-pointer"
            />
          </div>

          {/* Upload Resources */}
          <div>
            <label className="block text-gray-300 mb-1">Resources</label>
            {eventData.resources?.length > 0 && (
              <div className="mb-4">
                {eventData.resources.map((res, index) => (
                  res?.asset?._ref && (
                    <div key={index} className="flex items-center gap-4 mb-2">
                      <a
                        href={urlFor(res).url()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        Resource {index + 1}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveResource(index)}
                        className="bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg text-white"
                      >
                        Remove
                      </button>
                    </div>
                  )
                ))}
              </div>
            )}
            <input
              type="file"
              multiple
              onChange={(e) => handleMultipleFilesChange(e, setResourceFiles)}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 cursor-pointer"
            />
          </div>

          {/* Contact Person */}
          <div>
            <label className="block text-gray-300 mb-1">Contact Person</label>
            <input
              type="text"
              name="contactInfo.contactPerson"
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
              name="contactInfo.contactPhone"
              value={eventData.contactInfo.contactPhone}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Submit and Delete Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleDeleteEvent}
              className="bg-red-500 hover:bg-red-600 px-6 py-3 rounded-lg font-semibold text-white transition"
            >
              Delete Event
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-semibold text-white transition"
            >
              {loading ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEvent;