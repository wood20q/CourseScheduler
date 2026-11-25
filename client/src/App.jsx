import { useEffect, useState, useMemo } from 'react'
import Year from './components/Year'
import AvailableCourses from './components/AvailableCourses'
import AddCourseDialog from './components/AddCourseDialog'
import ManageCourseDialog from './components/ManageCourseDialog'
import ImportExportDialog from './components/ImportExportDialog'
import TransferCreditsSection from './components/TransferCreditsSection'
import AddTransferCourseDialog from './components/AddTransferCourseDialog'
import { RequirementInspectorModal } from './components/prototypes/RequirementFlagVariants'
import PrototypeSwitcher from './components/prototypes/PrototypeSwitcher'
import { 
  addCourseToSchedule as apiAddCourse, 
  removeCourseFromSchedule as apiRemoveCourse, 
  moveCourseInSchedule as apiMoveCourse, 
  fetchCourses 
} from './services/scheduleApi'
import { 
  createEmptySchedule, 
  migrateSchedule, 
  calculateTotalCredits,
  addCourseToSchedule,
  removeCourseFromSchedule,
  moveCourseInSchedule
} from './utils/scheduleMigration'
import { validateSchedule } from './utils/requirementEngine'

const studentName = "Chad Quick"

const PROTOTYPE_VARIANTS = [
  { key: 'A', name: 'Variant A (Inline Accordion & Checkbox)' },
  { key: 'B', name: 'Variant B (Interstitial Modal & Audit Card)' },
  { key: 'C', name: 'Variant C (Tabbed Console & Impact Timeline)' },
  { key: 'D', name: 'Variant D (Hybrid: Inline Status & Timeline Flow)' }
];

const CATALOG_REQUIREMENTS = {
  CS220: { prerequisites: ['CS120'] },
  CS240: { prerequisites: ['CS120'] },
  CS350: { prerequisites: ['CS220', 'CS240'] },
  CS310: { prerequisites: ['CS220'] },
  MATH215: { prerequisites: ['MATH101'] },
  PHYS200: { corequisites: ['MATH101'] },
  MATH310: { prerequisites: [['MATH101', 'MATH105'], ['MATH303', 'MATH304']] }
}

const FALLBACK_CATALOG = [
  { id: 1, name: "Intro to Python", code: "CS120", credits: 1, description: "Intro to structured and object-oriented programming..." },
  { id: 2, name: "Data Structures and Algorithms", code: "CS220", credits: 1, description: "In-depth study of data structures, complexity, and sorting." },
  { id: 3, name: "Calculus I", code: "MATH101", credits: 1, description: "Fundamentals of limits, derivatives, and integrals." },
  { id: 10, name: "General Physics", code: "PHYS200", credits: 1, description: "Calculus-based mechanics, thermodynamics, and waves." },
  { id: 16, name: "Software Engineering", code: "CS350", credits: 1, description: "Methodologies for software design, testing, agile development, and team project management." },
  { id: 19, name: "Cybersecurity Fundamentals", code: "CS240", credits: 1, description: "Core concepts of network security, cryptography, vulnerability assessment, and defense strategies." }
]

const createDemoSchedule = () => ({
  transferCourses: [
    { code: 'AP-CALC', name: 'AP Calculus BC Exam', credits: 1, satisfiesCourse: 'MATH101' }
  ],
  years: [
    [
      // Year 1 Term 1: CS220 (Missing CS120! Unsatisfied)
      [{ code: 'CS220', name: 'Data Structures and Algorithms', credits: 1, description: 'Requires CS120' }],
      // Year 1 Term 2: PHYS200 (Corequisite satisfied concurrently via AP-CALC)
      [{ code: 'PHYS200', name: 'General Physics', credits: 1, description: 'Corequisite with MATH101' }],
      // Year 1 Term 3: CS120
      [{ code: 'CS120', name: 'Intro to Python', credits: 1, description: 'Intro course' }]
    ],
    [
      // Year 2 Term 1: CS350 (Software Engineering - Waived!)
      [{ code: 'CS350', name: 'Software Engineering', credits: 1, isWaived: true, description: 'Requires CS220 and CS240 (Waived)' }],
      [],
      []
    ],
    [[], [], []],
    [[], [], []]
  ]
})

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
  const [inspectedRequirement, setInspectedRequirement] = useState(null)
  const [isIODialogOpen, setIsIODialogOpen] = useState(false)
  const [isAddTransferOpen, setIsAddTransferOpen] = useState(false)

  const [prototypeVariant, setPrototypeVariant] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('variant')?.toUpperCase();
      if (v && ['A', 'B', 'C', 'D'].includes(v)) return v;
    }
    return 'A';
  });

  const handleSelectVariant = (newVariant) => {
    setPrototypeVariant(newVariant);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('variant', newVariant);
      window.history.replaceState({}, '', url.toString());
    }
  };

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

  // Augmented catalog with prerequisite/corequisite rules
  const catalogWithRules = useMemo(() => {
    const baseList = (availCourses && availCourses.length > 0) ? availCourses : FALLBACK_CATALOG
    return baseList.map(c => ({
      ...c,
      prerequisites: c.prerequisites || CATALOG_REQUIREMENTS[c.code]?.prerequisites || [],
      corequisites: c.corequisites || CATALOG_REQUIREMENTS[c.code]?.corequisites || []
    }))
  }, [availCourses])

  // Real-time schedule validation
  const validationResult = useMemo(() => {
    return validateSchedule(schedule, catalogWithRules)
  }, [schedule, catalogWithRules])

  const handleAddCourse = async (termList, course) => {
    try {
      const updatedSchedule = await apiAddCourse(termList, course, schedule)
      setSchedule(updatedSchedule)
    } catch (error) {
      alert(`Could not add course: ${error.message}`)
    }
  }

  const handleRemoveCourse = async (code) => {
    setSchedule((prev) => removeCourseFromSchedule(prev, code))
    setManagedCourse(null)
    try {
      await apiRemoveCourse(code, schedule)
    } catch {
      // client-side state already updated
    }
  }

  const handleMoveCourse = async (targetLocation, code) => {
    setSchedule((prev) => moveCourseInSchedule(prev, code, targetLocation))
    setManagedCourse(null)
    try {
      await apiMoveCourse(targetLocation, code, schedule)
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

  const handleToggleWaiver = (courseCode) => {
    const cleanCode = courseCode.toLowerCase().trim()
    setSchedule((prev) => ({
      transferCourses: (prev.transferCourses || []).map((c) =>
        c.code.toLowerCase().trim() === cleanCode ? { ...c, isWaived: !c.isWaived } : c
      ),
      years: (prev.years || []).map((year) =>
        year.map((term) =>
          term.map((c) =>
            c.code.toLowerCase().trim() === cleanCode ? { ...c, isWaived: !c.isWaived } : c
          )
        )
      )
    }))
    setManagedCourse((prev) => {
      if (!prev || prev.code?.toLowerCase().trim() !== cleanCode) return prev
      return { ...prev, isWaived: !prev.isWaived }
    })
    setInspectedRequirement((prev) => {
      if (!prev || prev.course?.code?.toLowerCase().trim() !== cleanCode) return prev
      return {
        ...prev,
        course: { ...prev.course, isWaived: !prev.course.isWaived }
      }
    })
  }

  const handleResetSchedule = () => {
    setSchedule(createEmptySchedule())
  }

  const handleLoadDemo = () => {
    const demo = createDemoSchedule()
    setSchedule(demo)
    try {
      localStorage.setItem('course_scheduler_data', JSON.stringify(demo))
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddTransferCourse = (targetLocation, newCourse) => {
    setSchedule((prev) => addCourseToSchedule(prev, newCourse, targetLocation))
  }

  const allScheduledCourses = (schedule.transferCourses || []).concat((schedule.years || []).flat(2))

  // Enriched schedule for rendering with diagnostics (finalized Variant A pill from #19)
  const enrichedYears = useMemo(() => {
    return (schedule.years || []).map((year, yIdx) => {
      return year.map((term, tIdx) => {
        return term.map((course, cIdx) => {
          const diag = validationResult.diagnosticsMap.get(`term-${yIdx}-${tIdx}-${cIdx}`)
          return {
            ...course,
            validation: diag,
            variant: 'A'
          }
        })
      })
    })
  }, [schedule.years, validationResult.diagnosticsMap])

  const totalFlaggedCount = (validationResult.summary.unsatisfiedCount || 0) + (validationResult.summary.waivedCount || 0)

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
              courseList={catalogWithRules} 
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
          {allScheduledCourses.length === 0 && (
            <div className="empty-schedule-prototype-banner">
              <span>💡 Schedule is currently empty. Click</span>
              <button type="button" className="btn-load-inline-demo" onClick={handleLoadDemo}>
                ⚡ Load Test Courses
              </button>
              <span>to preview prerequisite, corequisite, and waiver flags!</span>
            </div>
          )}
          <div className="scheduleArea">
            {enrichedYears.map((year, i) => (
              <Year 
                key={i} 
                yearNumber={i + 1} 
                yearList={year} 
                onCourseClick={(course, termList) => setManagedCourse({ ...course, currentTerm: termList })}
                onInspectRequirement={(course, validation) => setInspectedRequirement({ course, validation })}
              />
            ))}
          </div>
        </div>
      </main>
      {selectedCourse && (
        <AddCourseDialog
          course={selectedCourse}
          schedule={schedule}
          catalogCourses={catalogWithRules}
          onClose={() => setSelectedCourse(null)}
          onConfirm={handleAddCourse}
        />
      )}
      {isAddTransferOpen && (
        <AddTransferCourseDialog
          catalogCourses={catalogWithRules}
          onClose={() => setIsAddTransferOpen(false)}
          onConfirm={handleAddTransferCourse}
        />
      )}
      {managedCourse && (
        <ManageCourseDialog
          course={managedCourse}
          schedule={schedule}
          catalogCourses={catalogWithRules}
          onClose={() => setManagedCourse(null)}
          onRemove={handleRemoveCourse}
          onMove={handleMoveCourse}
          onUpdate={handleUpdateCourse}
          onToggleWaiver={handleToggleWaiver}
          variant={prototypeVariant}
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
      {inspectedRequirement && (
        <RequirementInspectorModal
          course={inspectedRequirement.course}
          validation={inspectedRequirement.validation}
          onClose={() => setInspectedRequirement(null)}
          onToggleWaiver={handleToggleWaiver}
        />
      )}
      {process.env.NODE_ENV !== 'production' && (
        <PrototypeSwitcher
          variants={PROTOTYPE_VARIANTS}
          currentVariant={prototypeVariant}
          onSelectVariant={handleSelectVariant}
        />
      )}
    </div>
  )
}

export default App
