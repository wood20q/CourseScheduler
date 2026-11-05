import CourseCard from "./CourseCard"

function Term({ termLabel, termList }) {
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
                    <CourseCard key={course.code} name={course.name} code={course.code} credits={course.credits} description={course.description}/>
                ))}
            </div>
        </div>
    )
}

export default Term