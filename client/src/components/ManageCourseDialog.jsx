import { useState } from "react";

function ManageCourseDialog({ course, onClose, onRemove, onMove }) {
    const initialYear = course.currentTerm ? course.currentTerm[0] : 0;
    const initialTerm = course.currentTerm ? course.currentTerm[1] : 0;
    const [selectedYear, setSelectedYear] = useState(initialYear);
    const [selectedTerm, setSelectedTerm] = useState(initialTerm);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const handleMove = (e) => {
        e.preventDefault();
        onMove([selectedYear, selectedTerm], course.code);
        onClose();
    };

    const handleConfirmRemove = () => {
        onRemove(course.code);
        onClose();
    };

    return (
        <div className="dialogOverlay" onClick={onClose}>
            <div className="dialogWrapper" onClick={(e) => e.stopPropagation()}>
                <h2>Course Details</h2>
                
                <div className="dialogCourseInfo">
                    <p className="dialogCourseName"><strong>{course.code}:</strong> {course.name}</p>
                    <p className="dialogCourseCredits"><strong>Credits:</strong> {course.credits}</p>
                    {course.currentTerm && (
                        <p className="dialogCourseCurrentTerm"><strong>Current Location:</strong> Year {course.currentTerm[0] + 1}, Term {course.currentTerm[1] + 1}</p>
                    )}
                    <p className="dialogCourseDescription"><strong>Description:</strong> {course.description}</p>
                </div>

                <hr className="dialogDivider" />

                <form onSubmit={handleMove}>
                    <h3 className="dialogSubheading">Move Course</h3>
                    <div className="formGroup" id="yearWrapper">
                        <label htmlFor="move-year-select">Target Year:</label>
                        <select 
                            name="move-year-select" 
                            id="move-year-select" 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            <option value={0}>Year 1</option>
                            <option value={1}>Year 2</option>
                            <option value={2}>Year 3</option>
                            <option value={3}>Year 4</option>
                        </select>
                    </div>
                    <div className="formGroup" id="termWrapper">
                        <label htmlFor="move-term-select">Target Term:</label>
                        <select 
                            name="move-term-select" 
                            id="move-term-select" 
                            value={selectedTerm} 
                            onChange={(e) => setSelectedTerm(Number(e.target.value))}
                        >
                            <option value={0}>Term 1</option>
                            <option value={1}>Term 2</option>
                            <option value={2}>Term 3</option>
                        </select>
                    </div>

                    <div className="formGroup">
                        <button type="submit" className="btn-submit">Move Course</button>
                    </div>
                </form>

                <hr className="dialogDivider" />

                <div className="dialogDangerZone">
                    {!isConfirmingDelete ? (
                        <button 
                            type="button" 
                            className="btn-danger" 
                            onClick={() => setIsConfirmingDelete(true)}
                        >
                            Remove Course from Schedule
                        </button>
                    ) : (
                        <div className="deleteConfirmBox">
                            <p className="deleteConfirmWarning">
                                Are you sure you want to remove <strong>{course.code}</strong> from your schedule?
                            </p>
                            <div className="deleteConfirmButtons">
                                <button 
                                    type="button" 
                                    className="btn-confirm-delete" 
                                    onClick={handleConfirmRemove}
                                >
                                    Yes, Remove
                                </button>
                                <button 
                                    type="button" 
                                    className="btn-cancel-delete" 
                                    onClick={() => setIsConfirmingDelete(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="formGroup buttons">
                    <button type="button" className="btn-close" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

export default ManageCourseDialog;
