const express = require('express');
const cors = require('cors');
const { sequelize, Course } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/courses', async (req, res) => {
    const courses = await Course.findAll();
    res.json(courses);
});

sequelize.authenticate().then(() => {
    app.listen(3000, () => console.log('Server running on port 3000'));
});