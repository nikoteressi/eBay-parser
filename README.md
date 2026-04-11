# eBay Tracker & Notifier

A highly efficient, full-stack Nuxt 3 application designed to monitor eBay searches for new items and monitor price drops on existing listings.

## Features
- **Concurrent Safety**: Employs SQLite WAL mode and a Global Polling Queue (max 2 concurrency) to prevent SQLite lock storms and eBay API rate-limits.
- **Diff & Track**: Updates exist items in-place (avoiding JSON snapshot bloat) and intelligently handles "Grace Period" disappearances.
- **Accurate Costs**: Price alerting calculates the Total Cost (Item Price + Shipping).
- **Notifications**: Built-in Nodemailer (SMTP) and Telegram Bot support, featuring flood control and batched alerts.
- **Encrypted Secrets**: Sensitive keys are encrypted at rest using AES-256-GCM.

## Quick Start (Development)

Requires Node.js 20+.

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Initialize Database**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

3. **Run Dev Server**
   ```bash
   npm run dev
   ```

4. **Testing**
   ```bash
   npm test
   ```

## Docker Deployment (Production)

To run the tracker robustly 24/7 without configuring node environments, use Docker:

```bash
docker-compose up -d --build
```
> Note: The SQLite database file is persisted out-of-container via the `./data` volume bind-mount.

## Configuration Guides

All configuration takes place interactively in the web UI under Settings.

### eBay API Keys
To connect to the eBay API, you need a developer application:
1. Go to [developer.ebay.com](https://developer.ebay.com/).
2. Create an account and generate a Production Keys set.
3. Your Application must have access to the **Browse API**.
4. Input your `Client ID` and `Client Secret` into the Tracker's Settings interface.

### Telegram Setup
To receive notifications to your phone:
1. Message `@BotFather` on Telegram.
2. Command `/newbot` and follow the steps.
3. Save the **Bot Token**.
4. To get your **Chat ID**, message your new bot, then visit `https://api.telegram.org/bot<YourBotToken>/getUpdates` to read the ID.
5. Provide both in the Settings interface.

### Email (SMTP) Setup
1. To use Gmail, you'll need an [App Password](https://myaccount.google.com/apppasswords).
2. Set the host to `smtp.gmail.com` and Port to `587`.
3. Enter your email and the App Password. Wait for connection success.
