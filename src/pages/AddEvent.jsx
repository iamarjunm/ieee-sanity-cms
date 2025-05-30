import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { client } from "../sanityClient";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast"; // Import toast and Toaster

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
    speakers: [],
    winners: { firstPlace: "", secondPlace: "", thirdPlace: "" },
  });

  const [poster, setPoster] = useState(null);
  const [images, setImages] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [speakerForm, setSpeakerForm] = useState({ name: "", profession: "", photoFile: null }); // Changed to photoFile

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

  const handleFileChange = (e, setFile) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
    }
  };

  const handleMultipleFilesChange = (e, setFiles) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setFiles((prev) => [...prev, ...files]);
    }
  };

  const handleRemoveFile = (setter, indexToRemove) => {
    setter((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // --- MODIFIED handleAddSpeaker ---
  const handleAddSpeaker = async () => {
    if (!speakerForm.name || !speakerForm.profession) {
      toast.error("Please fill in speaker's name and profession."); // Toast notification
      return;
    }

    let photoRef = null;
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
          photo: photoRef, // This is the Sanity reference
          photoPreviewUrl: speakerForm.photoFile ? URL.createObjectURL(speakerForm.photoFile) : null // Store URL for local preview
        },
      ],
    }));
    toast.success(`${speakerForm.name} added as speaker!`); // Toast notification
    setSpeakerForm({ name: "", profession: "", photoFile: null }); // Reset speaker form
  };

  const handleRemoveSpeaker = (indexToRemove) => {
    const speakerToRemove = eventData.speakers[indexToRemove];
    if (speakerToRemove.photoPreviewUrl) {
      URL.revokeObjectURL(speakerToRemove.photoPreviewUrl);
    }
    setEventData((prev) => ({
      ...prev,
      speakers: prev.speakers.filter((_, i) => i !== indexToRemove),
    }));
    toast.success(`${speakerToRemove.name} removed from speakers.`); // Toast notification
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (poster) {
      URL.revokeObjectURL(URL.createObjectURL(poster));
    }
    images.forEach(img => URL.revokeObjectURL(URL.createObjectURL(img)));
    eventData.speakers.forEach(speaker => {
      if (speaker.photoPreviewUrl) {
        URL.revokeObjectURL(speaker.photoPreviewUrl);
      }
    });

    try {
      let posterRef = null;
      if (poster) {
        const posterUploadPromise = client.assets.upload("image", poster);
        toast.promise(
          posterUploadPromise,
          {
            loading: "Uploading event poster...",
            success: "Event poster uploaded!",
            error: "Failed to upload event poster.",
          }
        );
        const posterAsset = await posterUploadPromise;
        posterRef = posterAsset._id;
      }

      const uploadedImagesPromise = Promise.all(
        images.map((file) => client.assets.upload("image", file))
      );
      toast.promise(
        uploadedImagesPromise,
        {
          loading: "Uploading event images...",
          success: "Event images uploaded!",
          error: "Failed to upload event images.",
        }
      );
      const uploadedImages = await uploadedImagesPromise;
      const imageRefs = uploadedImages.map((asset) => ({
        _key: uuidv4(),
        _type: "image",
        asset: {
          _type: "reference",
          _ref: asset._id,
        },
      }));

      const uploadedResourcesPromise = Promise.all(
        resources.map((file) => client.assets.upload("file", file))
      );
      toast.promise(
        uploadedResourcesPromise,
        {
          loading: "Uploading event resources...",
          success: "Event resources uploaded!",
          error: "Failed to upload event resources.",
        }
      );
      const uploadedResources = await uploadedResourcesPromise;
      const resourceRefs = uploadedResources.map((asset) => ({
        _key: uuidv4(),
        _type: "file",
        asset: {
          _type: "reference",
          _ref: asset._id,
        },
      }));

      const speakersForSanity = eventData.speakers.map(speaker => ({
        _key: speaker._key,
        name: speaker.name,
        profession: speaker.profession,
        ...(speaker.photo && { photo: speaker.photo })
      }));

      const newEvent = {
        _type: "event",
        _id: uuidv4(),
        ...eventData,
        images: imageRefs,
        resources: resourceRefs,
        speakers: speakersForSanity,
      };

      if (posterRef) {
        newEvent.poster = {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: posterRef,
          },
        };
      }

      const createEventPromise = client.create(newEvent);
      toast.promise(
        createEventPromise,
        {
          loading: "Creating event...",
          success: "Event created successfully!",
          error: "Failed to create event.",
        }
      );
      await createEventPromise;
      navigate("/");
    } catch (error) {
      console.error("Error adding event:", error);
      // Alert is replaced by toast.error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">{/* Add Toaster component */}
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-4xl">
        <h1 className="text-4xl font-extrabold text-center mb-8 text-green-400">
          Create New Event
        </h1>
        <form onSubmit={handleSubmit} className="space-y-8">
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
            <label className="block text-gray-300 text-sm font-bold mb-2">Event Overview (Fill Before Event has happened)</label>
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
            <label className="block text-gray-300 text-sm font-bold mb-2">Detailed Description (Fill After Event has happened)</label>
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
            {poster && (
              <div className="mb-4 flex items-center gap-4 p-3 bg-gray-700 rounded-md">
                <img
                  src={URL.createObjectURL(poster)}
                  alt="Event Poster Preview"
                  className="w-24 h-24 object-cover rounded-md border border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(URL.createObjectURL(poster));
                    setPoster(null);
                    toast.success("Event poster removed."); // Toast notification
                  }}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md text-white font-semibold transition duration-200 ease-in-out"
                >
                  Remove
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                handleFileChange(e, setPoster);
                if (e.target.files[0]) toast.success("Poster selected!"); // Toast notification
              }}
              className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-white hover:file:bg-green-600 transition duration-200 ease-in-out"
            />
            {!poster && (
              <p className="text-gray-400 text-sm mt-2">Upload a captivating poster for your event.</p>
            )}
          </div>

          {/* Upload Images */}
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">Event Images</label>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-700 rounded-md">
                {images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(img)}
                      alt={`Event Image ${index + 1}`}
                      className="w-24 h-24 object-cover rounded-md border border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(URL.createObjectURL(img));
                        handleRemoveFile(setImages, index);
                        toast.success("Image removed."); // Toast notification
                      }}
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
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                handleMultipleFilesChange(e, setImages);
                if (e.target.files.length > 0) toast.success("Images selected!"); // Toast notification
              }}
              className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-white hover:file:bg-green-600 transition duration-200 ease-in-out"
            />
            <p className="text-gray-400 text-sm mt-2">Add more images to showcase your event.</p>
          </div>

          {/* Upload Resources */}
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">Resources (PDFs, Docs, etc.)</label>
            {resources.length > 0 && (
              <div className="mb-4 p-3 bg-gray-700 rounded-md">
                {resources.map((res, index) => (
                  <div key={index} className="flex items-center justify-between gap-4 mb-2 bg-gray-600 p-2 rounded-md">
                    <span className="text-blue-400 truncate pr-2">{res.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        handleRemoveFile(setResources, index);
                        toast.success("Resource removed."); // Toast notification
                      }}
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md text-white text-sm font-semibold transition duration-200 ease-in-out"
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
              onChange={(e) => {
                handleMultipleFilesChange(e, setResources);
                if (e.target.files.length > 0) toast.success("Resources selected!"); // Toast notification
              }}
              className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-white hover:file:bg-green-600 transition duration-200 ease-in-out"
            />
            <p className="text-gray-400 text-sm mt-2">Upload supporting documents for your event.</p>
          </div>

          <hr className="border-gray-700 my-8" />

          {/* Speakers Section */}
          <h2 className="text-2xl font-semibold text-green-400 mb-4">Speakers</h2>
          <div className="space-y-4">
            {eventData.speakers.map((speaker, index) => (
              <div key={speaker._key} className="flex items-center gap-4 bg-gray-700 p-4 rounded-md shadow-sm">
                {speaker.photoPreviewUrl && (
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

          {/* Submit Button */}
          <div className="flex justify-center pt-6">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-bold text-white text-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Adding Event..." : "Add Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEvent;