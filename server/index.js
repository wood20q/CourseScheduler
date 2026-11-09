const express = require('express');
const cors = require('cors');
const { sequelize, Course } = require('./db');
const { addCourse } = require('./scheduleService');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/courses', async (req, res) => {
    try {
        const courses = await Course.findAll();
        res.json(courses);
    } catch (error) {
        console.error('Failed to fetch courses:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

app.post('/api/schedule/addCourse', (req, res) => {
    try {
        const {termList, course, schedule} = req.body
        const updatedSchedule = addCourse(termList, course, schedule)
        res.json({schedule: updatedSchedule})
    } catch (error) {
        console.log("Error adding course:", error.message)
        res.status(400).json({error: error.message})
    }
})

sequelize.authenticate()
    .then(() => {
        app.listen(3000, () => console.log('Server running on port 3000'));
    })
    .catch((err) => {
        console.error('Unable to connect to the database:', err);
    });