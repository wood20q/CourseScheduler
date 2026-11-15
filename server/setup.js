const { sequelize, Course } = require('./db');
const initialCourses = require('./initialCourses');

async function setup() {
    try {
        await sequelize.sync({ force: true });
        await Course.bulkCreate(initialCourses);
        console.log('Database seeded!');
        process.exit(0);
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setup();
