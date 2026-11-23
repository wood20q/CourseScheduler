import CourseCard from "./CourseCard";
import { calculateCredits } from "../utils/scheduleMigration";

function Term({ termLabel, termList, yearIndex, termIndex, onCourseClick }) {
    const termCredits = calculateCredits(termList);
    return (
        <div className="term">
            <div className="termLabel">
                <h2>{termLabel}</h2>
                <p>Credits in Term: {termCredits}</p>
            </div>
            <hr />
            <div className="courseArea">
                {termList.map((course) => (
                    <CourseCard 
                        key={course.code} 
                        course={course}
                        onClickCourse={(courseData) => onCourseClick ? onCourseClick(courseData, [yearIndex, termIndex]) : undefined}
                    />
                ))}
            </div>
        </div>
    );
}

export default Term;
