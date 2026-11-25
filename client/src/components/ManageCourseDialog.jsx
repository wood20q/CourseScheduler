import { useState, useMemo } from "react";
import { formatLocationKey, parseLocation } from "../utils/scheduleMigration";
import { 
    validateSchedule, 
    simulateScheduleMutation 
} from "../utils/requirementEngine";

function formatCurrentLocation(currentTerm) {
    const parsed = parseLocation(currentTerm);
    if (parsed.type === "transfer") {
        return "Pre-College / Transfer Credits";
    }
    return `Year ${parsed.year + 1}, Term ${parsed.term + 1}`;
}

function ManageCourseDialog({ 
    course, 
    schedule,
    catalogCourses = [],
    onClose, 
    onRemove, 
    onMove, 
    onUpdate,
    onToggleWaiver
}) {
    const isTransfer = Boolean(course?.isTransfer);

    // Live course state derived from schedule so mutations reflect instantly
    const liveCourse = useMemo(() => {
        if (!schedule || !course?.code) return course;
        const clean = course.code.trim().toUpperCase();
        const fromTransfer = (schedule.transferCourses || []).find(
            c => c.code?.trim().toUpperCase() === clean
        );
        if (fromTransfer) return { ...fromTransfer, currentTerm: course.currentTerm };
        for (let y = 0; y < (schedule.years || []).length; y++) {
            for (let t = 0; t < schedule.years[y].length; t++) {
                const found = schedule.years[y][t].find(
                    c => c.code?.trim().toUpperCase() === clean
                );
                if (found) return { ...found, currentTerm: course.currentTerm };
            }
        }
        return course;
    }, [schedule, course]);

    // Compute real-time validation diagnostic for this course
    const courseValidation = useMemo(() => {
        if (!schedule || !liveCourse) return null;
        const res = validateSchedule(schedule, catalogCourses);
        return res.diagnostics.find(
            d => d.courseCode?.trim().toUpperCase() === liveCourse.code?.trim().toUpperCase()
        ) || null;
    }, [schedule, liveCourse, catalogCourses]);

    // Move course location state
    const initialLocation = liveCourse?.currentTerm ? formatLocationKey(liveCourse.currentTerm) : "0,0";
    const [targetLocation, setTargetLocation] = useState(initialLocation);
    const parsedCurrent = parseLocation(liveCourse?.currentTerm);
    const [selectedYear, setSelectedYear] = useState(
        parsedCurrent.type === "term" ? parsedCurrent.year : 0
    );
    const [selectedTerm, setSelectedTerm] = useState(
        parsedCurrent.type === "term" ? parsedCurrent.term : 0
    );

    // Downstream conflict acknowledgment & delete confirmation
    const [impactAck, setImpactAck] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    // Inline edit state for transfer courses
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(course?.name || "");
    const [editCredits, setEditCredits] = useState(course?.credits ?? 0);
    const [editInstitution, setEditInstitution] = useState(course?.institution || "");
    const [editSatisfies, setEditSatisfies] = useState(course?.satisfiesCourse || "");
    const [editDescription, setEditDescription] = useState(course?.description || "");
    const [editError, setEditError] = useState("");

    const effectiveTarget = isTransfer
        ? (targetLocation === "transfer" ? "transfer" : targetLocation.split(",").map(Number))
        : [selectedYear, selectedTerm];

    // Live downstream simulation for move
    const moveSimulation = useMemo(() => {
        return simulateScheduleMutation(schedule, liveCourse?.code, "move", effectiveTarget, catalogCourses);
    }, [schedule, liveCourse?.code, effectiveTarget, catalogCourses]);

    // Live downstream simulation for remove
    const removeSimulation = useMemo(() => {
        return simulateScheduleMutation(schedule, liveCourse?.code, "remove", null, catalogCourses);
    }, [schedule, liveCourse?.code, catalogCourses]);

    const isSatisfied = courseValidation?.overallStatus === "SATISFIED";
    const isWaived = !isSatisfied && Boolean(liveCourse?.isWaived);
    const isUnsatisfied = !isSatisfied && !isWaived;

    const missingText = (courseValidation?.missingSummary && 
                         courseValidation.missingSummary !== "Waived by override" && 
                         courseValidation.missingSummary !== "All requirements satisfied")
        ? courseValidation.missingSummary
        : (courseValidation?.unfulfilledSummary || "");

    const handleMoveSubmit = (e) => {
        e.preventDefault();
        if (moveSimulation.hasDownstreamImpact && !impactAck) return;
        onMove(effectiveTarget, liveCourse.code);
        onClose();
    };

    const handleConfirmRemove = () => {
        onRemove(liveCourse.code);
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
                ...liveCourse,
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

    return (
        <div className="dialogOverlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="dialogWrapper" onClick={(e) => e.stopPropagation()}>
                <div className="dialogHeaderRow">
                    <h2>{isEditing ? "Edit Course Details" : "Course Details"}</h2>
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

                {isEditing ? (
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
                ) : (
                    <div className="manage-course-content">
                        {/* Course Header Info */}
                        <div className="dialogCourseInfo">
                            <div className="dialogCourseTitleRow">
                                <p className="dialogCourseName">
                                    <strong>{liveCourse.code}:</strong> {liveCourse.name}
                                </p>
                                {isTransfer && <span className="transferBadge">Transfer</span>}
                            </div>
                            <p className="dialogCourseCredits">
                                <strong>Credits:</strong> {liveCourse.credits}
                            </p>
                            <p className="dialogCourseCurrentTerm">
                                <strong>Current Location:</strong> {formatCurrentLocation(liveCourse.currentTerm)}
                            </p>
                            {isTransfer && (
                                <>
                                    <p className="dialogCourseInstitution">
                                        <strong>Institution:</strong> {liveCourse.institution || "None"}
                                    </p>
                                    <p className="dialogCourseSatisfies">
                                        <strong>Satisfies:</strong> {liveCourse.satisfiesCourse || "None / General Elective"}
                                    </p>
                                </>
                            )}
                            <p className="dialogCourseDescription">
                                <strong>Description:</strong> {liveCourse.description || "None"}
                            </p>
                        </div>

                        {/* Prerequisite Status & Waiver Strip */}
                        <div className="manage-requirement-strip">
                            <div className="manage-req-header">
                                <span className="manage-req-title">Prerequisite Status:</span>
                                {isSatisfied && (
                                    <span className="audit-badge satisfied">✅ Requirements Met</span>
                                )}
                                {isWaived && (
                                    <span className="audit-badge waived">🏷️ Waived by Override</span>
                                )}
                                {isUnsatisfied && (
                                    <span className="audit-badge unsatisfied">⚠️ Requirements Incomplete</span>
                                )}
                            </div>

                            {/* Missing / Waived rule description */}
                            {isUnsatisfied && missingText && (
                                <p className="manage-missing-desc">
                                    Missing: <strong>{missingText}</strong>
                                </p>
                            )}
                            {isWaived && missingText && (
                                <p className="manage-missing-desc waived">
                                    Waived requirement: <strong>{missingText}</strong>
                                </p>
                            )}

                            {/* Waiver Toggle: Only available if not already satisfied */}
                            {!isSatisfied && (
                                <div className="manage-waiver-container">
                                    <label className="waiver-checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={isWaived}
                                            onChange={() => onToggleWaiver && onToggleWaiver(liveCourse.code)}
                                        />
                                        <span>Advisor Requirement Waiver</span>
                                    </label>
                                    <span className="waiver-caption">
                                        {isWaived 
                                            ? "Waiver granted. Click to revoke waiver and reinstate requirement checks."
                                            : "Override prerequisite checks and permit out-of-sequence completion."}
                                    </span>
                                </div>
                            )}
                        </div>

                        <hr className="dialogDivider" />

                        {/* Move Course Form */}
                        <form onSubmit={handleMoveSubmit} className="manage-move-form">
                            <h3 className="dialogSubheading">Move Course</h3>
                            {isTransfer ? (
                                <div className="formGroup">
                                    <label htmlFor="move-location-select-manage">Target Location:</label>
                                    <select
                                        id="move-location-select-manage"
                                        value={targetLocation}
                                        onChange={(e) => {
                                            setTargetLocation(e.target.value);
                                            setImpactAck(false);
                                        }}
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
                                <div className="manage-term-row">
                                    <div className="formGroup term-inline-group">
                                        <label htmlFor="move-year-select-manage">Target Year:</label>
                                        <select
                                            id="move-year-select-manage"
                                            value={selectedYear}
                                            onChange={(e) => {
                                                setSelectedYear(Number(e.target.value));
                                                setImpactAck(false);
                                            }}
                                        >
                                            <option value={0}>Year 1</option>
                                            <option value={1}>Year 2</option>
                                            <option value={2}>Year 3</option>
                                            <option value={3}>Year 4</option>
                                        </select>
                                    </div>
                                    <div className="formGroup term-inline-group">
                                        <label htmlFor="move-term-select-manage">Target Term:</label>
                                        <select
                                            id="move-term-select-manage"
                                            value={selectedTerm}
                                            onChange={(e) => {
                                                setSelectedTerm(Number(e.target.value));
                                                setImpactAck(false);
                                            }}
                                        >
                                            <option value={0}>Term 1</option>
                                            <option value={1}>Term 2</option>
                                            <option value={2}>Term 3</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Real-time Schedule Impact Timeline Strip */}
                            <div className={`manage-impact-strip ${moveSimulation.hasDownstreamImpact ? 'has-impact' : 'clean'}`}>
                                <div className="impact-strip-header">
                                    <span className="impact-indicator">
                                        {moveSimulation.hasDownstreamImpact ? '⚠️' : '🟢'}
                                    </span>
                                    <strong>
                                        {moveSimulation.hasDownstreamImpact
                                            ? `Schedule Impact: ${moveSimulation.affectedCourses.length} Downstream Course(s) Broken`
                                            : 'Safe Mutation: No downstream courses affected'}
                                    </strong>
                                </div>

                                {moveSimulation.hasDownstreamImpact && (
                                    <div className="timeline-preview">
                                        <div className="timeline-flow">
                                            <span className="flow-step current">{formatCurrentLocation(liveCourse.currentTerm)}</span>
                                            <span className="flow-arrow">➔</span>
                                            <span className="flow-step target">
                                                {isTransfer ? targetLocation : `Year ${selectedYear + 1}, Term ${selectedTerm + 1}`}
                                            </span>
                                        </div>
                                        <div className="timeline-affected">
                                            {moveSimulation.affectedCourses.map((c) => (
                                                <div key={c.id || c.courseCode} className="timeline-item">
                                                    <span className="timeline-badge">Breaks</span>
                                                    <strong>{c.courseCode}</strong> in {c.locationLabel}
                                                    <span className="timeline-item-reason">({c.reason})</span>
                                                </div>
                                            ))}
                                        </div>
                                        <label className="manage-impact-ack">
                                            <input
                                                type="checkbox"
                                                checked={impactAck}
                                                onChange={(e) => setImpactAck(e.target.checked)}
                                            />
                                            <span>Allow downstream prerequisite flags</span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="formGroup">
                                <button
                                    type="submit"
                                    className={`btn-submit ${moveSimulation.hasDownstreamImpact && !impactAck ? 'btn-disabled' : ''}`}
                                    disabled={moveSimulation.hasDownstreamImpact && !impactAck}
                                >
                                    {moveSimulation.hasDownstreamImpact ? '⚡ Move Course (With Warnings)' : 'Move Course'}
                                </button>
                            </div>
                        </form>

                        <hr className="dialogDivider" />

                        {/* Danger Zone */}
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
                                        Are you sure you want to remove <strong>{liveCourse.code}</strong> from your schedule?
                                    </p>
                                    {removeSimulation.hasDownstreamImpact && (
                                        <div className="manage-remove-warning">
                                            <p className="remove-warning-text">
                                                ⚠️ <strong>Notice:</strong> Removing this course invalidates prerequisites for{' '}
                                                <strong>{removeSimulation.affectedCourses.length}</strong> downstream course(s):
                                            </p>
                                            <ul className="downstream-list compact">
                                                {removeSimulation.affectedCourses.map((c) => (
                                                    <li key={c.id || c.courseCode}>
                                                        <strong>{c.courseCode}</strong> ({c.locationLabel}) — {c.reason}
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className="remove-reassurance">
                                                Affected courses will remain on the schedule with ⚠️ Missing Req flags.
                                            </p>
                                        </div>
                                    )}
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
                            <button type="button" className="btn-close" onClick={onClose}>
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ManageCourseDialog;
