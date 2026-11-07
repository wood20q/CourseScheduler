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
        throw new Error(errData.error)
    }

    const data = await response.json()
    return data.schedule
}