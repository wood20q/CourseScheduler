import Term from "./Term"

function Year({ yearNumber, yearList }) {
    const yearCredits = yearList.flat().reduce((sum, course) => sum += course.credits, 0)
    return (
        <div className="yearBlock">
            <div className="yearLabel">
                <h1>Year {yearNumber}</h1>
                <p>Credits in Year: {yearCredits}</p>
            </div>
            <div className="termBlock">
                {yearList.map((termList, i) => (
                    <Term key={i} termLabel={`Term: ${i+1}`} termList={termList}/>
                ))}
            </div>
        </div>
    )
}

export default Year