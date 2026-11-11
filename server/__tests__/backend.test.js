const { addCourse, findCourse, removeCourse, moveCourse } = require("../scheduleService")
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
            .toEqual([0,0,0])
    })

    test('Find Course #2', () => {
        expect(findCourse('mA230', [[[], [], []], [[], [], []], [[], [], []], [[], [{'name':'Intro To Python', 'code':'MA230'}], []]]))
            .toEqual([3,1,0])
    })

    test('Find Course #3', () => {
        expect(findCourse('mA230', [[[], [], []], [[], [], []], [[], [], []], [[], [{'name':'Intro To Python', 'code':'CS120'}, {'name':'Intro To Python', 'code':'MA230'}], []]]))
            .toEqual([3,1,1])
    })

    test('Error: Course not found', () => {
        expect(() => findCourse('MA450', [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]]))
            .toThrow("Course not found in schedule")
    })  
})

describe('removeCourse', () => {
    test('Remove Course #1', () => {
        expect(removeCourse('cs120', [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]]))
            .toEqual([[[], [], []], [[], [], []], [[], [], []], [[], [], []]])
    })

    test('Remove Course #2', () => {
        expect(removeCourse('mA230', [[[], [], []], [[], [], []], [[], [], []], [[], [{'name':'Intro To Python', 'code':'MA230'}], []]]))
            .toEqual([[[], [], []], [[], [], []], [[], [], []], [[], [], []]])
    })

    test('Remove Course #3', () => {
        expect(removeCourse('mA230', [[[], [], []], [[], [], []], [[], [], []], [[], [{'name':'Intro To Python', 'code':'CS120'}, {'name':'Intro To Python', 'code':'MA230'}], []]]))
            .toEqual([[[], [], []], [[], [], []], [[], [], []], [[], [{'name':'Intro To Python', 'code':'CS120'}], []]])
    })

    test('Error: Course not found', () => {
        expect(() => removeCourse('MA450', [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]]))
            .toThrow("Course not found in schedule")
    })

    test('Does not mutate the original schedule', () => {
        const original = [[[{ name: 'Intro To Python', code: 'CS120' }], [], []], [[], [], []], [[], [], []], [[], [], []]];
        const updated = removeCourse('CS120', original);

        expect(updated[0][0].length).toBe(0);
        expect(original[0][0].length).toBe(1);
    })

    test('Remove First Course in a Term with Multiple Courses', () => {
        const scheduleWithMultiple = [[[], [], []], [[], [], []], [[], [], []], [[], [{'name':'Course A', 'code':'CS100'}, {'name':'Course B', 'code':'CS200'}], []]];
        
        expect(removeCourse('CS100', scheduleWithMultiple))
            .toEqual([[[], [], []], [[], [], []], [[], [], []], [[], [{'name':'Course B', 'code':'CS200'}], []]]);
    })

    test('Remove Middle Course in a Term', () => {
        const term = [{'name':'A', 'code':'A1'}, {'name':'B', 'code':'B2'}, {'name':'C', 'code':'C3'}];
        const schedule = [[term, [], []], [[], [], []], [[], [], []], [[], [], []]];

        expect(removeCourse('B2', schedule)[0][0])
            .toEqual([{'name':'A', 'code':'A1'}, {'name':'C', 'code':'C3'}]);
    })

    test('Error: Attempt to remove from an empty schedule', () => {
        const emptySchedule = [[[], [], []], [[], [], []], [[], [], []], [[], [], []]];
        expect(() => removeCourse('CS120', emptySchedule))
            .toThrow("Course not found in schedule");
    })

    test('Remove course with extra whitespace in code', () => {
        const schedule = [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]];
        expect(removeCourse('  cs120  ', schedule)[0][0])
            .toEqual([]);
    })
})

describe('moveCourse', () => {
    // moveCourse(termList, code, schedule)

    test('Move Course within the same year', () => {
        const schedule = [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]];
        expect(moveCourse([0,1], 'CS120', schedule))
            .toEqual([[[], [{'name':'Intro To Python', 'code':'CS120'}], []], [[], [], []], [[], [], []], [[], [], []]]);
    })

    test('Move Course across different years and terms', () => {
        const schedule = [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]];
        expect(moveCourse([3,1], 'CS120', schedule))
            .toEqual([[[], [], []], [[], [], []], [[], [], []], [[], [{'name':'Intro To Python', 'code':'CS120'}], []]]);
    })

    test('Move Course from a term with multiple courses', () => {
        const schedule = [
            [[{'name':'Intro To Python', 'code':'CS120'}, {'name':'Data Structures', 'code':'CS220'}], [], []],
            [[], [], []],
            [[], [], []],
            [[], [], []]
        ];
        expect(moveCourse([1,0], 'CS120', schedule))
            .toEqual([
                [[{'name':'Data Structures', 'code':'CS220'}], [], []],
                [[{'name':'Intro To Python', 'code':'CS120'}], [], []],
                [[], [], []],
                [[], [], []]
            ]);
    })

    test('Move Course to a term that already has courses', () => {
        const schedule = [
            [[{'name':'Intro To Python', 'code':'CS120'}], [], []],
            [[{'name':'Calculus I', 'code':'MA230'}], [], []],
            [[], [], []],
            [[], [], []]
        ];
        expect(moveCourse([1,0], 'CS120', schedule))
            .toEqual([
                [[], [], []],
                [[{'name':'Calculus I', 'code':'MA230'}, {'name':'Intro To Python', 'code':'CS120'}], [], []],
                [[], [], []],
                [[], [], []]
            ]);
    })

    test('Does not mutate the original schedule', () => {
        const original = [[[{ name: 'Intro To Python', code: 'CS120' }], [], []], [[], [], []], [[], [], []], [[], [], []]];
        const updated = moveCourse([0,1], 'CS120', original);

        expect(original[0][0].length).toBe(1);
        expect(original[0][1].length).toBe(0);
        expect(updated[0][0].length).toBe(0);
        expect(updated[0][1].length).toBe(1);
    })

    test('Move course with case insensitivity and extra whitespace', () => {
        const schedule = [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]];
        expect(moveCourse([0,1], '  cs120  ', schedule))
            .toEqual([[[], [{'name':'Intro To Python', 'code':'CS120'}], []], [[], [], []], [[], [], []], [[], [], []]]);
    })

    test('Error: Course not found in schedule', () => {
        const schedule = [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]];
        expect(() => moveCourse([0,1], 'MA450', schedule))
            .toThrow("Course not found in schedule");
    })

    test('Error Catch: Target Year does not exist', () => {
        const schedule = [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]];
        expect(() => moveCourse([4,1], 'CS120', schedule))
            .toThrow("Year doesn't exist in the schedule");
    })

    test('Error Catch: Target Term does not exist', () => {
        const schedule = [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]];
        expect(() => moveCourse([0,4], 'CS120', schedule))
            .toThrow("Term doesn't exist in the schedule");
    })
})