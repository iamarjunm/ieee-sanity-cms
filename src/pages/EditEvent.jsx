import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { client } from "../sanityClient"; // Assuming sanityClient is correctly configured
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

  const [posterFile, setPosterFile] = useState(null); // Holds the new poster file chosen by user
  const [imageFiles, setImageFiles] = useState([]); // Holds new image files chosen by user
  const [resourceFiles, setResourceFiles] = useState([]); // Holds new resource files chosen by user
  const [loading, setLoading] = useState(true);

  // Helper function to convert ISO 8601 datetime to "YYYY-MM-DDTHH:MM" format
  const formatDateTimeForInput = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000; // Convert offset to milliseconds
    const localISOTime = new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 16);
    return localISOTime;
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
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
              asset->{_ref, url} // Fetch url for display and _ref for potential deletion
            },
            images[]{
              _key, // Crucial to fetch _key for existing array items
              asset->{_ref, url}
            },
            resources[]{
              _key, // Crucial to fetch _key for existing array items
              asset->{_ref, url}
            }
          }`,
          { id }
        );

        if (event) {
          setEventData({
            ...event,
            // Ensure all string fields have a fallback to "" to prevent React warnings
            name: event.name || "",
            startDateTime: formatDateTimeForInput(event.startDateTime),
            endDateTime: formatDateTimeForInput(event.endDateTime),
            mode: event.mode || "online", // Default if null
            eventOverview: event.eventOverview || "",
            formLink: event.formLink || "",
            description: event.description || "",
            prizePool: event.prizePool || "",
            teamSize: event.teamSize || 1, // Default if null
            entryFee: event.entryFee || "",
            society: event.society || "",
            category: event.category || "technical", // Default if null
            contactInfo: {
              contactPerson: event.contactInfo?.contactPerson || "",
              contactPhone: event.contactInfo?.contactPhone || "",
            },
            poster: event.poster || null,
            images: event.images || [],
            resources: event.resources || [],
          });
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        // Optionally set an error state to display to the user
      } finally {
        setLoading(false);
      }
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

  const handleFileChange = (e, setFileState) => {
    const file = e.target.files[0];
    setFileState(file);
    // For immediate preview, update eventData.poster if it's the poster file
    if (setFileState === setPosterFile) {
      setEventData((prev) => ({
        ...prev,
        poster: file ? { asset: { url: URL.createObjectURL(file) } } : null,
      }));
    }
  };

  const handleMultipleFilesChange = (e, setFilesState) => {
    const files = Array.from(e.target.files);
    setFilesState((prev) => [...prev, ...files]);

    // For immediate preview of new images (not existing ones)
    if (setFilesState === setImageFiles) {
      const newImagePreviews = files.map((file) => ({
        _key: uuidv4(), // Assign a temporary key for preview
        asset: { url: URL.createObjectURL(file) },
      }));
      setEventData((prev) => ({
        ...prev,
        images: [...prev.images, ...newImagePreviews],
      }));
    }
    // For immediate preview of new resources (not existing ones)
    if (setFilesState === setResourceFiles) {
      const newResourcePreviews = files.map((file) => ({
        _key: uuidv4(), // Assign a temporary key for preview
        asset: { url: URL.createObjectURL(file), _type: "file" }, // type file for resources
      }));
      setEventData((prev) => ({
        ...prev,
        resources: [...prev.resources, ...newResourcePreviews],
      }));
    }
  };

  // Function to delete an asset from Sanity (optional, but good for cleanup)
  const deleteSanityAsset = async (assetRef) => {
    if (assetRef) {
      try {
        await client.delete(assetRef);
        console.log("Deleted old asset:", assetRef);
      } catch (error) {
        console.error("Error deleting old asset:", assetRef, error);
      }
    }
  };

  const handleRemovePoster = async () => {
    // If there's an existing poster asset, delete it from Sanity
    if (eventData.poster?.asset?._ref) {
      await deleteSanityAsset(eventData.poster.asset._ref);
    }
    setEventData((prev) => ({ ...prev, poster: null }));
    setPosterFile(null); // Clear any newly selected file too
  };

  const handleRemoveImage = async (indexToRemove) => {
    const imageToRemove = eventData.images[indexToRemove];
    // If it's an existing asset, delete it from Sanity
    if (imageToRemove?.asset?._ref) {
      await deleteSanityAsset(imageToRemove.asset._ref);
    }
    setEventData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== indexToRemove),
    }));
    // Clear new files for simplicity. A more robust solution would track new files by _key.
    setImageFiles([]);
  };

  const handleRemoveResource = async (indexToRemove) => {
    const resourceToRemove = eventData.resources[indexToRemove];
    // If it's an existing asset, delete it from Sanity
    if (resourceToRemove?.asset?._ref) {
      await deleteSanityAsset(resourceToRemove.asset._ref);
    }
    setEventData((prev) => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== indexToRemove),
    }));
    // Clear new files for simplicity
    setResourceFiles([]);
  };

  const handleDeleteEvent = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this event? This action cannot be undone."
      )
    ) {
      setLoading(true);
      try {
        // Optional: Delete associated assets (poster, images, resources) as well
        if (eventData.poster?.asset?._ref) {
          await deleteSanityAsset(eventData.poster.asset._ref);
        }
        await Promise.all(
          eventData.images.map(
            (img) => img.asset?._ref && deleteSanityAsset(img.asset._ref)
          )
        );
        await Promise.all(
          eventData.resources.map(
            (res) => res.asset?._ref && deleteSanityAsset(res.asset._ref)
          )
        );

        await client.delete(id);
        navigate("/");
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Failed to delete event. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Start a transaction for atomic updates
      const transaction = client.transaction();

      // --- Handle Poster Upload/Removal ---
      if (posterFile) {
        // A new poster file is selected: upload it
        const posterAsset = await client.assets.upload("image", posterFile);
        // Add a patch operation to set the new poster
        transaction.patch(id, {
          set: {
            poster: {
              _type: "image",
              asset: {
                _type: "reference",
                _ref: posterAsset._id,
              },
            },
          },
        });
      } else if (eventData.poster === null) {
        // Poster was explicitly removed by setting eventData.poster to null
        // Add an unset operation to the transaction
        transaction.patch(id, {
          unset: ["poster"],
        });
      }
      // If posterFile is null and eventData.poster is not null, it means no change to existing poster.
      // In this scenario, we don't need to add any specific patch operation for 'poster' to the transaction.

      // --- Handle New Images Upload ---
      const newUploadedImageRefs = await Promise.all(
        imageFiles.map(async (file) => {
          const asset = await client.assets.upload("image", file);
          return {
            _key: uuidv4(),
            _type: "image",
            asset: {
              _type: "reference",
              _ref: asset._id,
            },
          };
        })
      );

      // --- Handle New Resources Upload ---
      const newUploadedResourceRefs = await Promise.all(
        resourceFiles.map(async (file) => {
          const asset = await client.assets.upload("file", file);
          return {
            _key: uuidv4(),
            _type: "file",
            asset: {
              _type: "reference",
              _ref: asset._id,
            },
          };
        })
      );

      // Combine existing images/resources (from Sanity) with newly uploaded ones.
      // Crucially: Filter and map only VALID existing Sanity references.
      // This prevents sending `_ref: null` or `_ref: undefined` to Sanity.
      const existingSanityImageRefs = (eventData.images || [])
        .filter((img) => img.asset && typeof img.asset._ref === "string")
        .map((img) => ({
          _key: img._key, // Keep existing _key
          _type: "image",
          asset: {
            _type: "reference",
            _ref: img.asset._ref,
          },
        }));

      const finalImageArray = [...existingSanityImageRefs, ...newUploadedImageRefs];

      const existingSanityResourceRefs = (eventData.resources || [])
        .filter((res) => res.asset && typeof res.asset._ref === "string")
        .map((res) => ({
          _key: res._key, // Keep existing _key
          _type: "file",
          asset: {
            _type: "reference",
            _ref: res.asset._ref,
          },
        }));

      const finalResourceArray = [...existingSanityResourceRefs, ...newUploadedResourceRefs];

      // Prepare the main update payload for other fields
      // NOTE: We DO NOT include 'poster' in this payload here if it was handled
      // by its own specific patch operation within the transaction.
      const otherFieldsPayload = {
        name: eventData.name,
        startDateTime: eventData.startDateTime,
        endDateTime: eventData.endDateTime,
        mode: eventData.mode,
        eventOverview: eventData.eventOverview,
        formLink: eventData.formLink,
        description: eventData.description,
        prizePool: eventData.prizePool,
        teamSize: eventData.teamSize,
        entryFee: eventData.entryFee,
        society: eventData.society,
        category: eventData.category,
        contactInfo: eventData.contactInfo,
        images: finalImageArray, // Set the combined array of images
        resources: finalResourceArray, // Set the combined array of resources
      };

      // Add the main payload update to the transaction.
      // This will set/overwrite all other fields on the document.
      transaction.patch(id, {
        set: otherFieldsPayload,
      });

      // Commit the entire transaction
      await transaction.commit();

      // Reset file states after successful submission to avoid re-uploading on subsequent submits
      setPosterFile(null);
      setImageFiles([]);
      setResourceFiles([]);

      navigate("/");
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to save changes. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center text-white min-h-screen items-center">
        Loading event data...
      </div>
    );

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
              required
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-1">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                name="startDateTime"
                value={eventData.startDateTime}
                onChange={handleChange}
                className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                name="endDateTime"
                value={eventData.endDateTime}
                onChange={handleChange}
                className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
                required
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
            <label className="block text-gray-300 mb-1">
              Event Overview (Before Event)
            </label>
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
            <label className="block text-gray-300 mb-1">
              Detailed Description (Post Event)
            </label>
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
            <label className="block text-gray-300 mb-1">
              Organizing Society
            </label>
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
            {(eventData.poster?.asset?.url || posterFile) && ( // Show preview if existing or new file
              <div className="mb-4 flex items-center gap-4">
                <img
                  src={
                    eventData.poster?.asset?.url ||
                    (posterFile ? URL.createObjectURL(posterFile) : "")
                  }
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
            {(eventData.images?.length > 0 || imageFiles.length > 0) && ( // Show if existing or new files
              <div className="flex flex-wrap gap-4 mb-4">
                {eventData.images.map((img, index) => (
                  (img?.asset?.url || img?.asset?._ref) && ( // Check for url or _ref for display
                    <div key={img._key || index} className="relative">
                      <img
                        src={img.asset?.url || urlFor(img).url()} // Prefer URL from fetch, fallback to urlFor
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
            {(eventData.resources?.length > 0 || resourceFiles.length > 0) && ( // Show if existing or new files
              <div className="mb-4">
                {eventData.resources.map((res, index) => (
                  (res?.asset?.url || res?.asset?._ref) && ( // Check for url or _ref for display
                    <div key={res._key || index} className="flex items-center gap-4 mb-2">
                      <a
                        href={res.asset?.url || urlFor(res).url()} // Prefer URL from fetch, fallback to urlFor
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