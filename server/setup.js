const { sequelize, Course } = require('./db');

const initialCourses = [
    { name: "Intro to Python", code: "CS120", credits: 1, description: "Intro to structured and object-oriented programming..." },
    { name: "Data Structures and Algorithms", code: "CS220", credits: 1, description: "In-depth study of data structures, complexity, and sorting." },
    { name: "Calculus I", code: "MATH101", credits: 1, description: "Fundamentals of limits, derivatives, and integrals." },
    { name: "Creative Writing", code: "ENG200", credits: 0.5, description: "Workshop-style course focusing on original fiction and poetry." },
    { name: "Modern World History", code: "HIST150", credits: 0.5, description: "Survey of global historical events from 1500 to present." },
    { name: "Intro to Biology", code: "BIO105", credits: 1, description: "Concepts of cellular biology, genetics, and evolution." },
    { name: "Digital Photography", code: "ART110", credits: 0.25, description: "Basics of digital camera operation and composition." },
    { name: "General Psychology", code: "PSY101", credits: 0.5, description: "Scientific study of human behavior and cognition." },
    { name: "Microeconomics", code: "ECO201", credits: 0.5, description: "Analysis of individual and firm behavior, supply and demand." },
    { name: "General Physics", code: "PHYS200", credits: 1, description: "Calculus-based mechanics, thermodynamics, and waves." },
    { name: "Music Appreciation", code: "MUS105", credits: 0.25, description: "Exploration of musical forms across cultures and eras." },
    { name: "Database Management Systems", code: "CS310", credits: 1, description: "Principles of database design, SQL, and normalization." },
    { name: "Intro to Philosophy", code: "PHIL101", credits: 0.5, description: "Examination of fundamental philosophical questions." },
    { name: "General Chemistry", code: "CHEM110", credits: 1, description: "Study of atomic structure, chemical bonding, and reactions." },
    { name: "Intro to Sociology", code: "SOC101", credits: 0.5, description: "Overview of social structures and human interactions." }
];

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