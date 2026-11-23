import { useState } from "react";
import { validateSchedule, migrateSchedule } from "../utils/scheduleMigration";

function getCoursesCount(sched) {
    if (!sched) return 0;
    if (Array.isArray(sched)) return sched.flat(2).length;
    return (sched.transferCourses || []).length + (sched.years || []).flat(2).length;
}

function ImportExportDialog({ schedule, studentName = "Student", onClose, onImportSchedule, onResetSchedule }) {
    const [pendingSchedule, setPendingSchedule] = useState(null);
    const [selectedFileName, setSelectedFileName] = useState('');
    const [error, setError] = useState(null);
    const [isConfirmingReset, setIsConfirmingReset] = useState(false);

    const currentCourseCount = getCoursesCount(schedule);
    const newCourseCount = pendingSchedule ? getCoursesCount(pendingSchedule) : 0;

    const handleExport = () => {
        const normalized = migrateSchedule(schedule);
        const jsonString = JSON.stringify(normalized, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const formattedName = (studentName || "Student").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
        const dateStr = new Date().toISOString().slice(0, 10);
        link.download = `${formattedName}_Schedule_${dateStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFileName(file.name);
        setError(null);
        setIsConfirmingReset(false);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                const validationError = validateSchedule(parsed);
                if (validationError) {
                    setError(validationError);
                    setPendingSchedule(null);
                } else {
                    setPendingSchedule(parsed);
                    setError(null);
                }
            } catch {
                setError("Failed to parse JSON file. Please ensure it is a valid .json file.");
                setPendingSchedule(null);
            }
        };

        reader.onerror = () => {
            setError("Could not read the selected file.");
            setPendingSchedule(null);
        };

        reader.readAsText(file);
        // Reset file input value so re-uploading the same file triggers onChange
        e.target.value = '';
    };

    const handleConfirmImport = () => {
        if (!pendingSchedule) return;
        onImportSchedule(migrateSchedule(pendingSchedule));
        onClose();
    };

    const handleCancelImport = () => {
        setPendingSchedule(null);
        setSelectedFileName('');
        setError(null);
    };

    const handleConfirmReset = () => {
        if (onResetSchedule) {
            onResetSchedule();
        }
        setIsConfirmingReset(false);
        onClose();
    };

    return (
        <div className="dialogOverlay" onClick={onClose}>
            <div className="dialogWrapper" onClick={(e) => e.stopPropagation()}>
                <h2>Schedule Management</h2>

                {/* Export Section */}
                <div className="ioSection">
                    <h3 className="dialogSubheading">Export Schedule</h3>
                    <p className="ioDescription">
                        Save a backup of your 4-year schedule as a JSON file to your computer.
                    </p>
                    <button type="button" className="btn-submit" onClick={handleExport}>
                        Download Schedule (.json)
                    </button>
                </div>

                <hr className="dialogDivider" />

                {/* Import Section */}
                <div className="ioSection">
                    <h3 className="dialogSubheading">Import Schedule</h3>
                    <p className="ioDescription">
                        Load a previously exported 4-year schedule from a JSON file.
                    </p>

                    <div className="fileInputWrapper">
                        <input
                            type="file"
                            id="scheduleFileInput"
                            accept=".json,application/json"
                            style={{ display: "none" }}
                            onChange={handleFileSelect}
                        />
                        <label htmlFor="scheduleFileInput" className="btn-file-select">
                            Choose Schedule File (.json)
                        </label>
                        {selectedFileName && (
                            <span className="selectedFileName">{selectedFileName}</span>
                        )}
                    </div>

                    {error && (
                        <div className="importErrorBox">
                            <p>{error}</p>
                        </div>
                    )}

                    {pendingSchedule && (
                        <div className="importWarningBox">
                            <p className="importWarningText">
                                <strong>Warning:</strong> Importing this file will replace your current schedule ({currentCourseCount} courses) with the new schedule ({newCourseCount} courses).
                            </p>
                            <div className="importWarningButtons">
                                <button
                                    type="button"
                                    className="btn-confirm-import"
                                    onClick={handleConfirmImport}
                                >
                                    Yes, Replace Schedule
                                </button>
                                <button
                                    type="button"
                                    className="btn-cancel-import"
                                    onClick={handleCancelImport}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <hr className="dialogDivider" />

                {/* Reset Section */}
                <div className="ioSection">
                    <h3 className="dialogSubheading">Reset Schedule</h3>
                    <p className="ioDescription">
                        Clear all courses from all terms in your schedule. This action cannot be undone unless you have exported a backup.
                    </p>

                    {!isConfirmingReset ? (
                        <button
                            type="button"
                            className="btn-danger"
                            disabled={currentCourseCount === 0}
                            onClick={() => {
                                setPendingSchedule(null);
                                setError(null);
                                setIsConfirmingReset(true);
                            }}
                        >
                            {currentCourseCount === 0 ? "Schedule Is Already Empty" : "Clear Entire Schedule"}
                        </button>
                    ) : (
                        <div className="deleteConfirmBox">
                            <p>
                                Are you sure you want to remove all {currentCourseCount} {currentCourseCount === 1 ? 'course' : 'courses'} from your schedule?
                            </p>
                            <div className="deleteConfirmButtons">
                                <button
                                    type="button"
                                    className="btn-confirm-delete"
                                    onClick={handleConfirmReset}
                                >
                                    Yes, Clear Schedule
                                </button>
                                <button
                                    type="button"
                                    className="btn-cancel-delete"
                                    onClick={() => setIsConfirmingReset(false)}
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
        </div>
    );
}

export default ImportExportDialog;
