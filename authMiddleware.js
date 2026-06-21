const { MongoClient } = require('mongodb');

// This middleware reads the better-auth cookie from the request
// and verifies the session against the database.
const verifySession = async (req, res, next) => {
    try {
        // Parse cookies
        const cookieHeader = req.headers.cookie;
        if (!cookieHeader) {
            return res.status(401).json({ error: "Unauthorized: No cookies found" });
        }

        const cookies = Object.fromEntries(
            cookieHeader.split(';').map(c => c.trim().split('='))
        );

        const sessionToken = cookies['better-auth.session_token'] || cookies['__Secure-better-auth.session_token'];
        
        if (!sessionToken) {
            return res.status(401).json({ error: "Unauthorized: Session token missing" });
        }

        // We can connect to MongoDB here or use the existing client.
        // It's better to pass the db instance in the middleware if possible, 
        // but for simplicity we'll assume req.app.locals.db is set in index.js
        const db = req.app.locals.db;
        if (!db) {
            return res.status(500).json({ error: "Internal Server Error: DB not connected" });
        }

        const session = await db.collection('session').findOne({ token: sessionToken });
        
        if (!session) {
            return res.status(401).json({ error: "Unauthorized: Invalid session" });
        }
        
        // Also verify if the session has expired
        if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
            return res.status(401).json({ error: "Unauthorized: Session expired" });
        }

        // Fetch user details
        const user = await db.collection('user').findOne({ id: session.userId });
        if (!user) {
            return res.status(401).json({ error: "Unauthorized: User not found" });
        }
        
        if (user.isBlocked) {
            return res.status(403).json({ error: "Forbidden: Your account has been blocked" });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        
        if (req.user.role?.toLowerCase() !== role.toLowerCase()) {
            return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        }
        next();
    };
};

module.exports = { verifySession, requireRole };
