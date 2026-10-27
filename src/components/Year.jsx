import Term from "./Term"

function Year({ yearNumber }) {
    return (
        <div className="yearBlock">
            <div className="yearLabel">
                <h1>Year {yearNumber}</h1>
                <p>Credits in Year: 6</p>
            </div>
            <div className="termBlock">
                <Term termLabel={"Fall"}/>
                <Term termLabel={"Winter"}/>
                <Term termLabel={"May"}/>
            </div>
        </div>
    )
}

export default Year