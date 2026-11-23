function CourseCard({ 
    course,
    code: propCode, 
    name: propName, 
    credits: propCredits, 
    description: propDescription, 
    isTransfer: propIsTransfer, 
    institution: propInstitution, 
    satisfiesCourse: propSatisfiesCourse, 
    onSelectCourse, 
    onClickCourse 
}) {
    const code = course?.code ?? propCode;
    const name = course?.name ?? propName;
    const credits = course?.credits ?? propCredits;
    const description = course?.description ?? propDescription;
    const isTransfer = course?.isTransfer ?? propIsTransfer;
    const institution = course?.institution ?? propInstitution;
    const satisfiesCourse = course?.satisfiesCourse ?? propSatisfiesCourse;

    const courseObj = course || { name, code, credits, description, isTransfer, institution, satisfiesCourse };

    return (
        <div 
            className={`course ${onClickCourse ? 'clickable' : ''}`}
            onClick={onClickCourse ? () => onClickCourse(courseObj) : undefined}
        >
            <div className="courseHeader">
                <h1 className="name">{name}</h1>
                {isTransfer && <span className="transferBadge">Transfer</span>}
            </div>
            <h3 className="code">{code}</h3>
            <p className="credits">Credits: {credits}</p>
            {satisfiesCourse && <p className="satisfiesCourse"><strong>Satisfies:</strong> {satisfiesCourse}</p>}
            <p className="description">{description}</p>
            {/* Will only be there when its in available courses */}
            {onSelectCourse && (
                <button 
                    className="addCourse" 
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectCourse(courseObj);
                    }}
                >
                    Add Course to Schedule
                </button>
            )}
        </div>
    )
}

export default CourseCard
