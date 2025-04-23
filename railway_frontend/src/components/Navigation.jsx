"use client"

import { useNavigate } from "react-router-dom"
import { useTheme } from "./ThemeProvider"
import {
  Home,
  Ticket,
  Search,
  XCircle,
  Users,
  Clock,
  TrendingUp,
  DollarSign,
  FileText,
  Calendar,
  Train,
  LogOut,
} from "lucide-react"
import "../styles/Navigation.css"

const Navigation = ({ onLogout }) => {
  const navigate = useNavigate()
  const { theme } = useTheme()

  const navItems = [
    { label: "Dashboard", icon: <Home size={18} />, path: "/dashboard" },
    { label: "Book Ticket", icon: <Ticket size={18} />, path: "/booking" },
    { label: "Check Status", icon: <Search size={18} />, path: "/status" },
    { label: "Cancel Ticket", icon: <XCircle size={18} />, path: "/cancellation" },
    { label: "Passenger List", icon: <Users size={18} />, path: "/passenger-list" },
    { label: "Waitlist", icon: <Clock size={18} />, path: "/waitlist" },
    { label: "Revenue", icon: <DollarSign size={18} />, path: "/revenue" },
    { label: "Cancellations", icon: <XCircle size={18} />, path: "/cancellation-records" },
    { label: "Busiest Route", icon: <TrendingUp size={18} />, path: "/busiest-route" },
    { label: "Itemized Bill", icon: <FileText size={18} />, path: "/itemized-bill" },
    { label: "Available Seats", icon: <Calendar size={18} />, path: "/available-seats" },
    { label: "Train Schedule", icon: <Train size={18} />, path: "/train-schedule" },
  ]

  return (
    <nav className={`navigation ${theme}`}>
      <div className="nav-header">
        <div className="nav-brand">
          <Train size={24} />
          <span>Railway System</span>
        </div>
      </div>

      <div className="nav-links">
        {navItems.map((item, index) => (
          <button key={index} className="nav-item" onClick={() => navigate(item.path)}>
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="nav-footer">
        <button className="logout-button" onClick={onLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  )
}

export default Navigation
