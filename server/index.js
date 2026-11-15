const express = require('express');
const cors = require('cors');
const { sequelize, Course } = require('./db');
const { addCourse, removeCourse, moveCourse } = require('./scheduleService');
const initialCourses = require('./initialCourses');

const app = express();
app.use(cors());
app.use(express.json());

let isDbInitialized = false;
async function ensureDbInitialized() {
    if (isDbInitialized) return;
    try {
        await sequelize.sync();
        const count = await Course.count();
        if (count === 0) {
            await Course.bulkCreate(initialCourses);
        }
        isDbInitialized = true;
    } catch (err) {
        console.warn('Database auto-initialization error:', err.message);
    }
}

// Support both /api/health and /health
app.get(['/api/health', '/health'], (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Support both /api/courses and /courses (in case Vercel rewrites strip or retain /api prefix)
app.get(['/api/courses', '/courses'], async (req, res) => {
    try {
        await ensureDbInitialized();
        const courses = await Course.findAll();
        if (courses && courses.length > 0) {
            return res.json(courses);
        }
        return res.json(initialCourses);
    } catch (error) {
        console.warn('Failed to fetch courses from SQLite, falling back to initial courses:', error.message);
        // Fallback ensures courses are always delivered even in read-only serverless environments
        res.json(initialCourses);
    }
});

app.post(['/api/schedule/addCourse', '/schedule/addCourse'], (req, res) => {
    try {
        const { termList, course, schedule } = req.body;
        const updatedSchedule = addCourse(termList, course, schedule);
        res.json({ schedule: updatedSchedule });
    } catch (error) {
        console.log("Error adding course:", error.message);
        res.status(400).json({ error: error.message });
    }
});

app.post(['/api/schedule/removeCourse', '/schedule/removeCourse'], (req, res) => {
    try {
        const { code, schedule } = req.body;
        const updatedSchedule = removeCourse(code, schedule);
        res.json({ schedule: updatedSchedule });
    } catch (error) {
        console.log("Error removing course:", error.message);
        res.status(400).json({ error: error.message });
    }
});

app.post(['/api/schedule/moveCourse', '/schedule/moveCourse'], (req, res) => {
    try {
        const { termList, code, schedule } = req.body;
        const updatedSchedule = moveCourse(termList, code, schedule);
        res.json({ schedule: updatedSchedule });
    } catch (error) {
        console.log("Error moving course:", error.message);
        res.status(400).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    sequelize.authenticate()
        .then(() => {
            app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
        })
        .catch((err) => {
            console.error('Unable to connect to the database:', err);
        });
}

module.exports = app;
