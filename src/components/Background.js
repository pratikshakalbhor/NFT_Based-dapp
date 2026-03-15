import React from "react";
import { useTheme } from "../context/ThemeContext";

const Background = () => {
  const { isDark } = useTheme();

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #0a0a1a, #0f0f2e, #1a0a2e)"
          : "linear-gradient(135deg, #f0f2ff 0%, #e8ecff 50%, #f5f0ff 100%)",
      }}
    >
      <div
        className={`absolute w-[600px] h-[600px] rounded-full blur-3xl animate-pulse top-[-150px] left-[-150px] ${
          isDark ? "bg-purple-700 opacity-30" : "bg-indigo-600 opacity-15"
        }`}
        style={{ backgroundColor: isDark ? "" : "rgba(99,102,241,0.15)" }}
      />
      <div
        className={`absolute w-[500px] h-[500px] rounded-full blur-3xl bottom-[-150px] right-[-150px] ${
          isDark ? "bg-indigo-600 opacity-30" : "bg-indigo-500 opacity-15"
        }`}
        style={{ backgroundColor: isDark ? "" : "rgba(99,102,241,0.15)" }}
      />
      <div
        className={`absolute w-[400px] h-[400px] rounded-full blur-3xl top-[40%] left-[40%] ${
          isDark ? "bg-pink-600 opacity-20" : "bg-purple-400 opacity-10"
        }`}
        style={{ backgroundColor: isDark ? "" : "rgba(139,92,246,0.1)" }}
      />
    </div>
  );
};

export default Background;