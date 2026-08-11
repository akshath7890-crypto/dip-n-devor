# 🍔 Dip N Devour (DND) - Full-Stack Food Ordering & Kitchen Dispatch Platform

> **"DIP IT. DEVOUR IT. LOVE IT."**

Dip N Devour (DND) is a modern, high-performance web application designed for interactive food ordering and real-time kitchen order management.

---

## ✨ Features

- 🛒 **Customer Web App**:
  - Direct 1-click cart addition (no dip selectors or filters)
  - Order Preferences: **Takeaway / Pickup** (with automatic ₹10 packaging fee) or **Dine-In** (Table Number)
  - Customer name input (no phone number required)
  - **Instant Payment Options**:
    - Ultra-crisp HD scannable **Paytm UPI QR Code** (Merchant: *Ravada Akshath*, UPI ID: `paytm.s3el1xq@pty`, Mobile: `8688033396`)
    - **Pay at Counter** (Cash on pickup/serving)
  - **Digital Order Receipt & Real-Time Kitchen Progress Bar** (`Received` ➔ `Preparing` ➔ `Ready` ➔ `Completed`)
  - Dedicated **My Orders** history section saved on browser session

- 👨‍🍳 **Owner Dashboard Portal**:
  - Live kitchen order receiver with audio chime sound alerts
  - 1-Click Order Status progression (`Received` ➔ `Preparing` ➔ `Ready` ➔ `Completed`)
  - Auto-updates `PENDING (COD)` status to `PAID (COMPLETED)` when order is completed
  - Add new menu items, edit prices in **Indian Rupees (₹)**, delete items, and toggle **In Stock** / **Sold Out** status
  - **Secure Owner Authentication**: Gmail + Custom Password Login with **2-Question Security Recovery System**:
    1. *What is your best friend's name?*
    2. *What is your favorite teacher's name?*

- ⚡ **Real-Time Data Sync**:
  - Built with **Server-Sent Events (SSE)** for instant live sync between Customer App and Owner Portal.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Servers
```bash
npm run dev
```
- Customer App: `http://localhost:3000/`
- Owner Dashboard: `http://localhost:3000/owner.html`

### 3. Run Production Server
```bash
npm run build
node server/index.js
```
- Production Server: `http://localhost:5000/`

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite 8, Tailwind CSS v4, Lucide Icons, Canvas Confetti, QRCode Generator
- **Backend**: Node.js, Express, Server-Sent Events (SSE), JSON Persistent Data Store

---

© 2026 Dip N Devour (DND). All rights reserved.
