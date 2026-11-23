import { useState } from "react";
import CourseCard from "./CourseCard";

function AvailableCourses({ 
    courseList = [], 
    onSelectCourse, 
    onOpenAddTransferCourse,
    schedule = [] 
}) {
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Gather codes of courses already in the schedule
    // And codes of home courses satisfied by transfer courses!
    const placedCodes = new Set(
        schedule.map((course) => course?.code?.toLowerCase().trim()).filter(Boolean)
    );
    // Also include any catalog course satisfied by a placed transfer course
    schedule.forEach((course) => {
        if (course?.satisfiesCourse) {
            placedCodes.add(course.satisfiesCourse.toLowerCase().trim());
        }
    });

    // 2. Filter out already-placed courses
    const unplacedCourses = courseList.filter(
        (course) => course?.code && !placedCodes.has(course.code.toLowerCase().trim())
    );

    // 3. Filter unplaced courses by the search term
    const displayedCourses = unplacedCourses.filter((course) => {
        const term = searchTerm.toLowerCase().trim();
        return (
            (course.code && course.code.toLowerCase().includes(term)) ||
            (course.name && course.name.toLowerCase().includes(term))
        );
    });

    return (
        <>
            <div className="availableCoursesTop">
                <button
                    type="button"
                    className="btn-add-transfer-sidebar"
                    onClick={onOpenAddTransferCourse}
                >
                    + Add Transfer Course
                </button>
            </div>
            <form id="searchForm" onSubmit={(e) => e.preventDefault()}>
                <input 
                    id="searchBox"
                    type="text"
                    placeholder="Search courses..."
                    aria-label="Search courses"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button type="button" onClick={() => setSearchTerm('')}>Clear</button>
                )}
            </form>
            <div className="coursesList">
                {displayedCourses.length > 0 ? (
                    displayedCourses.map((course) => (
                        <CourseCard 
                            key={course.code} 
                            onSelectCourse={onSelectCourse} 
                            name={course.name} 
                            code={course.code} 
                            credits={course.credits} 
                            description={course.description}
                        />
                    ))
                ) : (
                    <p className="noCoursesFound">
                        {searchTerm ? `No courses match "${searchTerm}"` : "No more available courses"}
                    </p>
                )}
            </div>
        </>
    );
}

export default AvailableCourses;
