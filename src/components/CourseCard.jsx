function CourseCard({ code, name, credits, description }) {
    return (
        <div className="course">
            <h1 className="name">{name}</h1>
            <h3 className="code">{code}</h3>
            <p className="credits">Credits: {credits}</p>
            <p className="description">{description}</p>
        </div>
    )
}

export default CourseCard