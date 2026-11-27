const express = require('express');
const cors = require('cors');
const { sequelize, Course } = require('./db');
const { addCourse, removeCourse, moveCourse } = require('./scheduleService');
const initialCourses = require('./initialCourses');
const {
    canonicalizeCode,
    isValidCourseCode,
    normalizeRequirements,
    findDependentCourses
} = require('./courseUtils');

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

async function findCourseByIdentifier(identifier) {
    if (!identifier) return null;
    let course = null;
    if (/^\d+$/.test(identifier)) {
        course = await Course.findByPk(Number(identifier));
    }
    if (!course) {
        const canonical = canonicalizeCode(identifier);
        course = await Course.findOne({ where: { code: canonical } });
    }
    return course;
}

app.put(['/api/courses/:id', '/courses/:id'], async (req, res) => {
    try {
        await ensureDbInitialized();
        const course = await findCourseByIdentifier(req.params.id);
        if (!course) {
            return res.status(404).json({ error: `Course not found: ${req.params.id}` });
        }

        const { code, name, credits, description, prerequisites, corequisites } = req.body || {};

        let targetCode = course.code;
        if (code !== undefined) {
            if (typeof code !== 'string' || !isValidCourseCode(code)) {
                return res.status(400).json({ error: 'Course code must be a valid alphanumeric identifier' });
            }
            const canonicalNewCode = canonicalizeCode(code);
            if (canonicalNewCode !== course.code) {
                const existingWithCode = await Course.findOne({ where: { code: canonicalNewCode } });
                if (existingWithCode && existingWithCode.id !== course.id) {
                    return res.status(400).json({ error: `Course with code ${canonicalNewCode} already exists in the catalog` });
                }

                const allCourses = await Course.findAll();
                const dependents = findDependentCourses(course.code, allCourses);
                if (dependents.length > 0) {
                    const dependentCodes = dependents.map(d => d.code);
                    return res.status(409).json({
                        error: `Cannot rename course ${course.code} to ${canonicalNewCode}: referenced as a dependency by ${dependentCodes.join(', ')}`,
                        dependents,
                        dependentCodes,
                        dependentCourses: dependents
                    });
                }

                targetCode = canonicalNewCode;
            }
        }

        let targetName = course.name;
        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({ error: 'Course name cannot be empty' });
            }
            targetName = name.trim();
        }

        let targetCredits = course.credits;
        if (credits !== undefined) {
            const numCredits = Number(credits);
            if (credits === null || isNaN(numCredits) || numCredits < 0 || typeof credits === 'boolean') {
                return res.status(400).json({ error: 'Course credits must be a non-negative number' });
            }
            targetCredits = numCredits;
        }

        let targetDescription = course.description;
        if (description !== undefined) {
            targetDescription = typeof description === 'string' ? description.trim() : (description || '');
        }

        let targetPrereqs = course.prerequisites;
        if (prerequisites !== undefined) {
            try {
                targetPrereqs = normalizeRequirements(prerequisites);
            } catch (err) {
                return res.status(400).json({ error: err.message });
            }
        }

        let targetCoreqs = course.corequisites;
        if (corequisites !== undefined) {
            try {
                targetCoreqs = normalizeRequirements(corequisites);
            } catch (err) {
                return res.status(400).json({ error: err.message });
            }
        }

        course.code = targetCode;
        course.name = targetName;
        course.credits = targetCredits;
        course.description = targetDescription;
        course.prerequisites = targetPrereqs;
        course.corequisites = targetCoreqs;

        await course.save();

        res.json(course);
    } catch (error) {
        console.error('Error updating course:', error.message);
        res.status(400).json({ error: error.message });
    }
});

app.delete(['/api/courses/:id', '/courses/:id'], async (req, res) => {
    try {
        await ensureDbInitialized();
        const course = await findCourseByIdentifier(req.params.id);
        if (!course) {
            return res.status(404).json({ error: `Course not found: ${req.params.id}` });
        }

        const allCourses = await Course.findAll();
        const dependents = findDependentCourses(course.code, allCourses);

        if (dependents.length > 0) {
            const dependentCodes = dependents.map(d => d.code);
            return res.status(409).json({
                error: `Cannot delete course ${course.code}: referenced as a dependency by ${dependentCodes.join(', ')}`,
                dependents,
                dependentCodes,
                dependentCourses: dependents
            });
        }

        await course.destroy();
        return res.status(200).json({
            message: `Course ${course.code} deleted successfully`,
            deletedCourse: course
        });
    } catch (error) {
        console.error('Error deleting course:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get(['/api/courses/:code/dependents', '/courses/:code/dependents'], async (req, res) => {
    try {
        await ensureDbInitialized();
        const course = await findCourseByIdentifier(req.params.code);
        if (!course) {
            return res.status(404).json({ error: `Course not found: ${req.params.code}` });
        }

        const allCourses = await Course.findAll();
        const dependents = findDependentCourses(course.code, allCourses);
        return res.json(dependents);
    } catch (error) {
        console.error('Error fetching course dependents:', error.message);
        return res.status(500).json({ error: error.message });
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
