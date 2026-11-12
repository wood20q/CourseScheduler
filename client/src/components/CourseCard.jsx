function CourseCard({ code, name, credits, description, onSelectCourse, onClickCourse }) {
    return (
        <div 
            className={`course ${onClickCourse ? 'clickable' : ''}`}
            onClick={onClickCourse ? () => onClickCourse({ name, code, credits, description }) : undefined}
        >
            <h1 className="name">{name}</h1>
            <h3 className="code">{code}</h3>
            <p className="credits">Credits: {credits}</p>
            <p className="description">{description}</p>
            {/* Will only be there when its in available courses */}
            {onSelectCourse && (
                <button 
                    className="addCourse" 
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectCourse({ name, code, credits, description });
                    }}
                >
                    Add Course to Schedule
                </button>
            )}
        </div>
    )
}

export default CourseCard