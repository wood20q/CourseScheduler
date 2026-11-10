function addCourse(termList, course, oldSchedule) {
    const [yearIndex, termIndex] = termList
    
    // Checks to see if the year is within the possible schedule indexes
    if (yearIndex < 0 || yearIndex >= oldSchedule.length) {
        throw new Error("Year doesn't exist in the schedule")
    }

    // Checks to see if the term is within the possible schedule indexes
    if (termIndex < 0 || termIndex >= oldSchedule[yearIndex].length) {
        throw new Error("Term doesn't exist in the schedule")
    }

    let newSchedule = oldSchedule.map((year) => year.map((term) => [...term]))
    newSchedule[yearIndex][termIndex].push(course)

    return newSchedule
}

function findCourse(code, schedule) {
    for (const [yIndex, year] of schedule.entries()) {
        for (const [tIndex, term] of year.entries()) {
            for (const [cIndex, course] of term.entries()) {
                if (course?.code?.trim().toLowerCase() == code.trim().toLowerCase()) return [yIndex,tIndex, cIndex]
            }
        }
    }
    
    throw new Error("Course not found in schedule")
}

module.exports = { addCourse, findCourse }