import React, { useEffect, useState } from "react";
import { client } from "../sanityClient"; // Assuming sanityClient is correctly configured
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast"; // For notifications
import { FaSpinner, FaTimes, FaTrashAlt } from "react-icons/fa"; // Icons for spinner, remove, and delete

const EditTeam = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    photo: null, // Will store Sanity image object or null
    committee: "",
    position: "",
    society: "",
    year: "",
    socialMedia: [],
    isWebsiteTeam: "No",
  });

  const [loading, setLoading] = useState(true); // Initial load for fetching data
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submission
  const [isPhotoUploading, setIsPhotoUploading] = useState(false); // For photo upload
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null); // URL for displaying image

  useEffect(() => {
    const fetchTeamMember = async () => {
      setLoading(true);
      setError(null); // Clear previous errors
      try {
        const member = await client.fetch(
          `*[_type == "team" && _id == $id][0]{
            name,
            photo{asset->{url, _id}}, // Fetch _id of the asset for potential deletion or re-referencing
            committee,
            position,
            society,
            year,
            socialMedia,
            isWebsiteTeam
          }`,
          { id }
        );

        if (!member) {
          setError("Team member not found.");
          toast.error("Team member not found!");
          return;
        }

        // Add _key to socialMedia items if missing, crucial for React list rendering
        const socialMediaWithKeys =
          member.socialMedia?.map((item) => ({
            ...item,
            _key: item._key || uuidv4(),
          })) || [];

        setFormData({
          ...member,
          photo: member.photo || null, // Ensure photo is correctly set
          committee: member.committee || "",
          position: member.position || "",
          society: member.society || "",
          year: member.year || "",
          socialMedia: socialMediaWithKeys,
          isWebsiteTeam: member.isWebsiteTeam || "No",
        });
        setImagePreview(member.photo?.asset?.url || null);
      } catch (err) {
        setError("Error fetching team member. Please try again.");
        toast.error("Failed to fetch team member details.");
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMember();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsPhotoUploading(true);
    const uploadToastId = toast.loading("Uploading new photo...");

    try {
      const asset = await client.assets.upload("image", file);

      // If an old photo exists, consider deleting it from Sanity to avoid orphaned assets
      // This requires the Sanity client to have delete permissions.
      // if (formData.photo?.asset?._id) {
      //   await client.delete(formData.photo.asset._id);
      //   console.log("Old asset deleted:", formData.photo.asset._id);
      // }

      setFormData((prevData) => ({
        ...prevData,
        photo: {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: asset._id, // Use the _id of the newly uploaded asset
          },
        },
      }));
      setImagePreview(URL.createObjectURL(file));
      toast.success("Photo uploaded successfully!", { id: uploadToastId });
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error("Failed to upload photo.", { id: uploadToastId });
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prevData) => ({
      ...prevData,
      photo: null, // Set photo to null to indicate removal
    }));
    setImagePreview(null);
    toast.success("Photo removed. It will be deleted on update.");
  };

  const handleSocialMediaChange = (index, e) => {
    const { name, value } = e.target;
    setFormData((prevData) => {
      const updatedSocialMedia = prevData.socialMedia.map((item, i) =>
        i === index ? { ...item, [name]: value } : item
      );
      return { ...prevData, socialMedia: updatedSocialMedia };
    });
  };

  const addSocialMedia = () => {
    setFormData((prevData) => ({
      ...prevData,
      socialMedia: [
        ...prevData.socialMedia,
        { _key: uuidv4(), platform: "", url: "" },
      ],
    }));
  };

  const removeSocialMedia = (keyToRemove) => {
    setFormData((prevData) => ({
      ...prevData,
      socialMedia: prevData.socialMedia.filter(
        (item) => item._key !== keyToRemove
      ),
    }));
    toast.success("Social media link removed.");
  };

  const handleDeleteTeamMember = async () => {
    if (
      window.confirm("Are you sure you want to delete this team member permanently?")
    ) {
      setIsSubmitting(true);
      const deleteToastId = toast.loading("Deleting team member...");
      try {
        await client.delete(id);
        toast.success("Team member deleted successfully!", {
          id: deleteToastId,
        });
        navigate("/");
      } catch (err) {
        console.error("Error deleting team member:", err);
        toast.error("Failed to delete team member.", { id: deleteToastId });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const updateToastId = toast.loading("Updating team member...");

    try {
      // Build the patch object
      const patch = {
        name: formData.name.trim(),
        committee: formData.committee || null,
        position: formData.position || null,
        society: formData.society || null,
        year: formData.year || null,
        isWebsiteTeam: formData.isWebsiteTeam || "No",
        socialMedia: formData.socialMedia
          .filter((item) => item.platform && item.url)
          .map((item) => ({
            _key: item._key || uuidv4(), // Ensure each item has a _key
            platform: item.platform,
            url: item.url,
          })),
      };

      // Handle photo update/removal logic
      if (formData.photo === null) {
        // Photo was explicitly removed by the user
        patch.photo = undefined; // Sanity patch will unset the field
      } else if (formData.photo && formData.photo.asset && formData.photo.asset._ref) {
        // A photo exists (either original or newly uploaded)
        patch.photo = {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: formData.photo.asset._ref,
          },
        };
      } else {
        // If formData.photo is undefined or not properly structured,
        // it means no new photo was uploaded and no existing photo was present.
        // We don't need to do anything with 'photo' in the patch in this specific case.
        // If you want to explicitly leave the old photo untouched if no new one is uploaded
        // and no remove action was taken, you'd handle that here.
        // For now, if formData.photo is already null from the fetch, it'll remain null.
      }


      await client
        .patch(id) // Target the specific document by ID
        .set(patch) // Set all the fields at once
        .unset(formData.photo === null && imagePreview !== null ? ['photo'] : []) // Unset photo only if it was previously there and now removed
        .commit();


      toast.success("Team member updated successfully!", { id: updateToastId });
      navigate("/");
    } catch (err) {
      console.error("Error updating team member:", err);
      toast.error("Failed to update team member.", { id: updateToastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <FaSpinner className="animate-spin text-green-400 text-4xl mb-4" />
        <p className="text-xl">Loading team member details...</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-gray-900 text-red-500 flex items-center justify-center p-6">
        <p className="text-xl text-center">{error}</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-3xl">
        <h1 className="text-3xl font-semibold text-center mb-8 text-green-400">
          Edit Team Member
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
            {imagePreview && (
              <div className="mb-4 flex items-center gap-4">
                <img
                  src={imagePreview}
                  alt="Team Member Photo"
                  className="w-32 h-32 object-cover rounded-lg shadow-md border border-gray-600"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition duration-200"
                  disabled={isPhotoUploading || isSubmitting}
                >
                  <FaTrashAlt /> Remove Photo
                </button>
              </div>
            )}
            <div className="flex items-center gap-4">
              <input
                type="file"
                id="photo"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full p-3 rounded bg-gray-700 border border-gray-600 cursor-pointer text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 transition duration-200"
                disabled={isPhotoUploading || isSubmitting}
              />
              {isPhotoUploading && (
                <FaSpinner className="animate-spin text-green-400 text-xl" />
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
                  className="text-red-400 hover:text-red-500 transition duration-200 p-2"
                  title="Remove social media link"
                >
                  <FaTimes className="text-xl" />
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

          {/* Action Buttons: Submit and Delete */}
          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={handleDeleteTeamMember}
              className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold text-white transition duration-300 ease-in-out flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || isPhotoUploading}
            >
              <FaTrashAlt /> Delete Member
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isPhotoUploading}
              className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-semibold text-white transition duration-300 ease-in-out flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin mr-2" /> Updating...
                </>
              ) : (
                "Update Team Member"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTeam;