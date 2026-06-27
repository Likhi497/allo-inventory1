# Allo Inventory Reservation System

## Overview

This project is my solution to the **Allo Engineering Take-Home Exercise**.

It implements an inventory reservation system that prevents overselling during the checkout process by temporarily reserving inventory before payment is completed.

When a customer reserves a product, the requested quantity is held for a limited time. If payment succeeds, the reservation is confirmed and inventory is permanently deducted. If payment fails or the reservation expires, the held inventory is released and becomes available again.

---

# Live Demo

**Application**

https://allo-inventory-orpin.vercel.app

---

# Tech Stack

* Next.js 16 (App Router)
* React 19
* TypeScript
* Prisma ORM
* PostgreSQL (Neon)
* Upstash Redis
* Zod
* Tailwind CSS

---

# Features

* Product listing
* Warehouse listing
* Stock management per warehouse
* Inventory reservation
* Reservation confirmation
* Reservation cancellation
* Automatic reservation expiry
* REST API
* Seeded database

---

# Data Model

The application includes the following entities:

* Product
* Warehouse
* Stock

  * Total Quantity
  * Reserved Quantity
* Reservation

  * Pending
  * Confirmed
  * Released
  * Expiry Time

---

# API Endpoints

| Method | Endpoint                        | Description                        |
| ------ | ------------------------------- | ---------------------------------- |
| GET    | `/api/products`                 | List products with available stock |
| GET    | `/api/warehouses`               | List warehouses                    |
| POST   | `/api/reservations`             | Create reservation                 |
| POST   | `/api/reservations/:id/confirm` | Confirm reservation                |
| POST   | `/api/reservations/:id/release` | Release reservation                |
| GET    | `/api/cron/expire-reservations` | Expire old reservations            |

---

# Running Locally

## Clone repository

```bash
git clone <repository-url>
cd allo-inventory
```

## Install dependencies

```bash
npm install
```

## Environment Variables

Create a `.env` file.

```env
DATABASE_URL=<Neon PostgreSQL URL>

UPSTASH_REDIS_REST_URL=<Upstash Redis URL>

UPSTASH_REDIS_REST_TOKEN=<Upstash Redis Token>
```

## Apply database migrations

```bash
npx prisma migrate deploy
```

## Seed database

```bash
node prisma/seed.mjs
```

## Start development server

```bash
npm run dev
```

Application runs on:

```text
http://localhost:3000
```

---

# Reservation Expiry

Reservations include an `expiresAt` timestamp.

A scheduled endpoint:

```text
/api/cron/expire-reservations
```

checks for expired pending reservations.

When a reservation expires:

* Reservation status changes to **Released**
* Reserved quantity is deducted from the warehouse stock
* Inventory becomes available again

This endpoint is intended to be executed by a scheduled job (for example, a Vercel Cron Job) in production.

---

# Concurrency Approach

The most important requirement of this assignment is preventing overselling when multiple users reserve the same inventory simultaneously.

The reservation API ensures that inventory availability is checked before creating a reservation. If insufficient stock is available, the API returns **409 Conflict**.

Redis is used to coordinate reservation operations and reduce the risk of concurrent requests modifying the same inventory simultaneously, while PostgreSQL remains the source of truth for inventory and reservations.

---

# Error Handling

The application returns meaningful HTTP status codes.

* **409 Conflict**

  * Requested inventory is unavailable.

* **410 Gone**

  * Reservation has expired before confirmation.

These errors are displayed in the UI instead of failing silently.

---

# Trade-offs

Due to the limited scope and time available for this assignment:

* Authentication was not implemented.
* Idempotency keys were not implemented.
* Background workers were replaced with a scheduled expiry endpoint.
* Monitoring and logging were kept minimal.

---

# Future Improvements

With more time, I would implement:

* Idempotency support
* Distributed locking improvements
* Authentication
* WebSocket-based live inventory updates
* Automated testing
* Metrics and monitoring
* Retry handling
* Admin dashboard

---

# Deployment

Frontend: Vercel

Database: Neon PostgreSQL

Redis: Upstash Redis

---

# Repository

GitHub:

https://github.com/Likhi497/allo-inventory1

---

# Author

**Likhith J**
