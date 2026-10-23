import { useState } from 'react'
import Year from './components/Year'
import AvailableCourses from './components/AvailableCourses'

function App() {
  return (
    <div className="app-container">
      <nav className="top-nav">
        <h1>Course Scheduler</h1>
        <p>Student Name: Chad Quick</p>
      </nav>
      <main className="main-container">
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
    </div>
  )
}

export default App