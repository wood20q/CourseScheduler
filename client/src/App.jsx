import { useState } from 'react'
import Year from './components/Year'
import AvailableCourses from './components/AvailableCourses'

const COURSES = [
  {
    "name": "Intro to Python",
    "code": "CS120",
    "credits": 1,
    "description": "Intro to structured and object-oriented programming, focusing on algorithms, loops, and objects to prepare for advanced courses."
  },
  {
    "name": "Data Structures and Algorithms",
    "code": "CS220",
    "credits": 1,
    "description": "In-depth study of data structures, algorithm complexity, sorting, and searching techniques."
  },
  {
    "name": "Calculus I",
    "code": "MATH101",
    "credits": 1,
    "description": "Fundamentals of limits, derivatives, integrals, and their applications in science and engineering."
  },
  {
    "name": "Creative Writing",
    "code": "ENG200",
    "credits": 0.5,
    "description": "Workshop-style course focusing on the creation, structure, and critique of original fiction and poetry."
  },
  {
    "name": "Modern World History",
    "code": "HIST150",
    "credits": 0.5,
    "description": "Survey of global historical events, cultural movements, and political changes from 1500 to the present."
  },
  {
    "name": "Intro to Biology",
    "code": "BIO105",
    "credits": 1,
    "description": "Foundational concepts of cellular biology, genetics, evolution, and ecology."
  },
  {
    "name": "Digital Photography",
    "code": "ART110",
    "credits": 0.25,
    "description": "Basics of digital camera operation, lighting composition, and introductory photo editing techniques."
  },
  {
    "name": "General Psychology",
    "code": "PSY101",
    "credits": 0.5,
    "description": "Introduction to the scientific study of human behavior, cognition, and mental processes."
  },
  {
    "name": "Microeconomics",
    "code": "ECO201",
    "credits": 0.5,
    "description": "Analysis of individual and firm behavior, supply and demand, and market structures."
  },
  {
    "name": "General Physics",
    "code": "PHYS200",
    "credits": 1,
    "description": "Calculus-based physics covering mechanics, thermodynamics, and wave motion."
  },
  {
    "name": "Music Appreciation",
    "code": "MUS105",
    "credits": 0.25,
    "description": "Exploration of musical forms, styles, and historical contexts across various cultures and eras."
  },
  {
    "name": "Database Management Systems",
    "code": "CS310",
    "credits": 1,
    "description": "Principles of database design, SQL, normalization, and modern data storage solutions."
  },
  {
    "name": "Intro to Philosophy",
    "code": "PHIL101",
    "credits": 0.5,
    "description": "Examination of fundamental philosophical questions regarding existence, knowledge, and ethics."
  },
  {
    "name": "General Chemistry",
    "code": "CHEM110",
    "credits": 1,
    "description": "Study of atomic structure, chemical bonding, reactions, and stoichiometry."
  },
  {
    "name": "Intro to Sociology",
    "code": "SOC101",
    "credits": 0.5,
    "description": "Overview of social structures, institutions, cultural norms, and human interactions."
  }
];

function App() {
  const [schedule, setSchedule] = useState(() => Array.from({length: 4}, () => Array.from({length: 3}, () => [{"name": "Intro to Python", "code": "CS120", "credits": 1, "description": "Foundation in structured and object-oriented programming methodology with a high-level language. Special emphasis on decision and looping structures, subprograms and objects used in development of computer programs. Focus on algorithm development and a variety of applications provides basis for more advanced courses."}, {"name": "Data Structures and Algorithms", "code": "CS220", "credits": 1, "description": "In-depth study of data structures such as stacks, queues, linked lists, trees, and graphs. Includes the analysis of algorithm complexity, sorting, and searching techniques. Emphasizes writing efficient and scalable code."}])))
  
  return (
    <div className="app-container">
      <nav className="top-nav">
        <h1>Course Scheduler</h1>
        <p>Student Name: Chad Quick</p>
      </nav>
      <main className="main-container">
        <div className="availableCourses">
          <AvailableCourses courseList={COURSES}/>
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