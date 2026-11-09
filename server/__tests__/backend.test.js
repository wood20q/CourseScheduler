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