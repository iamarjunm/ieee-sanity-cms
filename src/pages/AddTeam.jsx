import React, { useState } from "react";
import { client } from "../sanityClient";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid"; // For generating unique keys
import toast from "react-hot-toast"; // For notifications
import { FaSpinner, FaTimes } from "react-icons/fa"; // For spinner and close icon

const AddTeam = () => {
  const [formData, setFormData] = useState({
    name: "",
    photo: null,
    committee: "",
    position: "",
    society: "",
    year: "",
    socialMedia: [],
    isWebsiteTeam: "No",
  });

  const [loading, setLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoUploading(true);
    const uploadToastId = toast.loading("Uploading photo...");

    try {
      const asset = await client.assets.upload("image", file);
      setFormData((prev) => ({ ...prev, photo: asset._id }));
      toast.success("Photo uploaded successfully!", { id: uploadToastId });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload photo.", { id: uploadToastId });
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSocialMediaChange = (index, e) => {
    const { name, value } = e.target;
    const updatedSocialMedia = formData.socialMedia.map((item, i) =>
      i === index ? { ...item, [name]: value } : item
    );
    setFormData({ ...formData, socialMedia: updatedSocialMedia });
  };

  const addSocialMedia = () => {
    setFormData((prev) => ({
      ...prev,
      socialMedia: [
        ...prev.socialMedia,
        { _key: uuidv4(), platform: "", url: "" },
      ],
    }));
  };

  const removeSocialMedia = (keyToRemove) => {
    setFormData((prev) => ({
      ...prev,
      socialMedia: prev.socialMedia.filter((item) => item._key !== keyToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const submitToastId = toast.loading("Adding team member...");

    try {
      // Prepare the new team member document
      const newMember = {
        _type: "team",
        name: formData.name.trim(),
        committee: formData.committee || null,
        position: formData.position || null,
        society: formData.society || null,
        year: formData.year || null,
        isWebsiteTeam: formData.isWebsiteTeam || "No",
        socialMedia: formData.socialMedia
          .filter((item) => item.platform && item.url)
          .map((item) => ({
            _key: item._key || uuidv4(),
            platform: item.platform,
            url: item.url,
          })),
      };

      // Add photo only if it exists
      if (formData.photo) {
        newMember.photo = { _type: "image", asset: { _ref: formData.photo } };
      }

      // Save the new team member to Sanity
      await client.create(newMember);
      toast.success("Team member added successfully!", { id: submitToastId });
      navigate("/"); // Navigate after successful submission
    } catch (error) {
      console.error("Error adding team member:", error);
      toast.error("Failed to add team member.", { id: submitToastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-3xl">
        <h1 className="text-3xl font-semibold text-center mb-8 text-green-400">
          Add New Team Member
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-gray-300 text-sm font-medium mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Enter full name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200"
              required
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label htmlFor="photo" className="block text-gray-300 text-sm font-medium mb-1">
              Photo
            </label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                id="photo"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full p-3 rounded bg-gray-700 border border-gray-600 cursor-pointer text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 transition duration-200"
              />
              {photoUploading && (
                <FaSpinner className="animate-spin text-green-400 text-xl" />
              )}
              {formData.photo && !photoUploading && (
                <span className="text-green-400 text-sm">Photo selected!</span>
              )}
            </div>
          </div>

          {/* Committee */}
          <div>
            <label htmlFor="committee" className="block text-gray-300 text-sm font-medium mb-1">
              Committee
            </label>
            <select
              id="committee"
              name="committee"
              value={formData.committee}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none appearance-none pr-8 transition duration-200"
            >
              <option value="">Select Committee</option>
              <option value="EC">Executive Committee</option>
              <option value="CC">Core Committee</option>
              <option value="Advisory">Advisory</option>
              <option value="Faculty">Faculty</option>
            </select>
          </div>

          {/* Position */}
          <div>
            <label htmlFor="position" className="block text-gray-300 text-sm font-medium mb-1">
              Position
            </label>
            <input
              type="text"
              id="position"
              name="position"
              placeholder="e.g., President, Head Coordinator"
              value={formData.position}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200"
            />
          </div>

          {/* Society */}
          <div>
            <label htmlFor="society" className="block text-gray-300 text-sm font-medium mb-1">
              Society
            </label>
            <select
              id="society"
              name="society"
              value={formData.society}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none appearance-none pr-8 transition duration-200"
            >
              <option value="">Select Society</option>
              <option value="IEEE SB">IEEE SB</option>
              <option value="IEEE CS">IEEE CS</option>
              <option value="IEEE WIE">IEEE WIE</option>
              <option value="IEEE CIS">IEEE CIS</option>
            </select>
          </div>

          {/* Year */}
          <div>
            <label htmlFor="year" className="block text-gray-300 text-sm font-medium mb-1">
              Year
            </label>
            <select
              id="year"
              name="year"
              value={formData.year}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none appearance-none pr-8 transition duration-200"
            >
              <option value="">Select Year </option>
              <option value="2022">2022</option>
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
            </select>
          </div>

          {/* Is Website Team */}
          <div>
            <label htmlFor="isWebsiteTeam" className="block text-gray-300 text-sm font-medium mb-1">
              Is this member part of the Website Team?
            </label>
            <select
              id="isWebsiteTeam"
              name="isWebsiteTeam"
              value={formData.isWebsiteTeam}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none appearance-none pr-8 transition duration-200"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          {/* Social Media */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Social Media Profiles</label>
            {formData.socialMedia.map((item, index) => (
              <div key={item._key} className="flex gap-4 mb-4 items-center">
                <select
                  name="platform"
                  value={item.platform}
                  onChange={(e) => handleSocialMediaChange(index, e)}
                  className="w-1/3 p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none appearance-none pr-8 transition duration-200"
                >
                  <option value="">Select Platform</option>
                  <option value="twitter">Twitter</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="instagram">Instagram</option>
                  <option value="github">GitHub</option>
                </select>
                <input
                  type="url"
                  name="url"
                  placeholder="Profile URL (e.g., https://twitter.com/username)"
                  value={item.url}
                  onChange={(e) => handleSocialMediaChange(index, e)}
                  className="w-2/3 p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none transition duration-200"
                />
                <button
                  type="button"
                  onClick={() => removeSocialMedia(item._key)}
                  className="text-red-400 hover:text-red-500 transition duration-200"
                  title="Remove social media"
                >
                  <FaTimes />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSocialMedia}
              className="bg-gray-600 hover:bg-gray-700 px-5 py-2 rounded-lg text-white font-medium flex items-center justify-center transition duration-200"
            >
              Add Another Social Media
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || photoUploading}
              className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-semibold text-white transition duration-300 ease-in-out flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" /> Adding...
                </>
              ) : (
                "Add Team Member"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTeam;