const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

// This middleware reads the better-auth cookie from the request
// and verifies the session against the database or decodes the JWT.
const verifySession = async (req, res, next) => {
    try {
        // Parse cookies
        const cookieHeader = req.headers.cookie;
        console.log("verifySession: cookieHeader present?", !!cookieHeader);
        if (!cookieHeader) {
            return res.status(401).json({ error: "Unauthorized: No cookies found" });
        }

        const cookies = Object.fromEntries(
            cookieHeader.split(';').map(c => c.trim().split('='))
        );

        const sessionToken = cookies['better-auth.session_token'] || cookies['__Secure-better-auth.session_token'];
        console.log("verifySession: sessionToken present?", !!sessionToken);
        
        if (!sessionToken) {
            return res.status(401).json({ error: "Unauthorized: Session token missing" });
        }

        const db = req.app.locals.db;
        if (!db) {
            return res.status(500).json({ error: "Internal Server Error: DB not connected" });
        }

        let userId = null;

        // Try to decode as JWT first (since Better Auth jwt plugin is used)
        const decoded = jwt.decode(sessionToken);
        console.log("verifySession: decoded JWT:", decoded);
        
        if (decoded) {
            // Depending on better-auth JWT payload structure, it might be decoded.userId, decoded.user.id, or decoded.id
            userId = decoded.userId || decoded.id || (decoded.session && decoded.session.userId) || (decoded.user && decoded.user.id);
        }

        // If JWT decoding failed or didn't yield a user ID, fallback to database session search
        if (!userId) {
            console.log("verifySession: JWT decode failed or no userId, falling back to DB...");
            const session = await db.collection('session').findOne({ token: sessionToken });
            
            if (!session) {
                console.log("verifySession: DB session not found");
                return res.status(401).json({ error: "Unauthorized: Invalid session" });
            }
            
            // Also verify if the session has expired
            if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
                console.log("verifySession: DB session expired");
                return res.status(401).json({ error: "Unauthorized: Session expired" });
            }
            userId = session.userId;
        }

        console.log("verifySession: Found userId:", userId);

        if (!userId) {
             return res.status(401).json({ error: "Unauthorized: Could not determine user ID from session" });
        }

        // Ensure userId is an ObjectId if it's a string from JWT
        let objectId;
        try {
            objectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
        } catch (e) {
            objectId = userId; // fallback
        }

        // Fetch user details
        const user = await db.collection('user').findOne({ _id: objectId });
        if (!user) {
            console.log("verifySession: User not found in DB for ID:", userId);
            return res.status(401).json({ error: "Unauthorized: User not found" });
        }
        
        if (user.isBlocked) {
            console.log("verifySession: User is blocked");
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
