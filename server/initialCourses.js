const initialCourses = [
    { id: 1, name: "Intro to Python", code: "CS120", credits: 1, description: "Intro to structured and object-oriented programming...", prerequisites: [], corequisites: [] },
    { id: 2, name: "Data Structures and Algorithms", code: "CS220", credits: 1, description: "In-depth study of data structures, complexity, and sorting.", prerequisites: [['CS120']], corequisites: [] },
    { id: 3, name: "Calculus I", code: "MATH101", credits: 1, description: "Fundamentals of limits, derivatives, and integrals.", prerequisites: [], corequisites: [] },
    { id: 4, name: "Creative Writing", code: "ENG200", credits: 0.5, description: "Workshop-style course focusing on original fiction and poetry.", prerequisites: [], corequisites: [] },
    { id: 5, name: "Modern World History", code: "HIST150", credits: 0.5, description: "Survey of global historical events from 1500 to present.", prerequisites: [], corequisites: [] },
    { id: 6, name: "Intro to Biology", code: "BIO105", credits: 1, description: "Concepts of cellular biology, genetics, and evolution.", prerequisites: [], corequisites: [] },
    { id: 7, name: "Digital Photography", code: "ART110", credits: 0.25, description: "Basics of digital camera operation and composition.", prerequisites: [], corequisites: [] },
    { id: 8, name: "General Psychology", code: "PSY101", credits: 0.5, description: "Scientific study of human behavior and cognition.", prerequisites: [], corequisites: [] },
    { id: 9, name: "Microeconomics", code: "ECO201", credits: 0.5, description: "Analysis of individual and firm behavior, supply and demand.", prerequisites: [], corequisites: [] },
    { id: 10, name: "General Physics", code: "PHYS200", credits: 1, description: "Calculus-based mechanics, thermodynamics, and waves.", prerequisites: [], corequisites: [['MATH101']] },
    { id: 11, name: "Music Appreciation", code: "MUS105", credits: 0.25, description: "Exploration of musical forms across cultures and eras.", prerequisites: [], corequisites: [] },
    { id: 12, name: "Database Management Systems", code: "CS310", credits: 1, description: "Principles of database design, SQL, and normalization.", prerequisites: [['CS220']], corequisites: [] },
    { id: 13, name: "Intro to Philosophy", code: "PHIL101", credits: 0.5, description: "Examination of fundamental philosophical questions.", prerequisites: [], corequisites: [] },
    { id: 14, name: "General Chemistry", code: "CHEM110", credits: 1, description: "Study of atomic structure, chemical bonding, and reactions.", prerequisites: [], corequisites: [] },
    { id: 15, name: "Intro to Sociology", code: "SOC101", credits: 0.5, description: "Overview of social structures and human interactions.", prerequisites: [], corequisites: [] },
    { id: 16, name: "Software Engineering", code: "CS350", credits: 1, description: "Methodologies for software design, testing, agile development, and team project management.", prerequisites: [['CS220', 'CS240']], corequisites: [] },
    { id: 17, name: "Linear Algebra", code: "MATH215", credits: 1, description: "Vector spaces, matrices, linear transformations, eigenvalues, and applications.", prerequisites: [['MATH101']], corequisites: [] },
    { id: 18, name: "Public Speaking", code: "COMM101", credits: 0.5, description: "Principles of effective oral communication, speech preparation, and presentation skills.", prerequisites: [], corequisites: [] },
    { id: 19, name: "Cybersecurity Fundamentals", code: "CS240", credits: 1, description: "Core concepts of network security, cryptography, vulnerability assessment, and defense strategies.", prerequisites: [['CS120']], corequisites: [] },
    { id: 20, name: "Environmental Science", code: "ENV101", credits: 0.5, description: "Interdisciplinary study of ecosystems, climate change, biodiversity, and conservation.", prerequisites: [], corequisites: [] }
];

module.exports = initialCourses;
