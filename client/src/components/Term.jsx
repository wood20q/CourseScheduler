import CourseCard from "./CourseCard"

function Term({ termLabel, termList, yearIndex, termIndex, onCourseClick }) {
    const termCredits = termList.reduce((sum, course) => sum + course.credits, 0)
    return (
        <div className="term">
            <div className="termLabel">
                <h2>{termLabel}</h2>
                <p>Credits in Term: {termCredits}</p>
            </div>
            <hr />
            <div className="courseArea">
                {termList.map((course) => (
                    <CourseCard 
                        key={course.code} 
                        name={course.name} 
                        code={course.code} 
                        credits={course.credits} 
                        description={course.description}
                        onClickCourse={(courseData) => onCourseClick ? onCourseClick(courseData, [yearIndex, termIndex]) : undefined}
                    />
                ))}
            </div>
        </div>
    )
}

export default Term