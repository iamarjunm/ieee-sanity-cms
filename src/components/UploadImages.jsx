import React, { useState } from "react";
import { client } from "../sanityClient";

const UploadImages = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  // Handle file selection
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  // Upload image to Sanity
  const handleUpload = async () => {
    if (!file) return alert("Please select an image first!");

    setUploading(true);

    try {
      const imageAsset = await client.assets.upload("image", file, {
        filename: file.name,
      });

      setImageUrl(imageAsset.url);
      console.log("Uploaded Image URL:", imageAsset.url);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
      <h2 className="text-xl font-bold mb-4">Upload Image</h2>
      
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
      />

      <button
        onClick={handleUpload}
        disabled={uploading}
        className={`mt-4 px-4 py-2 rounded ${
          uploading ? "bg-gray-500 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
        }`}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {imageUrl && (
        <div className="mt-4">
          <p className="text-sm text-gray-400">Uploaded Image:</p>
          <img src={imageUrl} alt="Uploaded" className="w-40 h-40 mx-auto mt-2 rounded-lg shadow" />
        </div>
      )}
    </div>
  );
};

export default UploadImages;
