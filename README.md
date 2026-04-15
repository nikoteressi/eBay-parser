# eBay Tracker & Notifier

> **Your Personal, Self-Hosted eBay Deal Hunter**

eBay Parser is a powerful, lightweight, self-hosted service designed to continuously monitor eBay listings. It automatically fetches new items matching your custom search queries and instantly notifies you of great deals, ensuring you never miss an opportunity again.

## ✨ Features

- **Local SQLite Database:** A zero-dependency, lightning-fast database setup that requires no external database servers for extreme portability.
- **Instant Notifications:** Receive immediate alerts via Telegram and Email as soon as new items matching your criteria are found.
- **Zero-Click Diffing:** Instantly see updates without reloading the page, with sophisticated parsing to capture true listing changes and a beautiful interface.

## 🚀 Quick Start (Docker Compose)

The easiest way to get eBay Parser up and running is with Docker Compose.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nikoteressi/ebay-parser.git
   cd ebay-parser
   ```

2. **Configure your environment:**
   Create a `.env` file based on the example:
   ```bash
   cp .env-example .env
   ```
   
   Open `.env` and set your secure keys. You MUST update these defaults for security:
   ```env
   ENCRYPTION_KEY=generate_a_secure_32_character_string
   ADMIN_TOKEN=your_secure_admin_password
   NUXT_PUBLIC_ADMIN_TOKEN=your_secure_admin_password
   ```

3. **Start the application:**
   ```bash
   docker compose up -d
   ```

4. **Access the Web UI:**
   Open your browser and navigate to `http://localhost:3000`.

## 🏗️ Architecture

eBay Parser is built on a modern, decoupled architecture using **Nuxt 3** and **Vue 3** for a blazing-fast, reactive frontend, with a robust backend powered by **SQLite** and **Drizzle ORM**. The data polling service operates independently from the web server using reliable queuing and chron jobs to fetch listings from the eBay Developer Analytics API.

For detailed information into how the system is structured, state management, encryption standards, and the data schema, please refer to our full architecture documentation:

👉 **[Read the Architecture Documentation](docs/ARCHITECTURE.md)**

---

*This repository also includes detailed product specifications. See [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) for deeper insights.*
