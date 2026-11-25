import { useState, useMemo } from "react";
import { formatLocationKey, parseLocation } from "../utils/scheduleMigration";
import { validateSchedule } from "../utils/requirementEngine";
import { 
    ManageCourseVariantA, 
    ManageCourseVariantB, 
    ManageCourseVariantC,
    ManageCourseVariantD
} from "./prototypes/ManageCourseVariants";

function ManageCourseDialog({ 
    course, 
    schedule,
    catalogCourses = [],
    onClose, 
    onRemove, 
    onMove, 
    onUpdate,
    onToggleWaiver,
    variant
}) {
    const isTransfer = Boolean(course?.isTransfer);

    // Inline edit state for transfer courses
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(course?.name || "");
    const [editCredits, setEditCredits] = useState(course?.credits ?? 0);
    const [editInstitution, setEditInstitution] = useState(course?.institution || "");
    const [editSatisfies, setEditSatisfies] = useState(course?.satisfiesCourse || "");
    const [editDescription, setEditDescription] = useState(course?.description || "");
    const [editError, setEditError] = useState("");

    // Determine active variant from prop or URL query param
    const activeVariant = useMemo(() => {
        if (variant) return variant.toUpperCase();
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const v = params.get("variant");
            if (v && ["A", "B", "C", "D"].includes(v.toUpperCase())) {
                return v.toUpperCase();
            }
        }
        return "A";
    }, [variant]);

    // Compute real-time validation diagnostic for this course
    const courseValidation = useMemo(() => {
        if (!schedule || !course) return null;
        const res = validateSchedule(schedule, catalogCourses);
        return res.diagnostics.find(
            d => d.courseCode?.trim().toUpperCase() === course.code?.trim().toUpperCase()
        ) || null;
    }, [schedule, course, catalogCourses]);

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
                    <>
                        {activeVariant === "B" && (
                            <ManageCourseVariantB
                                course={course}
                                schedule={schedule}
                                catalogCourses={catalogCourses}
                                onClose={onClose}
                                onRemove={onRemove}
                                onMove={onMove}
                                onUpdate={onUpdate}
                                onToggleWaiver={onToggleWaiver}
                                courseValidation={courseValidation}
                            />
                        )}
                        {activeVariant === "C" && (
                            <ManageCourseVariantC
                                course={course}
                                schedule={schedule}
                                catalogCourses={catalogCourses}
                                onClose={onClose}
                                onRemove={onRemove}
                                onMove={onMove}
                                onUpdate={onUpdate}
                                onToggleWaiver={onToggleWaiver}
                                courseValidation={courseValidation}
                            />
                        )}
                        {activeVariant === "D" && (
                            <ManageCourseVariantD
                                course={course}
                                schedule={schedule}
                                catalogCourses={catalogCourses}
                                onClose={onClose}
                                onRemove={onRemove}
                                onMove={onMove}
                                onUpdate={onUpdate}
                                onToggleWaiver={onToggleWaiver}
                                courseValidation={courseValidation}
                            />
                        )}
                        {activeVariant === "A" && (
                            <ManageCourseVariantA
                                course={course}
                                schedule={schedule}
                                catalogCourses={catalogCourses}
                                onClose={onClose}
                                onRemove={onRemove}
                                onMove={onMove}
                                onUpdate={onUpdate}
                                onToggleWaiver={onToggleWaiver}
                                courseValidation={courseValidation}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default ManageCourseDialog;
