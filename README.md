# SkillSwap - Server

## Purpose
The backend REST API for the SkillSwap freelance marketplace. It manages users, tasks, proposals, and reviews, acting as the secure bridge between the Next.js frontend and the MongoDB database.

## Live Website Link
**[TaskHive Live Site](https://taskhive-eight-phi.vercel.app)** *(Replace with your actual Vercel link when deployed)*

## Key Features
- **Secure Authentication Middleware**: Reads Better Auth HTTPOnly cookies to verify sessions and user roles (Client, Freelancer, Admin).
- **CRUD Operations**: Comprehensive endpoints for tasks, proposals, and user profile management.
- **Server-Side Pagination & Filtering**: Handles advanced queries to fetch a maximum of 9 tasks per page based on search parameters.
- **Security**: Admins can block users, and the middleware will instantly reject any incoming requests from a blocked account with a `403 Forbidden`.

## NPM Packages Used
- `express`: ^4.21.2
- `mongodb`: ^6.13.1
- `cors`: ^2.8.5
- `dotenv`: ^16.4.7

## Getting Started
1. `npm install`
2. Configure `.env` with `MONGODB_URI`, `PORT`, and `CLIENT_URL`.
3. `node index.js`
