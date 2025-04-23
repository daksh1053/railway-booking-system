"use client"

import { useState } from "react"
import "../styles/LoginPage.css"

function LoginPage({ onLogin }) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    registerusername: "",
    registerPassword: "",
    registerEmail: "",
  })
  const [error, setError] = useState({
    login: "",
    register: "",
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError({ ...error, login: "" })

    try {
      // Create SQL query to check login credentials
      const loginQuery = `SELECT user_id, username, email FROM user 
                          WHERE username = '${formData.username}' 
                          AND password = '${formData.password}'`

      const response = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: loginQuery,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.status === "error") {
        throw new Error(data.error || "Login failed")
      }

      if (data.results.length === 0) {
        throw new Error("Invalid username or password")
      }

      // Login successful
      onLogin(data.results[0])
    } catch (err) {
      setError({ ...error, login: err.message })
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setError({ ...error, register: "" })

    try {
      // First check if username already exists
      const checkusernameQuery = `SELECT COUNT(*) as count FROM user 
                                  WHERE username = '${formData.registerusername}'`

      let response = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: checkusernameQuery,
        }),
      })

      let data = await response.json()

      if (!response.ok || data.status === "error") {
        throw new Error(data.error || "Registration check failed")
      }

      if (data.results[0].count > 0) {
        throw new Error("Username already exists")
      }

      // Check if email already exists
      const checkEmailQuery = `SELECT COUNT(*) as count FROM user 
                              WHERE email = '${formData.registerEmail}'`

      response = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: checkEmailQuery,
        }),
      })

      data = await response.json()

      if (!response.ok || data.status === "error") {
        throw new Error(data.error || "Registration check failed")
      }

      if (data.results[0].count > 0) {
        throw new Error("Email already exists")
      }

      // Insert new user
      const insertuserQuery = `INSERT INTO user (username, password, email) 
                              VALUES ('${formData.registerusername}', 
                                     '${formData.registerPassword}', 
                                     '${formData.registerEmail}')`

      response = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: insertuserQuery,
        }),
      })

      data = await response.json()

      if (!response.ok || data.status === "error") {
        throw new Error(data.error || "Registration failed")
      }

      // Clear register form
      setFormData({
        ...formData,
        registerusername: "",
        registerPassword: "",
        registerEmail: "",
      })

      // Show success message
      alert("Registration successful! Please login.")
    } catch (err) {
      setError({ ...error, register: err.message })
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box login-box">
        <h2>Login</h2>
        {error.login && <div className="error-message">{error.login}</div>}

        <form onSubmit={handleLoginSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="submit-btn">
            Login
          </button>
        </form>
      </div>

      <div className="auth-box register-box">
        <h2>Create Account</h2>
        {error.register && <div className="error-message">{error.register}</div>}

        <form onSubmit={handleRegisterSubmit}>
          <div className="form-group">
            <label htmlFor="registerusername">Username</label>
            <input
              type="text"
              id="registerusername"
              name="registerusername"
              value={formData.registerusername}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="registerEmail">Email</label>
            <input
              type="email"
              id="registerEmail"
              name="registerEmail"
              value={formData.registerEmail}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="registerPassword">Password</label>
            <input
              type="password"
              id="registerPassword"
              name="registerPassword"
              value={formData.registerPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="submit-btn register-btn">
            Register
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
