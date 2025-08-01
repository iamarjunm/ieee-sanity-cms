import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { client } from "../sanityClient";
import {
  FaArrowLeft,
  FaSave,
  FaSpinner,
  FaCheckCircle,
  FaImage,
} from "react-icons/fa";

const EditFaculty = () => {
  const { id } = useParams();
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
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const facultyData = await client.fetch(
          `*[_id == $id][0] {..., photo{asset->{url}}}`,
          { id }
        );
        if (facultyData) {
          setFormData({
            name: facultyData.name || "",
            email: facultyData.email || "",
            department: facultyData.department || "",
            designation: facultyData.designation || "",
            educationalQualifications: facultyData.educationalQualifications || "",
            linkedinUrl: facultyData.linkedinUrl || "",
            googleScholarUrl: facultyData.googleScholarUrl || "",
            notableWorks: facultyData.notableWorks || "",
          });
          setCurrentPhoto(facultyData.photo?.asset?.url || null);
        } else {
          alert("Faculty member not found.");
          navigate("/");
        }
      } catch (error) {
        console.error("Error fetching faculty data:", error);
        alert("Failed to load data. Please try again.");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetchFaculty();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setPhoto(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.email || !formData.department || !formData.designation || !formData.educationalQualifications) {
      alert("Please fill in all required fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      let photoRef = null;
      if (photo) {
        setPhotoUploading(true);
        const photoAsset = await client.assets.upload("image", photo);
        photoRef = {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: photoAsset._id,
          },
        };
        setPhotoUploading(false);
      }

      const docToUpdate = {
        ...formData,
        ...(photoRef && { photo: photoRef }),
      };

      await client
        .patch(id)
        .set(docToUpdate)
        .commit();

      setSubmitSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error("Error updating faculty member:", error);
      alert("Failed to update faculty member. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <FaSpinner className="animate-spin text-4xl text-blue-400" />
      </div>
    );
  }

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
          Edit Faculty Member
        </h1>

        {submitSuccess && (
          <div className="bg-green-600 p-4 rounded-lg flex items-center mb-6">
            <FaCheckCircle className="text-white mr-3" />
            <span className="text-white">Faculty member updated successfully! Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form Fields (same as AddFaculty.js) */}
            <div>
              <label className="block text-gray-400 mb-2 font-medium">Name of Faculty *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div>
              <label className="block text-gray-400 mb-2 font-medium">Email *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div>
              <label className="block text-gray-400 mb-2 font-medium">Department *</label>
              <input type="text" name="department" value={formData.department} onChange={handleChange} className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div>
              <label className="block text-gray-400 mb-2 font-medium">Designation *</label>
              <input type="text" name="designation" value={formData.designation} onChange={handleChange} className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-gray-400 mb-2 font-medium">Educational Qualifications *</label>
              <textarea name="educationalQualifications" value={formData.educationalQualifications} onChange={handleChange} rows="2" className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 transition"></textarea>
            </div>
            <div>
              <label className="block text-gray-400 mb-2 font-medium">LinkedIn URL</label>
              <input type="url" name="linkedinUrl" value={formData.linkedinUrl} onChange={handleChange} className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div>
              <label className="block text-gray-400 mb-2 font-medium">Google Scholar URL</label>
              <input type="url" name="googleScholarUrl" value={formData.googleScholarUrl} onChange={handleChange} className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-gray-400 mb-2 font-medium">Notable Work(s)</label>
              <textarea name="notableWorks" value={formData.notableWorks} onChange={handleChange} rows="3" className="w-full p-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-blue-500 transition"></textarea>
            </div>

            {/* Photo Section (with current photo display) */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-gray-400 mb-2 font-medium">Upload New Photo (optional)</label>
              <input
                type="file"
                name="photo"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 transition"
              />
              {currentPhoto && (
                <div className="mt-4 flex items-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-600 bg-gray-700 flex items-center justify-center mr-4">
                    <img src={currentPhoto} alt="Current faculty" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-gray-400">Current Photo</p>
                </div>
              )}
              {photo && (
                <div className="mt-4 text-green-400 flex items-center">
                  <FaCheckCircle className="mr-2" />
                  <span>{photo.name} selected to replace current photo.</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 px-6 rounded-lg font-bold text-lg shadow-lg transition duration-300 flex items-center justify-center gap-2
              ${
                isSubmitting
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 transform hover:scale-105"
              }`}
          >
            {isSubmitting ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <FaSave />
            )}
            {isSubmitting ? (
              photoUploading ? "Uploading Photo..." : "Updating..."
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditFaculty;