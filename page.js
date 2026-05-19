
"use client";

import { useState } from "react";

export default function Home() {
  const [images, setImages] = useState([]);

  const handleUpload = (e) => {
    const files = Array.from(e.target.files);

    const mapped = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file)
    }));

    setImages((prev) => [...prev, ...mapped]);
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0f172a",
      color: "white",
      padding: "30px",
      fontFamily: "Arial"
    }}>
      <h1 style={{fontSize: "42px"}}>Photo Share App</h1>

      <p>Upload and share photos with friends.</p>

      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleUpload}
        style={{marginTop: "20px"}}
      />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "20px",
        marginTop: "30px"
      }}>
        {images.map((img, index) => (
          <div key={index} style={{
            background: "#1e293b",
            padding: "10px",
            borderRadius: "16px"
          }}>
            <img
              src={img.url}
              alt={img.name}
              style={{
                width: "100%",
                borderRadius: "12px"
              }}
            />
            <p>{img.name}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
