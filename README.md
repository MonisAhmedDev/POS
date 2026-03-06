# 🍔 FastBite — Fast Food Shop Management System

A fully featured, browser-based fast food shop management application built with plain HTML, CSS and JavaScript. No installation required — just open `index.html` in any browser.

---

## 🚀 How to Open

1. Locate the project folder: `G:\Softwares\Antigravity\My data\FastFoodShop\`
2. Double-click **`index.html`**
3. The app opens directly in your browser — done.

> **No internet connection required** after the first load (fonts/icons are loaded from CDNs on first open).

---

## 🔐 Login Credentials

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@fastfood.com     | admin123   |
| Customer | Sign up on the app | your choice |

---

## 💾 Data Saving

All data is **automatically saved** in your browser's local storage. It **survives browser closes, restarts and reboots** — you will never lose data just by closing the window.

### When could data be lost?
- If you clear your browser history / cache / site data manually
- If you use **Private / Incognito** mode (data is wiped when the window closes)
- If you switch browsers (each browser has its own separate storage)

### Permanent Backup (recommended)

Use the built-in **Export / Import** feature under **Admin → Settings → Data Management**:

| Button | What it does |
|--------|-------------|
| **Export Data to File** | Downloads a `fastbite-backup-YYYY-MM-DD.json` file to your PC |
| **Import Data from File** | Restores all data from a previously exported `.json` file |
| **Clear All Data** | Wipes everything (requires confirmation) |

> 💡 **Tip:** Export your data regularly and keep the backup `.json` file somewhere safe (e.g. a USB drive or cloud folder). You can restore it on any PC at any time using Import.

---

## 🛠️ Features

### Admin Panel
| Section | Features |
|---------|----------|
| **Dashboard** | Total orders, revenue, menu items count, customers count, recent orders, top-selling items |
| **Menu Items** | Add / Edit / Delete food items; set name, category, price, description, emoji icon and optionally a real **food photo** |
| **Orders** | View all customer orders with status filter; update order status (Preparing → Ready → Delivered) |
| **Customers** | View all registered customers, their total orders, total spent, average rating, and full order history; **Delete** customer accounts |
| **Feedback** | Read all customer reviews and star ratings |
| **Settings** | Export/Import/Clear data; manage admin accounts (add new admins, remove existing ones) |

### Customer Panel
| Section | Features |
|---------|----------|
| **Menu** | Browse all available items by category; add items to cart |
| **Cart** | View cart, adjust quantities, remove items, see subtotal/tax/delivery breakdown |
| **Checkout** | Enter delivery details; choose Cash on Delivery or Credit/Debit Card |
| **My Orders** | View all placed orders with status; **Cancel order** if it is still in *Preparing* status |
| **Feedback** | Rate and review delivered orders (1–5 stars); view past reviews |

---

## 🖼️ Food Photos

When adding or editing a menu item, admin can optionally upload a real photo:

1. In **Menu Items → Add Item** (or Edit), click the **Food Photo** upload area
2. Select any image file from your PC (JPG, PNG, WEBP, etc.)
3. A preview appears immediately
4. Click **Save Item** — the photo is stored and displayed on the menu card
5. If no photo is uploaded, the **emoji icon** is used as the thumbnail instead

---

## ❌ Order Cancellation

- Customers can cancel an order **only while it is in Preparing status**
- Once the admin changes status to *Ready* or *Delivered*, it can no longer be cancelled
- Cancelling shows a confirmation modal — click **"Yes, Cancel Order"** to confirm

---

## 🗂️ Project Files

| File | Purpose |
|------|---------|
| `index.html` | All HTML structure and page layouts |
| `style.css` | Complete design system (dark theme, yellow accents, animations) |
| `app.js` | All application logic (auth, admin panel, customer panel, DB helpers) |
| `README.md` | This documentation file |

---

## 🎨 Design

- **Theme:** Black background with yellow accents
- **Fonts:** Outfit (headings) · Inter (body) — from Google Fonts
- **Icons:** Font Awesome 6
- **Animations:** Floating food sticker background, fade/scale transitions, hover effects

---

## ⚙️ Technical Details

- **Storage:** Browser `localStorage` (keys prefixed `fb_`)
- **Images:** Stored as base64 strings inside `localStorage`
- **No backend / server needed** — fully client-side
- **No frameworks** — vanilla HTML, CSS, and JavaScript only
