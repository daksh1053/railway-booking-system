"use client"

import { Link } from "react-router-dom"
import "../styles/Dashboard.css"
import { Ticket, Search, XCircle, Users, Clock, DollarSign, TrendingUp, FileText, Calendar, Train, AlertTriangle } from "lucide-react"

function Dashboard({ user, onLogout }) {
  const dashboardItems = [
    {
      title: "Book Tickets",
      description: "Book train tickets for your journey",
      icon: <Ticket size={24} />,
      path: "/booking",
    },
    {
      title: "Check Status",
      description: "Check the status of your bookings",
      icon: <Search size={24} />,
      path: "/status",
    },
    {
      title: "Cancel Tickets",
      description: "Cancel your existing bookings",
      icon: <XCircle size={24} />,
      path: "/cancellation",
    },
    {
      title: "Check Waitlist",
      description: "View waitlisted passengers for a specific train",
      icon: <Clock size={24} />,
      path: "/waitlist",
    },
    {
      title: "View Revenue",
      description: "Check total revenue generated",
      icon: <DollarSign size={24} />,
      path: "/revenue",
    },
    {
      title: "Available Seats",
      description: "Check available seats for a train",
      icon: <Calendar size={24} />,
      path: "/available-seats",
    },
    {
      title: "Train Schedule",
      description: "View detailed train schedules",
      icon: <Train size={24} />,
      path: "/train-schedule",
    },
    {
      title: "Passenger List",
      description: "View list of passengers on a train",
      icon: <Users size={24} />,
      path: "/passenger-list",
    },
    {
      title: "Cancellation Records",
      description: "View all cancellation records",
      icon: <XCircle size={24} />,
      path: "/cancellation-records",
    },
    {
      title: "Cancel Train",
      description: "Cancel an entire train service",
      icon: <AlertTriangle size={24} />,
      path: "/cancel-train",
    },
    {
      title: "Busiest Routes",
      description: "Analyze the busiest train routes",
      icon: <TrendingUp size={24} />,
      path: "/busiest-route",
    },
    {
      title: "Itemized Bill",
      description: "View detailed billing information",
      icon: <FileText size={24} />,
      path: "/itemized-bill",
    },
  ]

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome, {user.username}</h1>
        <p>What would you like to do today?</p>
      </div>

      <div className="dashboard-cards hover-blur-container">
        {dashboardItems.map((item, index) => (
          <Link to={item.path} className="dashboard-card hover-blur-item" key={index}>
            <div className="card-icon">{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Dashboard
