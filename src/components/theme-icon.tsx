import { IconMoon, IconSun } from "@tabler/icons-react";
import { useState } from "react";

export default function ThemeIcon() {
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains("dark")
  );

  const toggle = () => {
    if (!darkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.setProperty("color-scheme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.setProperty("color-scheme", "light");
      localStorage.setItem("theme", "light");
    }
    setDarkMode(!darkMode);
  };

  return (
    <button onClick={toggle} aria-label="Toggle Between Light and Dark Theme">
      {darkMode ? <IconSun /> : <IconMoon />}
    </button>
  );
}
