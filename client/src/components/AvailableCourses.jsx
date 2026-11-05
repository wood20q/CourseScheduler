import CourseCard from "./CourseCard"

function AvailableCourses({ courseList, handleAddCourse }) {
    return (
        <>
            <form id="searchForm">
                <input id="searchBox" type="text" />
                <button type="submit">Search</button>
            </form>
            <div className="coursesList">
                {courseList.map((course) => (
                    <CourseCard key={course.code} handleAddCourse={handleAddCourse} name={course.name} code={course.code} credits={course.credits} description={course.description}/>
                ))}
            </div>
        </>
    )
}

export default AvailableCourses