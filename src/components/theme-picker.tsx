import { IconMoon, IconShadow, IconSun } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function ThemeIcon() {
  const [theme, setTheme] = useState(localStorage.getItem("theme"));

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else if (theme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      // if no theme is selected, check the system preference
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      localStorage.removeItem("theme");
    }
  }, [theme]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title="Pick Theme"
        className="h-6 w-6 rounded-[2px] ring-offset-[#F4F4F5] transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-[3px] dark:ring-offset-[#18181A]"
      >
        {theme === "dark" ? (
          <IconMoon />
        ) : theme === "light" ? (
          <IconSun />
        ) : (
          <IconShadow />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuCheckboxItem
          checked={theme === "light"}
          onClick={(e) => setTheme("light")}
        >
          Light
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={theme === "dark"}
          onClick={(e) => setTheme("dark")}
        >
          Dark
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={theme === null}
          onClick={(e) => setTheme(null)}
        >
          System
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
