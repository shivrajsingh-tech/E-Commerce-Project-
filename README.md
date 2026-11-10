# E-Commerce Project Monorepo

This repository consists of three distinct applications:

```
PROJECT !/
├── admin/       # Super Admin Dashboard (React + Vite + TailwindCSS)
├── backend/     # REST API (Express.js + MongoDB + JWT)
└── frontend/    # Customer & Seller Storefront (Next.js 16 + TailwindCSS)
```

---

## 🚀 Getting Started

### 1. Backend (`http://localhost:8000`)
```bash
cd backend
npm install
npm run dev           # Runs server with nodemon
npm run seed:roles    # Seed database roles
npm run seed:super    # Seed super admin credentials
```

### 2. Admin Dashboard (`http://localhost:5173`)
```bash
cd admin
npm install
npm run dev           # Starts Vite dev server
npm run build         # Production build
```

### 3. Frontend Storefront (`http://localhost:3000`)
```bash
cd frontend
npm install
npm run dev           # Starts Next.js dev server
npm run build         # Production build
```

---

## ⚙️ Ports & Services
- **Backend API:** `http://localhost:8000/api`
- **Admin App:** `http://localhost:5173`
- **Frontend App:** `http://localhost:3000`
- **MongoDB:** `mongodb://127.0.0.1:27017/ecommerce`
