# Textile POS System

A strictly typed TypeScript monorepo for a textile retail shop POS system.

## Project Structure

- `client/`: React frontend (Vite, TypeScript, Tailwind CSS, React Query)
- `server/`: Node.js backend (Express, TypeScript, Prisma ORM)

## Getting Started

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Database Setup:**
    - Ensure you have a MySQL server running.
    - Create a `.env` file in the `server/` directory and add your `DATABASE_URL`:
      ```env
      DATABASE_URL="mysql://user:password@localhost:3306/textile_pos"
      ```

3.  **Generate Prisma Client:**
    ```bash
    npm run prisma:generate --workspace=server
    ```

4.  **Run migrations:**
    ```bash
    npm run prisma:migrate --workspace=server
    ```

5.  **Start development mode:**
    ```bash
    npm run dev
    ```
    This will start both the client (`http://localhost:5173`) and server (`http://localhost:5000`) concurrently.

## Tech Stack

- **Backend:** Node.js, Express, TypeScript, Prisma
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, React Query, Lucide React
- **Database:** MySQL
