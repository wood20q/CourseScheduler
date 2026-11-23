function CourseCard({ code, name, credits, description, isTransfer, institution, satisfiesCourse, onSelectCourse, onClickCourse }) {
    return (
        <div 
            className={`course ${onClickCourse ? 'clickable' : ''}`}
            onClick={onClickCourse ? () => onClickCourse({ name, code, credits, description, isTransfer, institution, satisfiesCourse }) : undefined}
        >
            <div className="courseHeader">
                <h1 className="name">{name}</h1>
                {isTransfer && <span className="transferBadge">Transfer</span>}
            </div>
            <h3 className="code">{code}</h3>
            <p className="credits">Credits: {credits}</p>
            {institution && <p className="institution"><strong>Institution:</strong> {institution}</p>}
            {satisfiesCourse && <p className="satisfiesCourse"><strong>Satisfies:</strong> {satisfiesCourse}</p>}
            <p className="description">{description}</p>
            {/* Will only be there when its in available courses */}
            {onSelectCourse && (
                <button 
                    className="addCourse" 
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectCourse({ name, code, credits, description, isTransfer, institution, satisfiesCourse });
                    }}
                >
                    Add Course to Schedule
                </button>
            )}
        </div>
    )
}

export default CourseCard
