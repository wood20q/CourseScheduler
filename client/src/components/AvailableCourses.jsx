import { useState } from "react"
import CourseCard from "./CourseCard"

function AvailableCourses({ courseList, onSelectCourse }) {
    const [searchTerm, setSearchTerm] = useState('')

    const filterCourses = courseList.filter((course) => {
        const term = searchTerm.toLowerCase().trim()
        return course.code.toLowerCase().includes(term) || course.name.toLowerCase().includes(term)
    })

    return (
        <>
            <form id="searchForm" onSubmit={(e) => e.preventDefault()}>
                <input 
                    id="searchBox"
                    type="text"
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button type="button" onClick={() => setSearchTerm('')}>Clear</button>
                )}
            </form>
            <div className="coursesList">
                {filterCourses.length > 0 ? (
                    filterCourses.map((course) => (
                        <CourseCard 
                            key={course.code} 
                            onSelectCourse={onSelectCourse} 
                            name={course.name} 
                            code={course.code} 
                            credits={course.credits} 
                            description={course.description}
                        />
                    ))
                ) : (
                    <p className="noCoursesFound">No courses match "{searchTerm}"</p>
                )}
            </div>
        </>
    )
}

export default AvailableCourses