import { useEffect, useState } from 'react'
import Year from './components/Year'
import AvailableCourses from './components/AvailableCourses'
import AddCourseDialog from './components/AddCourseDialog'
import ManageCourseDialog from './components/ManageCourseDialog'
import ImportExportDialog from './components/ImportExportDialog'
import TransferCreditsSection from './components/TransferCreditsSection'
import AddTransferCourseDialog from './components/AddTransferCourseDialog'
import { addCourseToSchedule, removeCourseFromSchedule, moveCourseInSchedule, fetchCourses } from './services/scheduleApi'
import { createEmptySchedule, migrateSchedule, calculateTotalCredits } from './utils/scheduleMigration'

const studentName = "Chad Quick"

function App() {
  const [schedule, setSchedule] = useState(() => {
    try {
      const saved = localStorage.getItem('course_scheduler_data')
      if (saved) {
        return migrateSchedule(JSON.parse(saved))
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
  const [isAddTransferOpen, setIsAddTransferOpen] = useState(false)

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
    const cleanCode = code.toLowerCase().trim()
    setSchedule((prev) => ({
      transferCourses: (prev.transferCourses || []).filter(
        (c) => c.code.toLowerCase().trim() !== cleanCode
      ),
      years: (prev.years || []).map((year) =>
        year.map((term) => term.filter((c) => c.code.toLowerCase().trim() !== cleanCode))
      )
    }))
    setManagedCourse(null)
    try {
      await removeCourseFromSchedule(code, schedule)
    } catch {
      // client-side state already updated
    }
  }

  const handleMoveCourse = async (targetLocation, code) => {
    const cleanCode = code.toLowerCase().trim()
    setSchedule((prev) => {
      let movedCourse = null
      const nextTransfer = (prev.transferCourses || []).filter((c) => {
        if (c.code.toLowerCase().trim() === cleanCode) {
          movedCourse = c
          return false
        }
        return true
      })
      const nextYears = (prev.years || []).map((year) =>
        year.map((term) =>
          term.filter((c) => {
            if (c.code.toLowerCase().trim() === cleanCode) {
              movedCourse = c
              return false
            }
            return true
          })
        )
      )

      if (!movedCourse) return prev

      if (targetLocation === 'transfer') {
        return {
          transferCourses: [...nextTransfer, movedCourse],
          years: nextYears
        }
      }

      const [y, t] = Array.isArray(targetLocation)
        ? targetLocation
        : targetLocation.split(',').map(Number)
      nextYears[y][t].push(movedCourse)
      return {
        transferCourses: nextTransfer,
        years: nextYears
      }
    })
    setManagedCourse(null)
    try {
      await moveCourseInSchedule(targetLocation, code, schedule)
    } catch {
      // client-side state already updated
    }
  }

  const handleUpdateCourse = (updatedCourse) => {
    const cleanCode = updatedCourse.code.toLowerCase().trim()
    setSchedule((prev) => ({
      transferCourses: (prev.transferCourses || []).map((c) =>
        c.code.toLowerCase().trim() === cleanCode ? { ...c, ...updatedCourse } : c
      ),
      years: (prev.years || []).map((year) =>
        year.map((term) =>
          term.map((c) =>
            c.code.toLowerCase().trim() === cleanCode ? { ...c, ...updatedCourse } : c
          )
        )
      )
    }))
    setManagedCourse(null)
  }

  const handleResetSchedule = () => {
    setSchedule(createEmptySchedule())
  }

  const handleAddTransferCourse = (targetLocation, newCourse) => {
    if (targetLocation === 'transfer') {
      setSchedule((prev) => ({
        ...prev,
        transferCourses: [...(prev.transferCourses || []), newCourse]
      }))
    } else if (Array.isArray(targetLocation)) {
      setSchedule((prev) => {
        const [y, t] = targetLocation
        const newYears = prev.years.map((year) => year.map((term) => [...term]))
        newYears[y][t].push(newCourse)
        return {
          ...prev,
          years: newYears
        }
      })
    }
  }

  const allScheduledCourses = (schedule.transferCourses || []).concat((schedule.years || []).flat(2))

  return (
    <div className="app-container">
      <nav className="top-nav">
        <h1>Course Scheduler</h1>
        <p>Total Credits: {calculateTotalCredits(schedule)}</p>
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
          ) : (
            <AvailableCourses 
              onSelectCourse={(course) => setSelectedCourse(course)} 
              onOpenAddTransferCourse={() => setIsAddTransferOpen(true)}
              courseList={availCourses} 
              schedule={allScheduledCourses}
            />
          )}
        </div>
        <div className="scheduleWrapper">
          <TransferCreditsSection 
            transferCourses={schedule.transferCourses || []} 
            onAddClick={() => setIsAddTransferOpen(true)}
            onCourseClick={(course, location) => setManagedCourse({ ...course, currentTerm: location })}
          />
          <div className="scheduleArea">
            {(schedule.years || []).map((year, i) => (
              <Year 
                key={i} 
                yearNumber={i + 1} 
                yearList={year} 
                onCourseClick={(course, termList) => setManagedCourse({ ...course, currentTerm: termList })}
              />
            ))}
          </div>
        </div>
      </main>
      {selectedCourse && (
        <AddCourseDialog
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onConfirm={handleAddCourse}
        />
      )}
      {isAddTransferOpen && (
        <AddTransferCourseDialog
          catalogCourses={availCourses}
          onClose={() => setIsAddTransferOpen(false)}
          onConfirm={handleAddTransferCourse}
        />
      )}
      {managedCourse && (
        <ManageCourseDialog
          course={managedCourse}
          onClose={() => setManagedCourse(null)}
          onRemove={handleRemoveCourse}
          onMove={handleMoveCourse}
          onUpdate={handleUpdateCourse}
          catalogCourses={availCourses}
        />
      )}
      {isIODialogOpen && (
        <ImportExportDialog
          schedule={schedule}
          studentName={studentName}
          onClose={() => setIsIODialogOpen(false)}
          onImportSchedule={(newSchedule) => setSchedule(migrateSchedule(newSchedule))}
          onResetSchedule={handleResetSchedule}
        />
      )}
    </div>
  )
}

export default App