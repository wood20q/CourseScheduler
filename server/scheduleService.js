function addCourse(termList, course, oldSchedule) {
    const isObjectSchema = !Array.isArray(oldSchedule) && oldSchedule && Array.isArray(oldSchedule.years);

    if (isObjectSchema) {
        let newSchedule = {
            transferCourses: [...(oldSchedule.transferCourses || [])],
            years: oldSchedule.years.map((year) => year.map((term) => [...term]))
        };

        if (termList === 'transfer' || (Array.isArray(termList) && termList[0] === -1)) {
            newSchedule.transferCourses.push(course);
            return newSchedule;
        }

        const [yearIndex, termIndex] = termList;
        if (yearIndex < 0 || yearIndex >= newSchedule.years.length) {
            throw new Error("Year doesn't exist in the schedule");
        }
        if (termIndex < 0 || termIndex >= newSchedule.years[yearIndex].length) {
            throw new Error("Term doesn't exist in the schedule");
        }
        newSchedule.years[yearIndex][termIndex].push(course);
        return newSchedule;
    }

    const [yearIndex, termIndex] = termList;
    
    // Checks to see if the year is within the possible schedule indexes
    if (yearIndex < 0 || yearIndex >= oldSchedule.length) {
        throw new Error("Year doesn't exist in the schedule");
    }

    // Checks to see if the term is within the possible schedule indexes
    if (termIndex < 0 || termIndex >= oldSchedule[yearIndex].length) {
        throw new Error("Term doesn't exist in the schedule");
    }

    let newSchedule = oldSchedule.map((year) => year.map((term) => [...term]));
    newSchedule[yearIndex][termIndex].push(course);

    return newSchedule;
}

function findCourse(code, schedule) {
    const cleanCode = code?.trim().toLowerCase();
    const isObjectSchema = !Array.isArray(schedule) && schedule && Array.isArray(schedule.years);

    if (isObjectSchema) {
        if (Array.isArray(schedule.transferCourses)) {
            for (const [cIndex, course] of schedule.transferCourses.entries()) {
                if (course?.code?.trim().toLowerCase() === cleanCode) {
                    return ['transfer', cIndex];
                }
            }
        }
        for (const [yIndex, year] of schedule.years.entries()) {
            for (const [tIndex, term] of year.entries()) {
                for (const [cIndex, course] of term.entries()) {
                    if (course?.code?.trim().toLowerCase() === cleanCode) {
                        return [yIndex, tIndex, cIndex];
                    }
                }
            }
        }
        throw new Error("Course not found in schedule");
    }

    for (const [yIndex, year] of schedule.entries()) {
        for (const [tIndex, term] of year.entries()) {
            for (const [cIndex, course] of term.entries()) {
                if (course?.code?.trim().toLowerCase() === cleanCode) {
                    return [yIndex, tIndex, cIndex];
                }
            }
        }
    }
    
    throw new Error("Course not found in schedule");
}

function removeCourse(code, schedule) {
    const isObjectSchema = !Array.isArray(schedule) && schedule && Array.isArray(schedule.years);
    const location = findCourse(code, schedule);

    if (isObjectSchema) {
        let newSchedule = {
            transferCourses: [...(schedule.transferCourses || [])],
            years: schedule.years.map((year) => year.map((term) => [...term]))
        };

        if (location[0] === 'transfer') {
            const [, cIndex] = location;
            newSchedule.transferCourses.splice(cIndex, 1);
            return newSchedule;
        }

        const [yIndex, tIndex, cIndex] = location;
        newSchedule.years[yIndex][tIndex].splice(cIndex, 1);
        return newSchedule;
    }

    const [yIndex, tIndex, cIndex] = location;
    let newSchedule = schedule.map((year) => year.map((term) => [...term]));
    newSchedule[yIndex][tIndex].splice(cIndex, 1);
    return newSchedule;
}

function moveCourse(termList, code, schedule) {
    const isObjectSchema = !Array.isArray(schedule) && schedule && Array.isArray(schedule.years);
    const location = findCourse(code, schedule);
    let course;

    if (isObjectSchema) {
        if (location[0] === 'transfer') {
            course = schedule.transferCourses[location[1]];
        } else {
            const [yIndex, tIndex, cIndex] = location;
            course = schedule.years[yIndex][tIndex][cIndex];
        }
        const scheduleWithoutCourse = removeCourse(code, schedule);
        return addCourse(termList, course, scheduleWithoutCourse);
    }

    const [yIndex, tIndex, cIndex] = location;
    course = schedule[yIndex][tIndex][cIndex];
    const scheduleWithoutCourse = removeCourse(code, schedule);
    return addCourse(termList, course, scheduleWithoutCourse);
}

module.exports = { addCourse, findCourse, removeCourse, moveCourse };
