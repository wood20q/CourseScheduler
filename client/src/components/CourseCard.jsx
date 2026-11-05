function CourseCard({ code, name, credits, description, handleAddCourse }) {
    return (
        <div className="course">
            <h1 className="name">{name}</h1>
            <h3 className="code">{code}</h3>
            <p className="credits">Credits: {credits}</p>
            <p className="description">{description}</p>
            <button className="addCourse" onClick={() => handleAddCourse([0,0], { name:name, code:code, credits:credits, description:description})}>Add Course to Schedule</button>
        </div>
    )
}

export default CourseCard