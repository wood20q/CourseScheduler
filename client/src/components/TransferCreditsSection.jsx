import CourseCard from "./CourseCard";
import { calculateCredits } from "../utils/scheduleMigration";

function TransferCreditsSection({ transferCourses = [], onAddClick, onCourseClick }) {
    const totalTransferCredits = calculateCredits(transferCourses);

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
                            course={{ ...course, isTransfer: true }}
                            onClickCourse={(courseData) =>
                                onCourseClick ? onCourseClick(courseData, 'transfer') : undefined
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default TransferCreditsSection;
