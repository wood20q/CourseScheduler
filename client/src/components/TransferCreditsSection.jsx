import CourseCard from "./CourseCard";

function TransferCreditsSection({ transferCourses = [], onAddClick, onCourseClick }) {
    const rawTransferCredits = transferCourses.reduce(
        (sum, course) => sum + (Number(course.credits) || 0),
        0
    );
    const totalTransferCredits = Math.round(rawTransferCredits * 100) / 100;

    return (
        <div className="transferSectionBlock">
            <div className="transferSectionHeader">
                <div className="transferSectionInfo">
                    <h1>Pre-College / Transfer Credits</h1>
                    <p>Transfer Credits: {totalTransferCredits}</p>
                </div>
                {transferCourses.length > 0 && (
                    <button 
                        type="button" 
                        className="btn-add-transfer-credit"
                        onClick={onAddClick}
                    >
                        + Add Transfer Credits
                    </button>
                )}
            </div>
            {transferCourses.length === 0 ? (
                <div className="transferEmptyState">
                    <p className="transferEmptyText">
                        No pre-college or transfer credits added yet. Have AP, IB, or dual-enrollment credits?
                    </p>
                    <button 
                        type="button" 
                        className="btn-add-transfer-empty"
                        onClick={onAddClick}
                    >
                        + Add Transfer Credits
                    </button>
                </div>
            ) : (
                <div className="transferCourseGrid">
                    {transferCourses.map((course) => (
                        <CourseCard
                            key={course.code}
                            name={course.name}
                            code={course.code}
                            credits={course.credits}
                            description={course.description}
                            isTransfer={true}
                            institution={course.institution}
                            satisfiesCourse={course.satisfiesCourse}
                            onClickCourse={(courseData) =>
                                onCourseClick ? onCourseClick({ ...course, ...courseData }, 'transfer') : undefined
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default TransferCreditsSection;
