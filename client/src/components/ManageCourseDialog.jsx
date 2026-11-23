import { useState } from "react";
import { formatLocationKey, parseLocation } from "../utils/scheduleMigration";

function ManageCourseDialog({ 
    course, 
    onClose, 
    onRemove, 
    onMove, 
    onUpdate,
    catalogCourses = [] 
}) {
    const isTransfer = Boolean(course?.isTransfer);

    const initialLocation = course?.currentTerm ? formatLocationKey(course.currentTerm) : "0,0";
    const [targetLocation, setTargetLocation] = useState(initialLocation);
    const parsedCurrent = parseLocation(course?.currentTerm);
    const [selectedYear, setSelectedYear] = useState(
        parsedCurrent.type === "term" ? parsedCurrent.year : 0
    );
    const [selectedTerm, setSelectedTerm] = useState(
        parsedCurrent.type === "term" ? parsedCurrent.term : 0
    );
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    // Inline edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(course?.name || "");
    const [editCredits, setEditCredits] = useState(course?.credits ?? 0);
    const [editInstitution, setEditInstitution] = useState(course?.institution || "");
    const [editSatisfies, setEditSatisfies] = useState(course?.satisfiesCourse || "");
    const [editDescription, setEditDescription] = useState(course?.description || "");
    const [editError, setEditError] = useState("");

    const handleMove = (e) => {
        e.preventDefault();
        if (isTransfer) {
            const loc = targetLocation === "transfer" ? "transfer" : targetLocation.split(",").map(Number);
            onMove(loc, course.code);
        } else {
            onMove([selectedYear, selectedTerm], course.code);
        }
        onClose();
    };

    const handleConfirmRemove = () => {
        onRemove(course.code);
        onClose();
    };

    const handleSaveEdit = (e) => {
        e.preventDefault();
        const trimmedName = editName.trim();
        const numCredits = Number(editCredits);

        if (!trimmedName) {
            setEditError("Title cannot be empty.");
            return;
        }
        if (isNaN(numCredits) || numCredits <= 0) {
            setEditError("Credits must be a positive number.");
            return;
        }

        const rawSatisfies = editSatisfies.trim().toUpperCase();
        const effectiveSatisfies = (!rawSatisfies || rawSatisfies === "NONE" || rawSatisfies.startsWith("NONE /") || rawSatisfies.startsWith("NONE/"))
            ? null
            : rawSatisfies;

        if (onUpdate) {
            onUpdate({
                ...course,
                name: trimmedName,
                credits: numCredits,
                institution: editInstitution.trim(),
                satisfiesCourse: effectiveSatisfies,
                description: editDescription.trim()
            });
        }
        setIsEditing(false);
        onClose();
    };

    const formatCurrentLocation = () => {
        const parsed = parseLocation(course?.currentTerm);
        if (parsed.type === "transfer") {
            return "Pre-College / Transfer Credits";
        }
        return `Year ${parsed.year + 1}, Term ${parsed.term + 1}`;
    };

    return (
        <div className="dialogOverlay" onClick={onClose}>
            <div className="dialogWrapper" onClick={(e) => e.stopPropagation()}>
                <div className="dialogHeaderRow">
                    <h2>Course Details</h2>
                    {isTransfer && !isEditing && (
                        <button
                            type="button"
                            className="btn-edit-details"
                            onClick={() => setIsEditing(true)}
                        >
                            Edit Details
                        </button>
                    )}
                </div>

                {!isEditing ? (
                    <div className="dialogCourseInfo">
                        <div className="dialogCourseTitleRow">
                            <p className="dialogCourseName">
                                <strong>{course.code}:</strong> {course.name}
                            </p>
                            {isTransfer && <span className="transferBadge">Transfer</span>}
                        </div>
                        <p className="dialogCourseCredits">
                            <strong>Credits:</strong> {course.credits}
                        </p>
                        <p className="dialogCourseCurrentTerm">
                            <strong>Current Location:</strong> {formatCurrentLocation()}
                        </p>
                        {isTransfer && (
                            <>
                                <p className="dialogCourseInstitution">
                                    <strong>Institution:</strong> {course.institution || "None"}
                                </p>
                                <p className="dialogCourseSatisfies">
                                    <strong>Satisfies:</strong> {course.satisfiesCourse || "None / General Elective"}
                                </p>
                            </>
                        )}
                        <p className="dialogCourseDescription">
                            <strong>Description:</strong> {course.description || "None"}
                        </p>
                    </div>
                ) : (
                    <form className="inlineEditForm" onSubmit={handleSaveEdit}>
                        {editError && (
                            <div className="formErrorBox">
                                <p>{editError}</p>
                            </div>
                        )}
                        <div className="formGroup">
                            <label htmlFor="edit-name">Edit Title:</label>
                            <input
                                id="edit-name"
                                aria-label="Edit Title"
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="formGroup">
                            <label htmlFor="edit-credits">Edit Credits:</label>
                            <input
                                id="edit-credits"
                                aria-label="Edit Credits"
                                type="number"
                                min="0.25"
                                step="0.25"
                                value={editCredits}
                                onChange={(e) => setEditCredits(e.target.value)}
                                required
                            />
                        </div>
                        <div className="formGroup">
                            <label htmlFor="edit-institution">Edit Institution:</label>
                            <input
                                id="edit-institution"
                                aria-label="Edit Institution"
                                type="text"
                                value={editInstitution}
                                onChange={(e) => setEditInstitution(e.target.value)}
                            />
                        </div>
                        <div className="formGroup">
                            <label htmlFor="edit-satisfies">Edit Satisfies Course:</label>
                            <input
                                id="edit-satisfies"
                                aria-label="Edit Satisfies Course"
                                list="edit-satisfies-options"
                                type="text"
                                placeholder="Catalog course code or leave blank"
                                value={editSatisfies}
                                onChange={(e) => setEditSatisfies(e.target.value)}
                            />
                            <datalist id="edit-satisfies-options">
                                {catalogCourses.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.code} - {c.name}
                                    </option>
                                ))}
                            </datalist>
                        </div>
                        <div className="formGroup">
                            <label htmlFor="edit-description">Edit Description:</label>
                            <textarea
                                id="edit-description"
                                aria-label="Edit Description"
                                rows={2}
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                            />
                        </div>
                        <div className="formGroup buttons">
                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setIsEditing(false)}
                            >
                                Cancel Edit
                            </button>
                            <button type="submit" className="btn-submit">
                                Save Changes
                            </button>
                        </div>
                    </form>
                )}

                <hr className="dialogDivider" />

                <form onSubmit={handleMove}>
                    <h3 className="dialogSubheading">Move Course</h3>
                    {isTransfer ? (
                        <div className="formGroup">
                            <label htmlFor="move-location-select">Target Location:</label>
                            <select
                                id="move-location-select"
                                aria-label="Target Location:"
                                value={targetLocation}
                                onChange={(e) => setTargetLocation(e.target.value)}
                            >
                                <option value="transfer">Pre-College / Transfer Credits</option>
                                <optgroup label="Academic Years">
                                    <option value="0,0">Year 1 Term 1</option>
                                    <option value="0,1">Year 1 Term 2</option>
                                    <option value="0,2">Year 1 Term 3</option>
                                    <option value="1,0">Year 2 Term 1</option>
                                    <option value="1,1">Year 2 Term 2</option>
                                    <option value="1,2">Year 2 Term 3</option>
                                    <option value="2,0">Year 3 Term 1</option>
                                    <option value="2,1">Year 3 Term 2</option>
                                    <option value="2,2">Year 3 Term 3</option>
                                    <option value="3,0">Year 4 Term 1</option>
                                    <option value="3,1">Year 4 Term 2</option>
                                    <option value="3,2">Year 4 Term 3</option>
                                </optgroup>
                            </select>
                        </div>
                    ) : (
                        <>
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
                        </>
                    )}

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
                                    Yes, Remove Course
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
