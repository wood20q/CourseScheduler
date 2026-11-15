import { useEffect, useState } from 'react'
import Year from './components/Year'
import AvailableCourses from './components/AvailableCourses'
import AddCourseDialog from './components/AddCourseDialog'
import ManageCourseDialog from './components/ManageCourseDialog'
import ImportExportDialog from './components/ImportExportDialog'
import { addCourseToSchedule, removeCourseFromSchedule, moveCourseInSchedule, fetchCourses } from './services/scheduleApi'

const createEmptySchedule = () => Array.from({length: 4}, () => Array.from({length: 3}, () => []))
const studentName = "Chad Quick"

function App() {
  const [schedule, setSchedule] = useState(() => {
    try {
      const saved = localStorage.getItem('course_scheduler_data')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === 4 && parsed.every(y => Array.isArray(y) && y.length === 3)) {
          return parsed
        }
      }
    } catch (e) {
      console.error("Failed to load schedule from localStorage:", e)
    }
    return createEmptySchedule()
  })
  const [availCourses, setAvailCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const [selectedCourse, setSelectedCourse] = useState(null)
  const [managedCourse, setManagedCourse] = useState(null)
  const [isIODialogOpen, setIsIODialogOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('course_scheduler_data', JSON.stringify(schedule))
    } catch (e) {
      console.error("Failed to save schedule to localStorage:", e)
    }
  }, [schedule])

  const loadCourses = () => {
    setIsLoading(true)
    fetchCourses()
      .then((data) => {
        setAvailCourses(data)
        setFetchError(null)
      })
      .catch((err) => {
        console.error("Error loading courses:", err)
        setFetchError(err.message)
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadCourses()
  }, [])

  const handleAddCourse = async (termList, course) => {
    try {
      const updatedSchedule = await addCourseToSchedule(termList, course, schedule)
      setSchedule(updatedSchedule)
    } catch (error) {
      alert(`Could not add course: ${error.message}`)
    }
  }

  const handleRemoveCourse = async (code) => {
    try {
      const updatedSchedule = await removeCourseFromSchedule(code, schedule)
      setSchedule(updatedSchedule)
      setManagedCourse(null)
    } catch (error) {
      alert(`Could not remove course: ${error.message}`)
    }
  }

  const handleMoveCourse = async (termList, code) => {
    try {
      const updatedSchedule = await moveCourseInSchedule(termList, code, schedule)
      setSchedule(updatedSchedule)
      setManagedCourse(null)
    } catch (error) {
      alert(`Could not move course: ${error.message}`)
    }
  }

  const handleResetSchedule = () => {
    setSchedule(createEmptySchedule())
  }

  return (
    <div className="app-container">
      <nav className="top-nav">
        <h1>Course Scheduler</h1>
        <p>Total Credits: {schedule.flat(2).reduce((sum, course) => sum + course.credits, 0)}</p>
        <div className="navUserSection">
          <p>Student Name: {studentName}</p>
          <button 
            type="button" 
            className="btn-schedule-io" 
            onClick={() => setIsIODialogOpen(true)}
          >
            Import / Export
          </button>
        </div>
      </nav>
      <main className="main-container">
        <div className="availableCourses">
          {isLoading ? (
            <p>Loading Courses...</p>
          ) : fetchError ? (
            <div className="noCoursesFound" style={{ padding: '1em', textAlign: 'center' }}>
              <p style={{ color: 'var(--red)', marginBottom: '0.8em' }}>{fetchError}</p>
              <button 
                type="button" 
                className="btn-submit" 
                onClick={loadCourses}
                style={{ width: 'auto', padding: '0.4em 1.2em' }}
              >
                Retry
              </button>
            </div>
          ) : <AvailableCourses onSelectCourse={(course) => setSelectedCourse(course)} courseList={availCourses} schedule={schedule.flat(2)}/>
          }
        </div>
        <div className="scheduleArea">
          {schedule.map((year, i) => (
            <Year 
              key={i} 
              yearNumber={i + 1} 
              yearList={year} 
              onCourseClick={(course, termList) => setManagedCourse({ ...course, currentTerm: termList })}
            />
          ))}
        </div>
      </main>
      {selectedCourse && (
        <AddCourseDialog
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onConfirm={handleAddCourse}
        />
      )}
      {managedCourse && (
        <ManageCourseDialog
          course={managedCourse}
          onClose={() => setManagedCourse(null)}
          onRemove={handleRemoveCourse}
          onMove={handleMoveCourse}
        />
      )}
      {isIODialogOpen && (
        <ImportExportDialog
          schedule={schedule}
          studentName={studentName}
          onClose={() => setIsIODialogOpen(false)}
          onImportSchedule={(newSchedule) => setSchedule(newSchedule)}
          onResetSchedule={handleResetSchedule}
        />
      )}
    </div>
  )
}

export default App