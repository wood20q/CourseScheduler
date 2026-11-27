const express = require('express');
const cors = require('cors');
const { sequelize, Course } = require('./db');
const { addCourse, removeCourse, moveCourse } = require('./scheduleService');
const initialCourses = require('./initialCourses');
const { canonicalizeCode, isValidCourseCode, normalizeRequirements } = require('./courseUtils');

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
        const rawList = (courses && courses.length > 0) ? courses : initialCourses;
        const standardized = rawList.map(c => {
            const plain = (c && typeof c.toJSON === 'function') ? c.toJSON() : { ...c };
            return {
                ...plain,
                code: canonicalizeCode(plain.code),
                prerequisites: normalizeRequirements(plain.prerequisites),
                corequisites: normalizeRequirements(plain.corequisites)
            };
        });
        return res.json(standardized);
    } catch (error) {
        console.warn('Failed to fetch courses from SQLite, falling back to initial courses:', error.message);
        // Fallback ensures courses are always delivered even in read-only serverless environments
        const standardized = initialCourses.map(c => ({
            ...c,
            code: canonicalizeCode(c.code),
            prerequisites: normalizeRequirements(c.prerequisites),
            corequisites: normalizeRequirements(c.corequisites)
        }));
        res.json(standardized);
    }
});

app.post(['/api/courses', '/courses'], async (req, res) => {
    try {
        await ensureDbInitialized();
        const { code, name, credits, description, prerequisites, corequisites } = req.body || {};

        if (!code || typeof code !== 'string' || !isValidCourseCode(code)) {
            return res.status(400).json({ error: 'Course code is required and must be a valid alphanumeric identifier' });
        }

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Course name is required and cannot be empty' });
        }

        const numCredits = Number(credits);
        if (credits === undefined || credits === null || isNaN(numCredits) || numCredits < 0 || typeof credits === 'boolean') {
            return res.status(400).json({ error: 'Course credits must be a non-negative number' });
        }

        let normalizedPrereqs;
        try {
            normalizedPrereqs = normalizeRequirements(prerequisites);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }

        let normalizedCoreqs;
        try {
            normalizedCoreqs = normalizeRequirements(corequisites);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }

        const canonicalCode = canonicalizeCode(code);

        const existing = await Course.findOne({ where: { code: canonicalCode } });
        if (existing) {
            return res.status(400).json({ error: `Course with code ${canonicalCode} already exists in the catalog` });
        }

        const newCourse = await Course.create({
            code: canonicalCode,
            name: name.trim(),
            credits: numCredits,
            description: typeof description === 'string' ? description.trim() : (description || ''),
            prerequisites: normalizedPrereqs,
            corequisites: normalizedCoreqs
        });

        res.status(201).json(newCourse);
    } catch (error) {
        console.error('Error creating course:', error.message);
        res.status(400).json({ error: error.message });
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
