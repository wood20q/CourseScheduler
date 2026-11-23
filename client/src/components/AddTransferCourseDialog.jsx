import { useState } from "react";

function AddTransferCourseDialog({ onClose, onConfirm, catalogCourses = [] }) {
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [credits, setCredits] = useState("");
    const [institution, setInstitution] = useState("");
    const [satisfiesCourse, setSatisfiesCourse] = useState("");
    const [description, setDescription] = useState("");
    const [targetLocation, setTargetLocation] = useState("transfer");
    const [validationError, setValidationError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();

        const trimmedCode = code.trim().toUpperCase();
        const trimmedName = name.trim();
        const numCredits = Number(credits);

        if (!trimmedCode) {
            setValidationError("Course Code is required.");
            return;
        }
        if (!trimmedName) {
            setValidationError("Course Title is required.");
            return;
        }
        if (isNaN(numCredits) || numCredits <= 0) {
            setValidationError("Credits must be a positive number.");
            return;
        }

        const newCourse = {
            code: trimmedCode,
            name: trimmedName,
            credits: numCredits,
            institution: institution.trim(),
            satisfiesCourse: satisfiesCourse.trim().toUpperCase() || null,
            description: description.trim(),
            isTransfer: true
        };

        let parsedLocation = targetLocation;
        if (targetLocation !== "transfer") {
            const [y, t] = targetLocation.split(",").map(Number);
            parsedLocation = [y, t];
        }

        onConfirm(parsedLocation, newCourse);
        onClose();
    };

    return (
        <div className="dialogOverlay" onClick={onClose}>
            <div className="dialogWrapper" onClick={(e) => e.stopPropagation()}>
                <h2>Add Transfer Course</h2>

                {validationError && (
                    <div className="formErrorBox">
                        <p>{validationError}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="formGroup">
                        <label htmlFor="transfer-code">Course Code: *</label>
                        <input
                            id="transfer-code"
                            type="text"
                            placeholder="e.g. AP-CALC or CIS 101"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                        />
                    </div>

                    <div className="formGroup">
                        <label htmlFor="transfer-name">Course Title: *</label>
                        <input
                            id="transfer-name"
                            type="text"
                            placeholder="e.g. AP Calculus BC"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="formGroup">
                        <label htmlFor="transfer-credits">Credits: *</label>
                        <input
                            id="transfer-credits"
                            type="number"
                            min="0.5"
                            step="0.5"
                            placeholder="e.g. 3 or 4"
                            value={credits}
                            onChange={(e) => setCredits(e.target.value)}
                            required
                        />
                    </div>

                    <div className="formGroup">
                        <label htmlFor="transfer-institution">Originating Institution:</label>
                        <input
                            id="transfer-institution"
                            type="text"
                            placeholder="e.g. College Board, City Community College"
                            value={institution}
                            onChange={(e) => setInstitution(e.target.value)}
                        />
                    </div>

                    <div className="formGroup">
                        <label htmlFor="transfer-satisfies">Satisfies Home Course:</label>
                        <select
                            id="transfer-satisfies"
                            value={satisfiesCourse}
                            onChange={(e) => setSatisfiesCourse(e.target.value)}
                        >
                            <option value="">None / General Elective</option>
                            {catalogCourses.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.code} - {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="formGroup">
                        <label htmlFor="transfer-description">Description:</label>
                        <textarea
                            id="transfer-description"
                            rows={3}
                            placeholder="Optional notes or course description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="formGroup">
                        <label htmlFor="transfer-location">Target Location:</label>
                        <select
                            id="transfer-location"
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

                    <div className="formGroup buttons">
                        <button type="button" className="btn-close" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-submit">
                            Add Transfer Course
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddTransferCourseDialog;
