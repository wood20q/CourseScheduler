import { useEffect, useState } from 'react'
import Year from './components/Year'
import AvailableCourses from './components/AvailableCourses'

function App() {
  const [schedule, setSchedule] = useState(() => Array.from({length: 4}, () => Array.from({length: 3}, () => [{"name": "Intro to Python", "code": "CS120", "credits": 1, "description": "Foundation in structured and object-oriented programming methodology with a high-level language. Special emphasis on decision and looping structures, subprograms and objects used in development of computer programs. Focus on algorithm development and a variety of applications provides basis for more advanced courses."}, {"name": "Data Structures and Algorithms", "code": "CS220", "credits": 1, "description": "In-depth study of data structures such as stacks, queues, linked lists, trees, and graphs. Includes the analysis of algorithm complexity, sorting, and searching techniques. Emphasizes writing efficient and scalable code."}])))
  const [availCourses, setAvailCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:3000/api/courses')
      .then((response) => response.json())
      .then((data) => {
        setAvailCourses(data)
        setIsLoading(false)
      }).catch((error) => {
        console.log('Failed to load courses', error)
        setIsLoading(false)
      })
  }, [])

  const handleAddCourse = async (termList, course) => {
    try {
      const response = await fetch('http://localhost:3000/api/schedule/addCourse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          termList: termList,
          course: course,
          schedule, schedule
        })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error)
      }

      const data = await response.json()
      setSchedule(data.schedule)
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
          ) : <AvailableCourses courseList={availCourses}/>
          }
        </div>
        <div className="scheduleArea">
          {schedule.map((year, i) => (
            <Year key={i} yearNumber={i + 1} yearList={year}/>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App