const { sequelize, Course } = require('./db');
const initialCourses = require('./initialCourses');

async function setup() {
    try {
        await sequelize.sync({ force: true });
        await Course.bulkCreate(initialCourses);
        console.log('Database seeded!');
        return true;
    } catch (error) {
        console.error('Setup failed:', error);
        throw error;
    }
}

if (require.main === module) {
    setup()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = setup;
