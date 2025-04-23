"use client"

import { useTheme } from "./ThemeProvider"
import Navigation from "./Navigation"
import { Moon, Sun } from "lucide-react"

export default function Layout({ children, user, onLogout, isLoggedIn }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="app-layout">
      {isLoggedIn && <Navigation onLogout={onLogout} />}

      <div className="theme-toggle" onClick={toggleTheme}>
        {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
      </div>

      <main className="main-content">{children}</main>
    </div>
  )
}
