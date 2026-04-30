"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    fetch("/api/redirect")
      .then((r) => r.json())
      .then((data) => {
        window.location.href = data.redirectUrl;
      });
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-950 text-white text-xl">
      جاري التحويل...
    </div>
  );
}
