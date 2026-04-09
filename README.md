# OrganLink — Organ Donation & Transplant Matching System

A comprehensive database-driven web application for managing organ donation, hospital coordination, and patient transplant matching.

## 🗂️ Project Structure

```
Project/
├── sql/
│   ├── task3_schema_and_data.sql   ← Database schema + seed data
│   ├── task4_queries.sql           ← 15 graded SQL queries
│   ├── task5_triggers.sql          ← 2 safety & automation triggers
│   └── task6_transactions.sql      ← Transaction scenarios + conflict demo
├── server/
│   ├── app.js                      ← Express server entry point
│   ├── db.js                       ← MySQL connection pool
│   └── routes/                     ← RESTful API routes
├── public/
│   ├── index.html                  ← Single-page dashboard UI
│   ├── css/style.css               ← Premium dark theme
│   └── js/app.js                   ← Frontend logic
└── README.md
```

## 🚀 Setup Instructions

### Prerequisites
- **MySQL 8.0+** running on `localhost:3306`
- **Node.js 18+** installed

### Step 1: Create the Database
Open MySQL Workbench or command line and run:
```bash
mysql -u root -p < sql/task3_schema_and_data.sql
mysql -u root -p < sql/task5_triggers.sql
```

### Step 2: Install & Run the Server
```bash
cd server
npm install
npm start
```

### Step 3: Open the Application
Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 🧩 Features

| Feature | Description |
|---------|-------------|
| **Command Center** | Live stats dashboard with urgency alerts |
| **Donor Management** | Register donors + search by name/blood/city |
| **Recipient Waitlist** | Register patients, sorted by urgency |
| **Organ Inventory** | Add/track organs with status badges |
| **Consent Portal** | Create/approve/reject consent documents |
| **Smart Matching** | Find compatible organs by blood type + consent |
| **Match & Surgery** | View history + record surgery outcomes |
| **Query Runner** | Execute all 15 Task-4 queries from the UI |
| **Transaction Demo** | Simulates two hospitals claiming the same organ |

## 📋 Task Deliverables

- **Task 3**: `sql/task3_schema_and_data.sql` — 7 tables, 8 indexes, 40+ seed records
- **Task 4**: `sql/task4_queries.sql` — 15 queries (basic → subquery → DML)
- **Task 5**: Triggers in `sql/task5_triggers.sql` + Full Node.js web UI
- **Task 6**: `sql/task6_transactions.sql` — 3 scenarios (commit, rollback, conflict)

## 🔧 MySQL Credentials (configured in `server/db.js`)
- Host: `localhost`
- User: `root`
- Password: `navrunsingh`
- Database: `OrganTransplantDB`
