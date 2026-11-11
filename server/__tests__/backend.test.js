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

    test('Does not mutate the original schedule', () => {
        const original = [[[], [], []], [[], [], []], [[], [], []], [[], [], []]];
        const updated = addCourse([0, 0], {'name': 'Intro To Python', 'code': 'CS120'}, original);

        expect(original[0][0].length).toBe(0);
        expect(updated[0][0].length).toBe(1);
    })

    test('Error Catch: Negative Year Index', () => {
        expect(() => addCourse([-1, 0], {'name': 'Intro To Python', 'code': 'CS120'}, [[[], [], []], [[], [], []], [[], [], []], [[], [], []]]))
            .toThrow("Year doesn't exist in the schedule");
    })

    test('Error Catch: Negative Term Index', () => {
        expect(() => addCourse([0, -1], {'name': 'Intro To Python', 'code': 'CS120'}, [[[], [], []], [[], [], []], [[], [], []], [[], [], []]]))
            .toThrow("Term doesn't exist in the schedule");
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

    test('Find Course with leading and trailing whitespace in search query', () => {
        expect(findCourse('   cs120   ', [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]]))
            .toEqual([0, 0, 0]);
    })

    test('Find Course when course code in schedule has extra whitespace', () => {
        expect(findCourse('CS120', [[[{'name':'Intro To Python', 'code':'  CS120  '}], [], []], [[], [], []], [[], [], []], [[], [], []]]))
            .toEqual([0, 0, 0]);
    })

    test('Error: Find Course in empty schedule', () => {
        const emptySchedule = [[[], [], []], [[], [], []], [[], [], []], [[], [], []]];
        expect(() => findCourse('CS120', emptySchedule))
            .toThrow("Course not found in schedule");
    })

    test('Safely skips malformed course entries without code', () => {
        const scheduleWithMalformed = [
            [[{ name: 'Incomplete Course' }, {'name':'Intro To Python', 'code':'CS120'}], [], []],
            [[], [], []],
            [[], [], []],
            [[], [], []]
        ];
        expect(findCourse('CS120', scheduleWithMalformed)).toEqual([0, 0, 1]);
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

    test('Remove Last Course in a Term with Multiple Courses', () => {
        const term = [{'name':'A', 'code':'A1'}, {'name':'B', 'code':'B2'}, {'name':'C', 'code':'C3'}];
        const schedule = [[term, [], []], [[], [], []], [[], [], []], [[], [], []]];

        expect(removeCourse('C3', schedule)[0][0])
            .toEqual([{'name':'A', 'code':'A1'}, {'name':'B', 'code':'B2'}]);
    })

    test('Remove Course with mixed casing in code', () => {
        const schedule = [[[{'name':'Intro To Python', 'code':'cs120'}], [], []], [[], [], []], [[], [], []], [[], [], []]];
        expect(removeCourse('CS120', schedule)[0][0])
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

    test('Move Course to the same term', () => {
        const schedule = [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]];
        expect(moveCourse([0, 0], 'CS120', schedule))
            .toEqual([[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]]);
    })

    test('Move Course between terms with multiple existing courses', () => {
        const schedule = [
            [[{'name':'A', 'code':'A1'}, {'name':'B', 'code':'B2'}, {'name':'C', 'code':'C3'}], [], []],
            [[{'name':'D', 'code':'D4'}, {'name':'E', 'code':'E5'}], [], []],
            [[], [], []],
            [[], [], []]
        ];
        const result = moveCourse([1, 0], 'B2', schedule);
        expect(result[0][0]).toEqual([{'name':'A', 'code':'A1'}, {'name':'C', 'code':'C3'}]);
        expect(result[1][0]).toEqual([{'name':'D', 'code':'D4'}, {'name':'E', 'code':'E5'}, {'name':'B', 'code':'B2'}]);
    })

    test('Error Catch: Negative Target Year does not exist', () => {
        const schedule = [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]];
        expect(() => moveCourse([-1, 0], 'CS120', schedule))
            .toThrow("Year doesn't exist in the schedule");
    })

    test('Error Catch: Negative Target Term does not exist', () => {
        const schedule = [[[{'name':'Intro To Python', 'code':'CS120'}], [], []], [[], [], []], [[], [], []], [[], [], []]];
        expect(() => moveCourse([0, -1], 'CS120', schedule))
            .toThrow("Term doesn't exist in the schedule");
    })
})