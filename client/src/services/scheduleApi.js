const API_BASE_URL = 'http://localhost:3000/api'

// Fetching all courses
export async function fetchCourses() {
    const response = await fetch(`${API_BASE_URL}/courses`)
    if (!response.ok) throw new Error('Failed to load Courses');
    return response.json()
}

export async function addCourseToSchedule(termList, course, schedule) {
    const response = await fetch(`${API_BASE_URL}/schedule/addCourse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termList, course, schedule })
    })

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add course')
    }

    const data = await response.json()
    return data.schedule
}

export async function removeCourseFromSchedule(code, schedule) {
    const response = await fetch(`${API_BASE_URL}/schedule/removeCourse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, schedule })
    })

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove course')
    }

    const data = await response.json()
    return data.schedule
}

export async function moveCourseInSchedule(termList, code, schedule) {
    const response = await fetch(`${API_BASE_URL}/schedule/moveCourse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termList, code, schedule })
    })

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to move course')
    }

    const data = await response.json()
    return data.schedule
}