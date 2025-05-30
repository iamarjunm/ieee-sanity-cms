import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { client } from "../sanityClient"; // Assuming sanityClient is correctly configured
import { v4 as uuidv4 } from "uuid";
import imageUrlBuilder from "@sanity/image-url";
import toast from "react-hot-toast";

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
    speakers: [], // Added speakers array
    winners: { firstPlace: "", secondPlace: "", thirdPlace: "" }, // Added winners object
    poster: null,
    images: [],
    resources: [],
  });

  const [posterFile, setPosterFile] = useState(null); // Holds the new poster file chosen by user
  const [imageFiles, setImageFiles] = useState([]); // Holds new image files chosen by user
  const [resourceFiles, setResourceFiles] = useState([]); // Holds new resource files chosen by user
  const [speakerForm, setSpeakerForm] = useState({ name: "", profession: "", photoFile: null }); // For adding new speakers
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
            speakers[]{
              _key,
              name,
              profession,
              photo{
                asset->{_ref, url}
              }
            },
            winners,
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
          // Map speakers to include a temporary photoPreviewUrl for immediate display
          const speakersWithPreview = (event.speakers || []).map(speaker => ({
            ...speaker,
            photoPreviewUrl: speaker.photo?.asset?.url || (speaker.photo ? urlFor(speaker.photo).url() : null)
          }));

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
            society: event.society || "ieee-sb", // Default added
            category: event.category || "technical", // Default if null
            contactInfo: {
              contactPerson: event.contactInfo?.contactPerson || "",
              contactPhone: event.contactInfo?.contactPhone || "",
            },
            speakers: speakersWithPreview, // Use speakers with preview URLs
            winners: event.winners || { firstPlace: "", secondPlace: "", thirdPlace: "" }, // Ensure winners object exists
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
    if (name === "teamSize") {
      setEventData((prev) => ({ ...prev, [name]: Number(value) }));
    } else if (name.startsWith("contactInfo.")) {
      const contactFieldName = name.split(".")[1];
      setEventData((prev) => ({
        ...prev,
        contactInfo: { ...prev.contactInfo, [contactFieldName]: value },
      }));
    } else if (name.startsWith("winners.")) {
      const winnerFieldName = name.split(".")[1];
      setEventData((prev) => ({
        ...prev,
        winners: { ...prev.winners, [winnerFieldName]: value },
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
    // Revoke object URL if it was a new file being previewed
    if (imageToRemove.asset?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(imageToRemove.asset.url);
    }
    setEventData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== indexToRemove),
    }));
    // Clear new files. A more robust solution would track new files by _key.
    setImageFiles([]); // This might be too aggressive if multiple new files were added
  };

  const handleRemoveResource = async (indexToRemove) => {
    const resourceToRemove = eventData.resources[indexToRemove];
    // If it's an existing asset, delete it from Sanity
    if (resourceToRemove?.asset?._ref) {
      await deleteSanityAsset(resourceToRemove.asset._ref);
    }
    // Revoke object URL if it was a new file being previewed
    if (resourceToRemove.asset?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(resourceToRemove.asset.url);
    }
    setEventData((prev) => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== indexToRemove),
    }));
    // Clear new files
    setResourceFiles([]); // This might be too aggressive if multiple new files were added
  };

  // --- Speaker Handlers ---
  const handleAddSpeaker = async () => {
    if (!speakerForm.name || !speakerForm.profession) {
      toast.error("Please fill in speaker's name and profession.");
      return;
    }

    let photoRef = null;
    let photoPreviewUrl = null;

    if (speakerForm.photoFile) { // Use photoFile
      try {
        const uploadPromise = client.assets.upload("image", speakerForm.photoFile);
        toast.promise(
          uploadPromise,
          {
            loading: `Uploading ${speakerForm.name}'s photo...`,
            success: `${speakerForm.name}'s photo uploaded!`,
            error: `Failed to upload ${speakerForm.name}'s photo.`,
          }
        );
        const asset = await uploadPromise;
        photoRef = {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: asset._id,
          },
        };
      } catch (error) {
        console.error("Error uploading speaker photo:", error);
        // Alert is replaced by toast.error
        return;
      }
    }

    setEventData((prev) => ({
      ...prev,
      speakers: [
        ...prev.speakers,
        {
          _key: uuidv4(),
          name: speakerForm.name,
          profession: speakerForm.profession,
          photo: photoRef, // Sanity reference
          photoPreviewUrl: photoPreviewUrl, // Local preview URL
        },
      ],
    }));
    setSpeakerForm({ name: "", profession: "", photoFile: null }); // Reset speaker form
  };

  const handleRemoveSpeaker = async (indexToRemove) => {
    const speakerToRemove = eventData.speakers[indexToRemove];
    // If it's an existing Sanity asset, delete it
    if (speakerToRemove.photo?.asset?._ref) {
      await deleteSanityAsset(speakerToRemove.photo.asset._ref);
    }
    // Revoke the object URL if it was created for local preview
    if (speakerToRemove.photoPreviewUrl && speakerToRemove.photoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(speakerToRemove.photoPreviewUrl);
    }
    setEventData((prev) => ({
      ...prev,
      speakers: prev.speakers.filter((_, i) => i !== indexToRemove),
    }));
  };

  const handleDeleteEvent = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this event? This action cannot be undone."
      )
    ) {
      setLoading(true);
      try {
        // Optional: Delete associated assets (poster, images, resources, speaker photos) as well
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
        await Promise.all(
          eventData.speakers.map(
            (speaker) => speaker.photo?.asset?._ref && deleteSanityAsset(speaker.photo.asset._ref)
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

    // Revoke all temporary object URLs created for previews before submission
    if (posterFile) {
        URL.revokeObjectURL(URL.createObjectURL(posterFile));
    }
    imageFiles.forEach(file => URL.revokeObjectURL(URL.createObjectURL(file)));
    resourceFiles.forEach(file => URL.revokeObjectURL(URL.createObjectURL(file)));
    eventData.speakers.forEach(speaker => {
      if (speaker.photoPreviewUrl && speaker.photoPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(speaker.photoPreviewUrl);
      }
    });


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

      // --- Handle Speaker Photos Upload (if any new ones were added) ---
      const speakersForSanity = await Promise.all(
        eventData.speakers.map(async (speaker) => {
          if (speaker.photoFile && !speaker.photo?.asset?._ref) { // If it's a new file and not already uploaded
            const asset = await client.assets.upload("image", speaker.photoFile);
            return {
              _key: speaker._key,
              name: speaker.name,
              profession: speaker.profession,
              photo: {
                _type: "image",
                asset: {
                  _type: "reference",
                  _ref: asset._id,
                },
              },
            };
          } else {
            // Existing speaker or no new photo
            return {
              _key: speaker._key,
              name: speaker.name,
              profession: speaker.profession,
              ...(speaker.photo && { photo: speaker.photo }) // Keep existing Sanity photo reference
            };
          }
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
        winners: eventData.winners, // Include winners data
        speakers: speakersForSanity, // Include speakers data
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
      setSpeakerForm({ name: "", profession: "", photoFile: null }); // Reset speaker form


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
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-4xl"> {/* Increased max-w */}
        <h1 className="text-4xl font-extrabold text-center mb-8 text-green-400"> {/* Larger heading */}
          Edit Event
        </h1>
        <form onSubmit={handleSubmit} className="space-y-8"> {/* Increased space-y */}
          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Event Name</label>
              <input
                type="text"
                name="name"
                value={eventData.name}
                onChange={handleChange}
                placeholder="e.g., Tech Innovate Hackathon"
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200 ease-in-out"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Form Link</label>
              <input
                type="url"
                name="formLink"
                value={eventData.formLink}
                onChange={handleChange}
                placeholder="https://forms.gle/your-event-form"
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200 ease-in-out"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Start Date & Time</label>
              <input
                type="datetime-local"
                name="startDateTime"
                value={eventData.startDateTime}
                onChange={handleChange}
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200 ease-in-out"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">End Date & Time</label>
              <input
                type="datetime-local"
                name="endDateTime"
                value={eventData.endDateTime}
                onChange={handleChange}
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200 ease-in-out"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Event Mode</label>
              <div className="flex gap-4 p-3 rounded-md bg-gray-700 border border-gray-600">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="mode"
                    value="online"
                    checked={eventData.mode === "online"}
                    onChange={handleChange}
                    className="form-radio text-green-500"
                  />
                  <span className="ml-2 text-gray-300">Online</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="mode"
                    value="offline"
                    checked={eventData.mode === "offline"}
                    onChange={handleChange}
                    className="form-radio text-green-500"
                  />
                  <span className="ml-2 text-gray-300">Offline</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Organizing Society</label>
              <select
                name="society"
                value={eventData.society}
                onChange={handleChange}
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200 ease-in-out"
              >
                <option value="ieee-sb">IEEE SB</option>
                <option value="ieee-cs">IEEE CS</option>
                <option value="ieee-wie">IEEE WIE</option>
                <option value="ieee-cis">IEEE CIS</option>
                <option value="genesis">Genesis</option>
                <option value="ieeexacm">IEEE X ACM</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Event Category</label>
              <div className="flex gap-4 p-3 rounded-md bg-gray-700 border border-gray-600">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="category"
                    value="technical"
                    checked={eventData.category === "technical"}
                    onChange={handleChange}
                    className="form-radio text-green-500"
                  />
                  <span className="ml-2 text-gray-300">Technical</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="category"
                    value="cultural"
                    checked={eventData.category === "cultural"}
                    onChange={handleChange}
                    className="form-radio text-green-500"
                  />
                  <span className="ml-2 text-gray-300">Cultural</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Team Size</label>
              <input
                type="number"
                name="teamSize"
                value={eventData.teamSize}
                onChange={handleChange}
                min="1"
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200 ease-in-out"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Prize Pool</label>
              <input
                type="text"
                name="prizePool"
                value={eventData.prizePool}
                onChange={handleChange}
                placeholder="e.g., ₹10,000"
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200 ease-in-out"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Entry Fee</label>
              <input
                type="text"
                name="entryFee"
                value={eventData.entryFee}
                onChange={handleChange}
                placeholder="e.g., Free or ₹100 per team"
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200 ease-in-out"
              />
            </div>
          </div>

          <hr className="border-gray-700 my-8" />

          {/* Descriptions */}
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">Event Overview (Write before event has happened)</label>
            <textarea
              name="eventOverview"
              value={eventData.eventOverview}
              onChange={handleChange}
              placeholder="A brief summary of the event..."
              className="w-full p-3 h-32 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200 ease-in-out resize-y"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">Detailed Description (Write After Event has happened)</label>
            <textarea
              name="description"
              value={eventData.description}
              onChange={handleChange}
              placeholder="Provide a comprehensive description of the event, including rules, schedule, etc."
              className="w-full p-3 h-48 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200 ease-in-out resize-y"
            />
          </div>

          <hr className="border-gray-700 my-8" />

          {/* Contact Information */}
          <h2 className="text-2xl font-semibold text-green-400 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Contact Person</label>
              <input
                type="text"
                name="contactInfo.contactPerson"
                value={eventData.contactInfo.contactPerson}
                onChange={handleChange}
                placeholder="Name of contact person"
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200 ease-in-out"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Contact Phone</label>
              <input
                type="text"
                name="contactInfo.contactPhone"
                value={eventData.contactInfo.contactPhone}
                onChange={handleChange}
                placeholder="Phone number"
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200 ease-in-out"
              />
            </div>
          </div>

          <hr className="border-gray-700 my-8" />

          {/* File Uploads */}
          <h2 className="text-2xl font-semibold text-green-400 mb-4">Media & Resources</h2>

          {/* Upload Poster */}
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">Event Poster</label>
            {(eventData.poster?.asset?.url || posterFile) && (
              <div className="mb-4 flex items-center gap-4 p-3 bg-gray-700 rounded-md">
                <img
                  src={
                    eventData.poster?.asset?.url ||
                    (posterFile ? URL.createObjectURL(posterFile) : "")
                  }
                  alt="Event Poster Preview"
                  className="w-24 h-24 object-cover rounded-md border border-gray-600"
                />
                <button
                  type="button"
                  onClick={handleRemovePoster}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md text-white font-semibold transition duration-200 ease-in-out"
                >
                  Remove
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, setPosterFile)}
              className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-white hover:file:bg-green-600 transition duration-200 ease-in-out"
            />
            {!eventData.poster && !posterFile && (
                <p className="text-gray-400 text-sm mt-2">Upload a captivating poster for your event.</p>
            )}
          </div>

          {/* Upload Images */}
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">Event Images</label>
            {(eventData.images?.length > 0 || imageFiles.length > 0) && (
              <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-700 rounded-md">
                {eventData.images.map((img, index) => (
                  (img?.asset?.url || img?.asset?._ref) && (
                    <div key={img._key || index} className="relative group">
                      <img
                        src={img.asset?.url || urlFor(img).url()}
                        alt={`Event Image ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-md border border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        title="Remove image"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
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
              className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-white hover:file:bg-green-600 transition duration-200 ease-in-out"
            />
            {(eventData.images?.length === 0 && imageFiles.length === 0) && (
                <p className="text-gray-400 text-sm mt-2">Add more images to showcase your event.</p>
            )}
          </div>

          {/* Upload Resources */}
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">Resources (PDFs, Docs, etc.)</label>
            {(eventData.resources?.length > 0 || resourceFiles.length > 0) && (
              <div className="mb-4 p-3 bg-gray-700 rounded-md">
                {eventData.resources.map((res, index) => (
                  (res?.asset?.url || res?.asset?._ref) && (
                    <div key={res._key || index} className="flex items-center justify-between gap-4 mb-2 bg-gray-600 p-2 rounded-md">
                      <span className="text-blue-400 truncate pr-2">
                        {res.asset?.url ? res.asset.url.split('/').pop().split('?')[0] : `Resource ${index + 1}`}
                      </span> {/* Display file name from URL */}
                      <button
                        type="button"
                        onClick={() => handleRemoveResource(index)}
                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md text-white text-sm font-semibold transition duration-200 ease-in-out"
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
              className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-white hover:file:bg-green-600 transition duration-200 ease-in-out"
            />
            {(eventData.resources?.length === 0 && resourceFiles.length === 0) && (
                <p className="text-gray-400 text-sm mt-2">Upload supporting documents for your event.</p>
            )}
          </div>

          <hr className="border-gray-700 my-8" />

          {/* Speakers Section */}
          <h2 className="text-2xl font-semibold text-green-400 mb-4">Speakers</h2>
          <div className="space-y-4">
            {eventData.speakers.map((speaker, index) => (
              <div key={speaker._key} className="flex items-center gap-4 bg-gray-700 p-4 rounded-md shadow-sm">
                {speaker.photoPreviewUrl && ( // Use photoPreviewUrl for display (could be blob: or sanity URL)
                  <img
                    src={speaker.photoPreviewUrl}
                    alt={speaker.name}
                    className="w-16 h-16 object-cover rounded-full border-2 border-green-500"
                  />
                )}
                <div>
                  <p className="font-semibold text-lg">{speaker.name}</p>
                  <p className="text-gray-400 text-sm">{speaker.profession}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSpeaker(index)}
                  className="ml-auto bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md text-white font-semibold transition duration-200 ease-in-out"
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-700 p-4 rounded-md">
              <input
                type="text"
                placeholder="Speaker Name"
                value={speakerForm.name}
                onChange={(e) => setSpeakerForm((prev) => ({ ...prev, name: e.target.value }))}
                className="p-3 rounded-md bg-gray-600 border border-gray-500 focus:ring-2 focus:ring-green-500 outline-none"
              />
              <input
                type="text"
                placeholder="Profession"
                value={speakerForm.profession}
                onChange={(e) => setSpeakerForm((prev) => ({ ...prev, profession: e.target.value }))}
                className="p-3 rounded-md bg-gray-600 border border-gray-500 focus:ring-2 focus:ring-green-500 outline-none"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSpeakerForm((prev) => ({ ...prev, photoFile: e.target.files[0] }))}
                className="p-3 rounded-md bg-gray-600 border border-gray-500 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-800 file:text-white hover:file:bg-gray-900"
              />
              <div className="md:col-span-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddSpeaker}
                  className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-md text-white font-semibold transition duration-200 ease-in-out"
                >
                  Add Speaker
                </button>
              </div>
            </div>
          </div>

          <hr className="border-gray-700 my-8" />

          {/* Winners Section */}
          <h2 className="text-2xl font-semibold text-green-400 mb-4">Winners</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">1st Place Winner</label>
              <input
                type="text"
                name="winners.firstPlace"
                value={eventData.winners.firstPlace}
                onChange={handleChange}
                placeholder="e.g., Team Alpha"
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200 ease-in-out"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">2nd Place Winner</label>
              <input
                type="text"
                name="winners.secondPlace"
                value={eventData.winners.secondPlace}
                onChange={handleChange}
                placeholder="e.g., Team Beta"
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200 ease-in-out"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">3rd Place Winner</label>
              <input
                type="text"
                name="winners.thirdPlace"
                value={eventData.winners.thirdPlace}
                onChange={handleChange}
                placeholder="e.g., Team Gamma"
                className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200 ease-in-out"
              />
            </div>
          </div>

          <hr className="border-gray-700 my-8" />

          {/* Submit and Delete Buttons */}
          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={handleDeleteEvent}
              className="bg-red-600 hover:bg-red-700 px-8 py-3 rounded-lg font-bold text-white text-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Event
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-bold text-white text-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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