const { DataTypes } = require('sequelize');
const {
    canonicalizeCode,
    normalizeRequirements,
    validateCourseRequirements,
    validateCourseBatch
} = require('../courseUtils');

function normalizeCourseInstance(course) {
    if (course.code && typeof course.code === 'string') {
        course.code = canonicalizeCode(course.code);
    }
    if (course.prerequisites !== undefined && course.prerequisites !== null) {
        course.prerequisites = normalizeRequirements(course.prerequisites);
    }
    if (course.corequisites !== undefined && course.corequisites !== null) {
        course.corequisites = normalizeRequirements(course.corequisites);
    }
}

async function validateCourseInstance(course, options, sequelize) {
    if (options && (options.skipValidation || options.batchValidated)) {
        return;
    }

    const CourseModel = sequelize.models.Course;
    const allCourses = CourseModel ? await CourseModel.findAll() : [];
    const existingCourses = course.id ? allCourses.filter(c => c.id !== course.id) : allCourses;
    validateCourseRequirements({
        code: course.code,
        prerequisites: course.prerequisites,
        corequisites: course.corequisites,
        existingCourses,
        batchCodes: options && options.batchCodes ? options.batchCodes : new Set()
    });
}

module.exports = (sequelize) => {
    return sequelize.define('Course', {
        code: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true // Course codes like CS120 should not duplicate
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false
        },
        credits: {
          type: DataTypes.FLOAT,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        prerequisites: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: []
        },
        corequisites: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: []
        }
    }, {
        hooks: {
            beforeValidate: async (course, options) => {
                normalizeCourseInstance(course);
                await validateCourseInstance(course, options, sequelize);
                course._requirementsValidated = true;
            },
            beforeSave: async (course, options) => {
                normalizeCourseInstance(course);
                if (!course._requirementsValidated) {
                    await validateCourseInstance(course, options, sequelize);
                    course._requirementsValidated = true;
                }
            },
            afterSave: (course) => {
                delete course._requirementsValidated;
            },
            beforeBulkCreate: async (courses, options) => {
                for (const course of courses) {
                    normalizeCourseInstance(course);
                }

                if (options && options.skipValidation) {
                    return;
                }

                const CourseModel = sequelize.models.Course;
                const existingCourses = CourseModel ? await CourseModel.findAll() : [];
                validateCourseBatch(courses, existingCourses);
                if (options) {
                    options.batchValidated = true;
                }
            }
        }
    });
};
