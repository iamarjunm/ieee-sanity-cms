import React, { useState, useEffect, useCallback, useMemo } from "react";
import { client } from "../sanityClient";
import imageUrlBuilder from "@sanity/image-url";
import ConfirmationModal from "./ConfirmationModal";
import {
  FaUpload,
  FaSpinner,
  FaTrashAlt,
  FaEye,
  FaLink,
  FaSearch,
  FaTimes,
  FaImage, // For general icon
  FaFolderOpen // For empty state
} from "react-icons/fa"; // Import more relevant icons

// Initialize Sanity image URL builder
const builder = imageUrlBuilder(client);

function urlFor(source) {
  return builder.image(source);
}

const MediaLibrary = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState([]);
  const [deletingAssetId, setDeletingAssetId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); // New state for search

  // --- Modal State for Deletion ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);

  // Fetch all existing image assets from Sanity on component mount
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const assets = await client.fetch(
        `*[_type == "sanity.imageAsset"] | order(_createdAt desc) {_id, url, originalFilename}`
      );
      setUploadedAssets(assets);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
      alert("Failed to load existing images. Please check your Sanity project settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Handle multiple file selection
  const handleFileChange = (event) => {
    // Clear previous selections if new files are chosen
    setSelectedFiles(Array.from(event.target.files));
  };

  // Upload multiple images to Sanity
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return alert("Please select one or more images to upload.");

    setUploading(true);
    let successfulUploads = 0;

    try {
      for (const file of selectedFiles) {
        const imageAsset = await client.assets.upload("image", file, {
          filename: file.name,
        });
        setUploadedAssets((prevAssets) => [
          { _id: imageAsset._id, url: imageAsset.url, originalFilename: file.name },
          ...prevAssets, // Add new assets to the beginning for immediate visibility
        ]);
        successfulUploads++;
      }
      // Replaced alert with a more subtle notification or toast in a real app
      // For now, kept alert for simplicity.
      alert(`Successfully uploaded ${successfulUploads} image(s)!`);
      setSelectedFiles([]); // Clear selected files after successful upload
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload one or more images. Check console for details.");
    } finally {
      setUploading(false);
    }
  };

  // --- Deletion Logic ---
  const openDeleteModal = (asset) => {
    setAssetToDelete(asset);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setAssetToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!assetToDelete) return;

    setDeletingAssetId(assetToDelete._id);

    try {
      await client.delete(assetToDelete._id);
      setUploadedAssets((prevAssets) =>
        prevAssets.filter((asset) => asset._id !== assetToDelete._id)
      );
      // Replaced alert with a more subtle notification or toast in a real app
      alert(`Image "${assetToDelete.originalFilename || assetToDelete._id}" deleted successfully!`);
    } catch (error) {
      console.error("Failed to delete image:", error);
      alert("Failed to delete image. Please try again.");
    } finally {
      setDeletingAssetId(null);
      closeDeleteModal();
    }
  };

  // Filtered assets based on search term
  const filteredAssets = useMemo(() => {
    if (!searchTerm) {
      return uploadedAssets;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return uploadedAssets.filter(
      (asset) =>
        asset.originalFilename?.toLowerCase().includes(lowerCaseSearchTerm) ||
        asset._id.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [uploadedAssets, searchTerm]);

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 w-full mx-auto">
      <h2 className="text-3xl font-extrabold mb-6 text-purple-400 text-center flex items-center justify-center gap-3">
        <FaImage className="text-purple-500"/> Media Library
      </h2>

      {/* Upload Section */}
      <div className="border border-gray-700 p-5 rounded-lg mb-8 bg-gray-900/50 backdrop-blur-sm">
        <h3 className="text-xl font-bold text-gray-300 mb-4 flex items-center gap-2">
          <FaUpload className="text-blue-400"/> Upload New Images
        </h3>
        <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
          <label className="flex-grow flex items-center justify-center px-4 py-3 rounded-md border-2 border-dashed border-gray-600 text-gray-400 cursor-pointer hover:border-blue-500 hover:text-blue-300 transition duration-300 ease-in-out">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden" // Hide the default input
            />
            {selectedFiles.length > 0 ? (
              <span className="text-green-400 font-medium">
                {selectedFiles.length} file(s) selected: {selectedFiles.map(f => f.name).join(', ').substring(0, 50)}{selectedFiles.map(f => f.name).join(', ').length > 50 ? '...' : ''}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FaImage /> Choose Image(s)
              </span>
            )}
          </label>

          <button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
            className={`flex-shrink-0 px-8 py-3 rounded-lg font-bold text-white shadow-lg transition duration-300 ease-in-out transform flex items-center justify-center gap-2 ${
              uploading || selectedFiles.length === 0
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 hover:scale-105"
            }`}
          >
            {uploading ? (
              <>
                <FaSpinner className="animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <FaUpload /> Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
              </>
            )}
          </button>
        </div>
        {selectedFiles.length > 0 && (
          <button
            onClick={() => setSelectedFiles([])}
            className="text-red-400 text-sm hover:text-red-500 flex items-center gap-1 mt-2"
          >
            <FaTimes /> Clear Selection
          </button>
        )}
      </div>

      {/* Search and Display Area */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-5 border-b border-gray-700 pb-3">
          <h3 className="text-2xl font-bold text-gray-300 flex items-center gap-2">
            <FaFolderOpen className="text-yellow-400"/> Your Assets
          </h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search images by name or ID..."
              className="pl-10 pr-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                title="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-blue-400 text-xl flex items-center justify-center p-8 animate-pulse">
            <FaSpinner className="animate-spin mr-2" />
            Loading assets...
          </div>
        ) : filteredAssets.length === 0 && uploadedAssets.length > 0 ? (
          <div className="text-gray-500 text-center py-8">
            <p className="text-2xl mb-2">🤷‍♂️ No matching images found.</p>
            <p>Try adjusting your search terms or clearing the search box.</p>
          </div>
        ) : uploadedAssets.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            <p className="text-2xl mb-2">📂 Empty Library!</p>
            <p>No images uploaded yet. Use the section above to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto max-h-[60vh] pr-2">
            {filteredAssets.map((asset) => (
              <div
                key={asset._id}
                className="relative group bg-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col items-center justify-between p-3 border border-gray-600 transform hover:scale-102 transition duration-200 ease-in-out"
              >
                <img
                  src={urlFor(asset.url).width(240).url()} // Slightly larger preview
                  alt={asset.originalFilename || "Sanity Image"}
                  className="w-full h-32 object-cover rounded-md mb-3 flex-shrink-0"
                  loading="lazy" // Add lazy loading for better performance
                />
                <p
                  className="text-sm text-gray-300 truncate w-full text-center mb-3"
                  title={asset.originalFilename || `Asset ID: ${asset._id}`}
                >
                  {asset.originalFilename || `ID: ${asset._id.substring(0, 8)}...`}
                </p>
                <div className="flex gap-2 w-full justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full text-sm transition duration-200 flex items-center justify-center"
                    title="View original image"
                  >
                    <FaEye />
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(asset.url);
                      alert("Image URL copied to clipboard!"); // Consider a less intrusive notification
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full text-sm transition duration-200 flex items-center justify-center"
                    title="Copy image URL"
                  >
                    <FaLink />
                  </button>
                  <button
                    onClick={() => openDeleteModal(asset)}
                    disabled={deletingAssetId === asset._id}
                    className={`bg-red-600 hover:bg-red-700 text-white p-2 rounded-full text-sm transition duration-200 flex items-center justify-center ${
                      deletingAssetId === asset._id ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    title="Delete image"
                  >
                    {deletingAssetId === asset._id ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaTrashAlt />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Confirm Image Deletion"
        message={`Are you sure you want to permanently delete "${
          assetToDelete?.originalFilename || assetToDelete?._id
        }"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
      />
    </div>
  );
};

export default MediaLibrary;