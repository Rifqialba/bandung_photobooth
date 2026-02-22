'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {

  const router = useRouter();
  const [date, setDate] = useState("");

  useEffect(() => {
    const d = new Date();
    setDate(
      d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }).toUpperCase()
    );
  }, []);

  return (
    <main className="retro-wrapper">

      <div className="retro-container">

        {/* Header */}
        <div className="retro-header">
          <span>BREAKING NEWS</span>
          <span>BANDUNG DAILY</span>
          <span>{date}</span>
        </div>

        {/* Title */}
        <h1 className="retro-title">PHOTO BOOTH</h1>

        {/* Sub */}
        <p className="retro-sub">
          Capture your moment in vintage newspaper style
        </p>

        {/* Button */}
        <button
          className="retro-start"
          onClick={() => router.push("/session/1")}
        >
          START SESSION
        </button>

      </div>

    </main>
  );
}
