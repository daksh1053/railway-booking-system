"use client"

import { createContext, useContext, useEffect, useState } from "react"

const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light")

  // Initialize theme from localStorage if available
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.setAttribute("data-theme", savedTheme)
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      // Use system preference as fallback
      setTheme("dark")
      document.documentElement.setAttribute("data-theme", "dark")
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    document.documentElement.setAttribute("data-theme", newTheme)
    localStorage.setItem("theme", newTheme)
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}
