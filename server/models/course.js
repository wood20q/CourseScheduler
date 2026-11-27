const { DataTypes } = require('sequelize');
const { canonicalizeCode, normalizeRequirements } = require('../courseUtils');

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
            beforeValidate: (course) => {
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
        }
    });
};