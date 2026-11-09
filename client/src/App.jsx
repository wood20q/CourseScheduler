import { useEffect, useState } from 'react'
import Year from './components/Year'
import AvailableCourses from './components/AvailableCourses'
import AddCourseDialog from './components/AddCourseDialog'
import { addCourseToSchedule, fetchCourses } from './services/scheduleApi'

function App() {
  const [schedule, setSchedule] = useState(() => Array.from({length: 4}, () => Array.from({length: 3}, () => [{"name": "Intro to Python", "code": "CS120", "credits": 1, "description": "Foundation in structured and object-oriented programming methodology with a high-level language. Special emphasis on decision and looping structures, subprograms and objects used in development of computer programs. Focus on algorithm development and a variety of applications provides basis for more advanced courses."}, {"name": "Data Structures and Algorithms", "code": "CS220", "credits": 1, "description": "In-depth study of data structures such as stacks, queues, linked lists, trees, and graphs. Includes the analysis of algorithm complexity, sorting, and searching techniques. Emphasizes writing efficient and scalable code."}])))
  const [availCourses, setAvailCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const [selectedCourse, setSelectedCourse] = useState(null)

  useEffect(() => {
    fetchCourses()
      .then((data) => setAvailCourses(data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleAddCourse = async (termList, course) => {
    try {
      const updatedSchedule = await addCourseToSchedule(termList, course, schedule)
      setSchedule(updatedSchedule)
    } catch (error) {
      alert(`Could not add course: ${error.message}`)
    }
  }

  return (
    <div className="app-container">
      <nav className="top-nav">
        <h1>Course Scheduler</h1>
        <p>Total Credits: {schedule.flat(2).reduce((sum, course) => sum + course.credits, 0)}</p>
        <p>Student Name: Chad Quick</p>
      </nav>
      <main className="main-container">
        <div className="availableCourses">
          {isLoading ? (
            <p>Loading Courses</p>
          ) : <AvailableCourses onSelectCourse={(course) => setSelectedCourse(course)} courseList={availCourses}/>
          }
        </div>
        <div className="scheduleArea">
          {schedule.map((year, i) => (
            <Year key={i} yearNumber={i + 1} yearList={year}/>
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
    </div>
  )
}

export default App