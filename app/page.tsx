"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");

  useEffect(() => {
    fetch("/api/redirect")
      .then((r) => r.json())
      .then((data) => setUrl(data.redirectUrl));
  }, []);

  if (!url) {
    return <div className="flex items-center justify-center h-screen bg-gray-950 text-white text-xl">جاري التحميل...</div>;
  }

  return (
    <iframe
      src={url}
      className="w-full h-screen border-0"
      allowFullScreen
    />
  );
}
