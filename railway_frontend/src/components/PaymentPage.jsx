"use client"

import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import "../styles/PaymentPage.css"

function PaymentPage(props) {
  const location = useLocation()
  const navigate = useNavigate()
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes in seconds
  const [paymentStatus, setPaymentStatus] = useState("pending") // 'pending', 'processing', 'success'
  const [processingMessage, setProcessingMessage] = useState("")

  // Default booking details to use when no data is available
  const defaultBookingDetails = {
    train: "Express Train",
    trainNumber: "12345",
    from: "Origin Station",
    to: "Destination Station",
    date: new Date().toISOString().split("T")[0],
    passengers: [{ name: "Passenger" }],
    totalFare: 500,
    pnr: "DUMMY12345",
  }

  // Get booking details from props first, then location state, then localStorage as fallback
  const [bookingDetails, setBookingDetails] = useState(() => {
    try {
      const storedDetails = localStorage.getItem("bookingDetails")
      const details =
        props.bookingDetails || location.state?.bookingDetails || (storedDetails ? JSON.parse(storedDetails) : null)

      console.log("Initial booking details:", details)

      // Return default details if nothing is available or data is invalid
      return details && typeof details === "object" && Object.keys(details).length > 0 ? details : defaultBookingDetails
    } catch (error) {
      console.error("Error parsing booking details:", error)
      return defaultBookingDetails
    }
  })

  // Save booking details to localStorage when they arrive
  useEffect(() => {
    console.log("Props bookingDetails:", props.bookingDetails)
    console.log("Location state bookingDetails:", location.state?.bookingDetails)

    if (props.bookingDetails || location.state?.bookingDetails) {
      const details = props.bookingDetails || location.state?.bookingDetails
      console.log("Saving booking details to localStorage:", details)
      localStorage.setItem("bookingDetails", JSON.stringify(details))
      setBookingDetails(details)
    }
  }, [props.bookingDetails, location.state])

  // Timer effect
  useEffect(() => {
    // Always start the timer regardless of booking details
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer)
          // Session timeout
          alert("Payment session timed out!")
          navigate("/dashboard")
          return 0
        }
        return prevTime - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")
    const secs = (seconds % 60).toString().padStart(2, "0")
    return `${mins}:${secs}`
  }

  // Function to update ticket payment details in the database
  const updateTicketPaymentDetails = async (method) => {
    try {
      // Extract PNR from booking details
      const pnr = bookingDetails?.pnr

      if (!pnr) {
        console.error("No PNR found in booking details")
        // For demo purposes, we'll simulate a successful payment even without a PNR
        return true
      }

      console.log("Updating payment for PNR:", pnr)

      // SQL query to update the payment status and payment category using only the PNR
      const updatePaymentQuery = `
        UPDATE tickets
        SET payment_status = 'Completed',
            payment_category = '${method}'
        WHERE pnr = '${pnr}'
      `

      // For demo purposes, we'll simulate a successful API call
      console.log("Payment update query would be:", updatePaymentQuery)

      // Simulate a successful response
      return true
    } catch (error) {
      console.error("Error updating payment details:", error)
      return false
    }
  }

  const handlePayment = (method) => {
    setPaymentStatus("processing")
    setProcessingMessage(`Processing ${method} payment...`)

    // Update payment details in the database
    updateTicketPaymentDetails(method)
      .then((success) => {
        // Simulate payment processing with a delay
        setTimeout(() => {
          if (success) {
            setProcessingMessage("Payment successful! Redirecting to dashboard...")
            setPaymentStatus("success")

            // Redirect after 4 seconds
            setTimeout(() => {
              // Clear booking details from localStorage after successful payment
              localStorage.removeItem("bookingDetails")
              navigate("/dashboard")
            }, 4000)
          } else {
            setProcessingMessage("Payment processing failed. Please try again.")
            setPaymentStatus("pending")
          }
        }, 1500)
      })
      .catch((err) => {
        console.error("Payment processing error:", err)
        setProcessingMessage("Payment processing error. Please try again.")
        setPaymentStatus("pending")
      })
  }

  return (
    <div className="payment-page">
      <div className="payment-container">
        <h1>Complete Your Payment</h1>

        {paymentStatus === "pending" && (
          <>
            <div className="timer-container">
              <div className="timer">
                <span>Time remaining: {formatTime(timeLeft)}</span>
              </div>
            </div>

            <div className="booking-summary">
              <h3>Booking Summary</h3>
              <div className="summary-details">
                <p>
                  <strong>Train:</strong> {bookingDetails.train} ({bookingDetails.trainNumber})
                </p>
                <p>
                  <strong>Journey:</strong> {bookingDetails.from} to {bookingDetails.to}
                </p>
                <p>
                  <strong>Date:</strong> {bookingDetails.date}
                </p>
                <p>
                  <strong>PNR:</strong> {bookingDetails.pnr}
                </p>
                <p>
                  <strong>Passengers:</strong> {bookingDetails.passengers?.length || 1}
                </p>
                <p className="total-amount">
                  <strong>Total Amount:</strong> ₹{bookingDetails.totalFare}
                </p>
              </div>
            </div>

            <div className="payment-methods">
              <h3>Select Payment Method</h3>
              <div className="payment-buttons">
                <button className="payment-btn cash" onClick={() => handlePayment("Cash")}>
                  Cash
                </button>
                <button className="payment-btn upi" onClick={() => handlePayment("UPI")}>
                  UPI Payment
                </button>
                <button className="payment-btn card" onClick={() => handlePayment("Card")}>
                  Credit/Debit Card
                </button>
              </div>
            </div>

            <div className="payment-options">
              <div className="payment-option">
                <h4>Cash Payment</h4>
                <p>Pay with cash at the counter before your journey</p>
              </div>
              <div className="payment-option">
                <h4>UPI Payment</h4>
                <p>Pay instantly with your preferred UPI app</p>
              </div>
              <div className="payment-option">
                <h4>Card Payment</h4>
                <p>Pay securely with your credit or debit card</p>
              </div>
            </div>
          </>
        )}

        {paymentStatus === "processing" || paymentStatus === "success" ? (
          <div className="payment-processing">
            <div className="processing-message">{processingMessage}</div>
            {paymentStatus === "processing" && <div className="loader"></div>}
            {paymentStatus === "success" && <div className="success-icon">✓</div>}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default PaymentPage
