import Term from "./Term";
import { calculateCredits } from "../utils/scheduleMigration";

function Year({ yearNumber, yearList, onCourseClick, onInspectRequirement }) {
    const yearCredits = calculateCredits(yearList.flat());
    return (
        <div className="yearBlock">
            <div className="yearLabel">
                <h1>Year {yearNumber}</h1>
                <p>Credits in Year: {yearCredits}</p>
            </div>
            <div className="termBlock">
                {yearList.map((termList, i) => (
                    <Term 
                        key={i} 
                        termLabel={`Term: ${i+1}`} 
                        termList={termList} 
                        yearIndex={yearNumber - 1} 
                        termIndex={i} 
                        onCourseClick={onCourseClick}
                        onInspectRequirement={onInspectRequirement}
                    />
                ))}
            </div>
        </div>
    );
}

export default Year;
