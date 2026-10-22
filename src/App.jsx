import { useState } from 'react'
import Year from './components/Year'
import AvailableCourses from './components/AvailableCourses'

function App() {
  return (
    <>
      <nav>
        <h2>Course Scheduler</h2>
      </nav>
      <main>
        <div className="availableCourses">
          <AvailableCourses/>
        </div>
        <div className="scheduleArea">
          <Year yearNumber={1}/>
          <Year yearNumber={2}/>
          <Year yearNumber={3}/>
          <Year yearNumber={4}/>
        </div>
      </main>
    </>
  )
}

export default App