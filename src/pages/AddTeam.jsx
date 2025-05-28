import React, { useState } from "react";
import { client } from "../sanityClient";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid"; // For generating unique keys

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
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const asset = await client.assets.upload("image", file);
      setFormData({ ...formData, photo: asset._id });
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialMediaChange = (index, e) => {
    const updatedSocialMedia = [...formData.socialMedia];
    updatedSocialMedia[index] = {
      ...updatedSocialMedia[index],
      [e.target.name]: e.target.value,
    };
    setFormData({ ...formData, socialMedia: updatedSocialMedia });
  };

  const addSocialMedia = () => {
    setFormData({
      ...formData,
      socialMedia: [
        ...formData.socialMedia,
        { _key: uuidv4(), platform: "", url: "" }, // Add _key for each new social media entry
      ],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

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
          .filter((item) => item.platform && item.url) // Only include filled social media entries
          .map((item) => ({
            _key: item._key || uuidv4(), // Ensure each item has a _key
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
      navigate("/");
    } catch (error) {
      console.error("Error adding team member:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-3xl">
        <h1 className="text-3xl font-semibold text-center mb-6">Add Team Member</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-gray-300 mb-1">Name</label>
            <input
              type="text"
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
              required
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-gray-300 mb-1">Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 cursor-pointer"
            />
          </div>

          {/* Committee */}
          <div>
            <label className="block text-gray-300 mb-1">Committee</label>
            <select
              name="committee"
              value={formData.committee}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
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
            <label className="block text-gray-300 mb-1">Position</label>
            <input
              type="text"
              name="position"
              placeholder="Position"
              value={formData.position}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Society */}
          <div>
            <label className="block text-gray-300 mb-1">Society</label>
            <select
              name="society"
              value={formData.society}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
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
            <label className="block text-gray-300 mb-1">Year</label>
            <select
              name="year"
              value={formData.year}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">Select Year</option>
              <option value="2022">2022</option>
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2024">2025</option>
            </select>
          </div>

          {/* Is Website Team */}
          <div>
            <label className="block text-gray-300 mb-1">Is Website Team Member?</label>
            <select
              name="isWebsiteTeam"
              value={formData.isWebsiteTeam}
              onChange={handleChange}
              className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          {/* Social Media */}
          <div>
            <label className="block text-gray-300 mb-1">Social Media</label>
            {formData.socialMedia.map((item, index) => (
              <div key={item._key} className="flex gap-4 mb-4">
                <select
                  name="platform"
                  value={item.platform}
                  onChange={(e) => handleSocialMediaChange(index, e)}
                  className="w-1/2 p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
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
                  placeholder="Profile URL"
                  value={item.url}
                  onChange={(e) => handleSocialMediaChange(index, e)}
                  className="w-1/2 p-3 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addSocialMedia}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-white"
            >
              Add Social Media
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-semibold text-white transition"
            >
              {loading ? "Adding..." : "Add Team Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTeam;