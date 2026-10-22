import CourseCard from "./CourseCard"

function Term({ termLabel }) {
    return (
        <div className="term">
            <p>{termLabel}</p>
            <hr />
            <CourseCard name={"Intro to Python"} code={"CS120"} credits={1} description={"Foundation in structured and object-oriented programming methodology with a high-level language. Special emphasis on decision and looping structures, subprograms and objects used in development of computer programs. Focus on algorithm development and a variety of applications provides basis for more advanced courses."}/>
        </div>
    )
}

export default Term