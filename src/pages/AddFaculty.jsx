import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { client } from "../sanityClient";
import {
  FaArrowLeft,
  FaUpload,
  FaSpinner,
  FaCheckCircle,
} from "react-icons/fa";

const AddFaculty = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    designation: "",
    educationalQualifications: "",
    linkedinUrl: "",
    googleScholarUrl: "",
    notableWorks: "",
  });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setPhoto(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const {
      name,
      email,
      department,
      designation,
      educationalQualifications,
    } = formData;

    if (!name || !email || !department || !designation || !educationalQualifications || !photo) {
      alert("Please fill in all required fields and upload a photo.");
      setLoading(false);
      return;
    }

    try {
      setPhotoUploading(true);
      const photoAsset = await client.assets.upload("image", photo);
      setPhotoUploading(false);

      const doc = {
        _type: "faculty",
        ...formData,
        photo: {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: photoAsset._id,
          },
        },
      };

      await client.create(doc);
      setSubmitSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error("Error creating faculty member:", error);
      alert("Failed to add faculty member. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white font-sans p-6 items-center">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-4xl my-10 border border-gray-700">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-400 hover:text-blue-300 flex items-center mb-6 transition"
        >
          <FaArrowLeft className="mr-2" /> Back to Dashboard
        </button>
        <h1 className="text-3xl font-extrabold text-blue-400 mb-6">
          Add New Faculty Member
        </h1>

        {submitSuccess && (
          <div className="bg-green-600 p-4 rounded-lg flex items-center mb-6">
            <FaCheckCircle className="text-white mr-3" />
            <span className="text-white">Faculty member added successfully! Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 mb-2 font-medium">Name of Faculty *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-2 font-medium">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-2 font-medium">Department *</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-2 font-medium">Designation *</label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-gray-400 mb-2 font-medium">Educational Qualifications *</label>
              <textarea
                name="educationalQualifications"
                value={formData.educationalQualifications}
                onChange={handleChange}
                rows="2"
                className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              ></textarea>
            </div>
            <div>
              <label className="block text-gray-400 mb-2 font-medium">LinkedIn URL</label>
              <input
                type="url"
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={handleChange}
                className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-2 font-medium">Google Scholar URL</label>
              <input
                type="url"
                name="googleScholarUrl"
                value={formData.googleScholarUrl}
                onChange={handleChange}
                className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-gray-400 mb-2 font-medium">Notable Work(s)</label>
              <textarea
                name="notableWorks"
                value={formData.notableWorks}
                onChange={handleChange}
                rows="3"
                className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              ></textarea>
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-gray-400 mb-2 font-medium">Upload Photo *</label>
              <input
                type="file"
                name="photo"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 transition"
              />
              {photo && (
                <div className="mt-4 text-green-400 flex items-center">
                  <FaCheckCircle className="mr-2" />
                  <span>{photo.name} ready to be uploaded.</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-6 rounded-lg font-bold text-lg shadow-lg transition duration-300 flex items-center justify-center gap-2
              ${
                loading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 transform hover:scale-105"
              }`}
          >
            {loading ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <FaUpload />
            )}
            {loading ? (
              photoUploading ? "Uploading Photo..." : "Submitting..."
            ) : (
              "Add Faculty Member"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddFaculty;