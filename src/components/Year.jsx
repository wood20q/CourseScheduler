import Term from "./Term"

function Year({ yearNumber }) {
    return (
        <div className="yearBlock">
            <h1 className="yearLabel">Year {yearNumber}</h1>
            <div className="termBlock">
                <Term termLabel={"Fall"}/>
                <Term termLabel={"Winter"}/>
                <Term termLabel={"May"}/>
            </div>
        </div>
    )
}

export default Year