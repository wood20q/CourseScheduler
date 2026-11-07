import { useState } from "react";

function AddCourseDialog({ course, onClose, onConfirm }) {
    const [selectedYear, setSelectedYear] = useState(0)
    const [selectedTerm, setSelectedTerm] = useState(0)

    const handleSubmit = (e) => {
        e.preventDefault()
        // Runs the function provided in the declaration
        onConfirm([selectedYear, selectedTerm], course)
        onClose()
    }

    return (
        <div className="dialogOverlay" onClick={onClose}>
            <div className="dialogWrapper" onClick={(e) => e.stopPropagation()}>
                <h2>Add Course to Schedule</h2>
                <p className="dialogCourseName"><strong>{course.code}:</strong> {course.name} ({course.credits} credit(s))</p>
                
                <form onSubmit={handleSubmit}>
                    <div className="formGroup" id="yearWrapper">
                        <label htmlFor="year-select">Select Year:</label>
                        <select 
                            name="year-select" 
                            id="year-select" 
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
                        <label htmlFor="term-select">Select Term:</label>
                        <select 
                            name="term-select" 
                            id="term-select" 
                            value={selectedTerm} 
                            onChange={(e) => setSelectedTerm(Number(e.target.value))}
                        >
                            <option value={0}>Term 1</option>
                            <option value={1}>Term 2</option>
                            <option value={2}>Term 3</option>
                        </select>
                    </div>

                    <div className="formGroup buttons">
                        <button type="button" className="btn-close" onClick={onClose}>Close</button>
                        <button type="submit" className="btn-submit">Add to Schedule</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddCourseDialog