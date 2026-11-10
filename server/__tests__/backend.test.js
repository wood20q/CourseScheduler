const { addCourse } = require("../scheduleService")
// Template Schedule: [[[], [], []], [[], [], []], [[], [], []], [[], [], []]]

describe('addCourse', () => {
    test('Add Course #1', () => {
        // addCourse(termList, course, schedule)
        expect(addCourse([0,0], {'name':'Intro To Python', 'code':'CS120'}, [[[], [], []], [[], [], []], [[], [], []], [[], [], []]]))
            .toEqual([[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]])
    })

    test('Add Course #2', () => {
        // addCourse(termList, course, schedule)
        expect(addCourse([3,1], {'name':'Intro To Python', 'code':'CS120'}, [[[], [], []], [[], [], []], [[], [], []], [[], [], []]]))
            .toEqual([[[], [], []], [[], [], []], [[], [], []], [[], [{'name':'Intro To Python', 'code':'CS120'}], []]])
    })

    test('Error Catch #1: Missing Year', () => {
        // addCourse(termList, course, schedule)
        expect(() => {addCourse([4,1], {'name':'Intro To Python', 'code':'CS120'}, [[[], [], []], [[], [], []], [[], [], []], [[], [], []]])})
            .toThrow("Year doesn't exist in the schedule")
    })

    test('Error Catch #2: Missing Term', () => {
        // addCourse(termList, course, schedule)
        expect(() => {addCourse([3,4], {'name':'Intro To Python', 'code':'CS120'}, [[[], [], []], [[], [], []], [[], [], []], [[], [], []]])})
            .toThrow("Term doesn't exist in the schedule")
    })

    test('Add Course to a "Filled" Term', () => {
        // addCourse(termList, course, schedule)
        expect(addCourse([0,0], {'name':'Object Oriented Modeling', 'code':'CS220'}, [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]]))
            .toEqual([[[{'name':'Intro To Python', 'code':'CS120'}, {'name':'Object Oriented Modeling', 'code':'CS220'}], [], []], [[], [], []], [[], [], []], [[], [], []]])
    })

})

describe('findCourse', () => {
    test('Find Course #1', () => {
        expect(findCourse('cs120', [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]]))
            .toEqual([0,0])
    })

    test('Find Course #2', () => {
        expect(findCourse('mA230', [[[], [], []], [[], [], []], [[], [], []], [[], [{'name':'Intro To Python', 'code':'MA230'}], []]]))
            .toEqual([3,1])
    })

    test('Error: Course not found', () => {
        expect(() => findCourse('MA450', [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]]))
            .toThrow("Course not found in schedule")
    })  
})