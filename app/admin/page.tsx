"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [redirectUrl, setRedirectUrl] = useState("");
  const [label, setLabel] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/redirect")
      .then((r) => r.json())
      .then((data) => {
        setRedirectUrl(data.redirectUrl);
        setLabel(data.label);
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaved(false);
    await fetch("/api/redirect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirectUrl, label }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-xl">جاري التحميل...</div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 p-4" dir="rtl">
      <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-white text-center">🔗 لوحة التحكم</h1>
        <p className="text-gray-400 text-center text-sm">غيّر رابط التحويل من هنا</p>

        <div className="space-y-2">
          <label className="text-gray-300 text-sm">اسم المتجر</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="مثلاً: بصمة، تبارك..."
            className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-gray-300 text-sm">رابط التحويل</label>
          <input
            type="url"
            value={redirectUrl}
            onChange={(e) => setRedirectUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
            dir="ltr"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
        >
          💾 حفظ
        </button>

        {saved && (
          <p className="text-green-400 text-center text-sm">✅ تم الحفظ بنجاح!</p>
        )}

        <div className="bg-gray-800 rounded-lg p-4 space-y-1">
          <p className="text-gray-400 text-xs">الرابط الحالي:</p>
          <p className="text-blue-400 text-sm break-all" dir="ltr">{redirectUrl}</p>
          <p className="text-gray-500 text-xs mt-2">
            أي حد يفتح رابط موقعك هيتحول تلقائياً للرابط ده ☝️
          </p>
        </div>
      </div>
    </div>
  );
}
