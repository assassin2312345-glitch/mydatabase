const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("./database.db");

// إنشاء الجداول
db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subscriberName TEXT NOT NULL,
            pageType TEXT,
            fullName TEXT,
            address TEXT,
            masterNumber TEXT,
            amount REAL DEFAULT 0
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `);

    // إنشاء المستخدم admin إذا غير موجود
    db.get(
        "SELECT * FROM users WHERE username = ?",
        ["admin"],
        (err, user) => {

            if (!user) {

                db.run(
                    "INSERT INTO users (username, password) VALUES (?, ?)",
                    ["admin", "123456"]
                );

            }

        }
    );

});


// ============================
// تسجيل الدخول
// ============================

app.post("/api/login", (req, res) => {

    const { username, password } = req.body;

    db.get(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [username, password],
        (err, user) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "خطأ في السيرفر"
                });
            }

            if (!user) {
                return res.json({
                    success: false,
                    message: "اسم المستخدم أو كلمة المرور غير صحيحة"
                });
            }

            res.json({
                success: true,
                message: "تم تسجيل الدخول"
            });

        }
    );

});


// ============================
// إضافة مشترك
// ============================

app.post("/api/subscribers", (req, res) => {

    const {
        subscriberName,
        pageType,
        fullName,
        address,
        masterNumber,
        amount
    } = req.body;

    if (!subscriberName) {
        return res.status(400).json({
            message: "اسم المشترك مطلوب"
        });
    }

    db.run(
        `
        INSERT INTO subscribers
        (
            subscriberName,
            pageType,
            fullName,
            address,
            masterNumber,
            amount
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            subscriberName,
            pageType,
            fullName,
            address,
            masterNumber,
            amount || 0
        ],
        function (err) {

            if (err) {
                return res.status(500).json({
                    message: "حدث خطأ أثناء الحفظ"
                });
            }

            res.json({
                message: "تم حفظ المشترك بنجاح ✅",
                id: this.lastID
            });

        }
    );

});


// ============================
// البحث المتقدم
// ============================

app.get("/api/subscribers/search", (req, res) => {

    const q = req.query.q || "";

    db.all(
        `
        SELECT *
        FROM subscribers

        WHERE
            subscriberName LIKE ?
            OR pageType LIKE ?
            OR fullName LIKE ?
            OR address LIKE ?
            OR masterNumber LIKE ?

        ORDER BY id DESC
        `,
        [
            `%${q}%`,
            `%${q}%`,
            `%${q}%`,
            `%${q}%`,
            `%${q}%`
        ],
        (err, rows) => {

            if (err) {
                return res.status(500).json([]);
            }

            res.json(rows);

        }
    );

});


// ============================
// تعديل
// ============================

app.put("/api/subscribers/:id", (req, res) => {

    const id = req.params.id;

    const {
        subscriberName,
        pageType,
        fullName,
        address,
        masterNumber,
        amount
    } = req.body;

    db.run(
        `
        UPDATE subscribers

        SET
            subscriberName = ?,
            pageType = ?,
            fullName = ?,
            address = ?,
            masterNumber = ?,
            amount = ?

        WHERE id = ?
        `,
        [
            subscriberName,
            pageType,
            fullName,
            address,
            masterNumber,
            amount,
            id
        ],
        function (err) {

            if (err) {
                return res.status(500).json({
                    message: "حدث خطأ أثناء التعديل"
                });
            }

            res.json({
                message: "تم تعديل البيانات بنجاح ✅"
            });

        }
    );

});


// ============================
// حذف
// ============================

app.delete("/api/subscribers/:id", (req, res) => {

    const id = req.params.id;

    db.run(
        "DELETE FROM subscribers WHERE id = ?",
        [id],
        function (err) {

            if (err) {
                return res.status(500).json({
                    message: "حدث خطأ أثناء الحذف"
                });
            }

            res.json({
                message: "تم حذف المشترك بنجاح 🗑️"
            });

        }
    );

});


// ============================
// الإحصائيات
// ============================

app.get("/api/stats", (req, res) => {

    db.get(
        `
        SELECT
            COUNT(*) AS total,
            COALESCE(SUM(amount), 0) AS totalAmount
        FROM subscribers
        `,
        (err, stats) => {

            if (err) {
                return res.status(500).json({});
            }

            res.json(stats);

        }
    );

});


// ============================
// تشغيل السيرفر
// ============================

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});