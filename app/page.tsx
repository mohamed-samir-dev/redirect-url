"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/proxy?path=/")
      .then((r) => r.text())
      .then((data) => {
        setHtml(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-950 text-white text-xl">جاري التحميل...</div>;
  }

  return (
    <iframe
      srcDoc={html}
      className="w-full h-screen border-0"
      allowFullScreen
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
}
