"use client";

import { useEffect, useState } from "react";
import { supabase, bucket } from "../lib/supabase";

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function compressImage(file, maxWidth = 1400, quality = 0.75) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
          type: "image/jpeg"
        }));
      },
      "image/jpeg",
      quality
    );
  });
}

export default function Home() {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [name, setName] = useState("");

  async function loadPhotos() {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus("Database error: " + error.message);
      return;
    }

    setPhotos(data || []);
  }

  useEffect(() => {
    loadPhotos();

    const channel = supabase
      .channel("public-photos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photos" },
        () => loadPhotos()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function uploadFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setStatus("Uploading...");

    try {
      for (const original of files) {
        if (!original.type.startsWith("image/")) continue;

        const file = await compressImage(original);
        const filePath = `${makeId()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase.from("photos").insert({
          url: publicUrlData.publicUrl,
          path: filePath,
          name: file.name,
          uploader: name.trim() || "Anonymous"
        });

        if (dbError) throw dbError;
      }

      setStatus("Uploaded successfully. Photos will stay after refresh.");
      event.target.value = "";
      await loadPhotos();
    } catch (err) {
      setStatus("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(photo) {
    const ok = window.confirm("Remove this photo?");
    if (!ok) return;

    setStatus("Removing photo...");

    try {
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([photo.path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("photos")
        .delete()
        .eq("id", photo.id);

      if (dbError) throw dbError;

      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setStatus("Photo removed.");
    } catch (err) {
      setStatus("Remove failed: " + err.message);
    }
  }

  async function copyLink(url) {
    await navigator.clipboard.writeText(url);
    setStatus("Photo link copied.");
  }

  return (
    <main className="page">
      <section className="hero">
        <h1>Photo Share</h1>
        <p>Everyone can upload photos. Photos stay after page refresh. They disappear only when you press Remove Photo.</p>

        <div className="uploadBox">
          <input
            className="nameInput"
            placeholder="Your name, optional"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className="uploadButton">
            {uploading ? "Uploading..." : "Choose photos"}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={uploadFiles}
              disabled={uploading}
            />
          </label>

          <p className="small">
            Photos are compressed before upload, so weak internet works better.
          </p>

          {status && <p className="status">{status}</p>}
        </div>
      </section>

      <section className="gallery">
        {photos.length === 0 && (
          <div className="empty">No photos yet. Upload the first one.</div>
        )}

        {photos.map((photo) => (
          <article className="card" key={photo.id}>
            <img src={photo.url} alt={photo.name || "Uploaded photo"} />
            <div className="cardFooter">
              <div>
                <strong>{photo.uploader || "Anonymous"}</strong>
                <span>{new Date(photo.created_at).toLocaleString()}</span>
              </div>
              <div className="actions">
                <button onClick={() => copyLink(photo.url)}>Copy link</button>
                <button className="removeBtn" onClick={() => removePhoto(photo)}>
                  Remove Photo
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      <style jsx>{`
        * { box-sizing: border-box; }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(59, 130, 246, 0.25), transparent 30%),
            #020617;
          color: white;
          font-family: Arial, sans-serif;
          padding: 28px;
        }

        .hero {
          max-width: 900px;
          margin: 0 auto 34px;
          text-align: center;
        }

        h1 {
          font-size: clamp(42px, 7vw, 82px);
          margin: 30px 0 10px;
          letter-spacing: -3px;
        }

        p {
          color: #cbd5e1;
          font-size: 18px;
        }

        .uploadBox {
          margin: 28px auto 0;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 26px;
          padding: 22px;
          max-width: 560px;
          box-shadow: 0 20px 70px rgba(0, 0, 0, 0.35);
        }

        .nameInput {
          width: 100%;
          padding: 15px 16px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: #0f172a;
          color: white;
          margin-bottom: 14px;
          font-size: 16px;
          outline: none;
        }

        .uploadButton {
          display: block;
          width: 100%;
          padding: 16px;
          border-radius: 16px;
          background: white;
          color: #020617;
          font-weight: 800;
          cursor: pointer;
        }

        .uploadButton input { display: none; }

        .small {
          font-size: 14px;
          margin-bottom: 0;
        }

        .status {
          font-size: 15px;
          color: #93c5fd;
        }

        .gallery {
          max-width: 1250px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 18px;
        }

        .empty {
          grid-column: 1 / -1;
          background: rgba(15, 23, 42, 0.8);
          border: 1px dashed rgba(148, 163, 184, 0.4);
          border-radius: 22px;
          padding: 40px;
          text-align: center;
          color: #cbd5e1;
        }

        .card {
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.28);
        }

        .card img {
          width: 100%;
          height: 260px;
          object-fit: cover;
          display: block;
          background: #0f172a;
        }

        .cardFooter {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 14px;
        }

        .cardFooter strong {
          display: block;
          font-size: 14px;
        }

        .cardFooter span {
          display: block;
          color: #94a3b8;
          font-size: 12px;
          margin-top: 3px;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        button {
          border: 0;
          border-radius: 12px;
          padding: 10px 12px;
          cursor: pointer;
          font-weight: 700;
          background: #1d4ed8;
          color: white;
          white-space: nowrap;
        }

        .removeBtn {
          background: #be123c;
        }

        @media (max-width: 600px) {
          .page { padding: 16px; }
          .card img { height: 220px; }
          .cardFooter { flex-direction: column; }
          .actions { width: 100%; }
          button { width: 100%; }
        }
      `}</style>
    </main>
  );
}