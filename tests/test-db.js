import pool from "../db.js";

async function testDatabaseConnection() {
    try {
        const result = await pool.query("SELECT NOW()");

        console.log("Successfully connected to PostgreSQL!");
        console.log("Database time:", result.rows[0].now);
    } catch (error) {
        console.error("Database connection failed:", error.message);
    } finally {
        await pool.end();
    }
}

await testDatabaseConnection();