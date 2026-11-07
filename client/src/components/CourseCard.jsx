function CourseCard({ code, name, credits, description, onSelectCourse }) {
    return (
        <div className="course">
            <h1 className="name">{name}</h1>
            <h3 className="code">{code}</h3>
            <p className="credits">Credits: {credits}</p>
            <p className="description">{description}</p>
            {/* Will only be there when its in available courses */}
            {onSelectCourse && (
                <button className="addCourse" onClick={() => onSelectCourse({ name:name, code:code, credits:credits, description:description})}>Add Course to Schedule</button>
            )}
        </div>
    )
}

export default CourseCard