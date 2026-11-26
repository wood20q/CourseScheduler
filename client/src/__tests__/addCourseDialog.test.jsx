import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AddCourseDialog from '../components/AddCourseDialog';

describe('AddCourseDialog Requirement Validation & Waiver Workflow (Issue #20)', () => {
  const sampleCourse = {
    code: 'CS220',
    name: 'Data Structures and Algorithms',
    credits: 1,
    prerequisites: ['CS120']
  };

  const coreqCourse = {
    code: 'PHYS200',
    name: 'General Physics',
    credits: 1,
    corequisites: ['MATH101']
  };

  const catalogWithRules = [
    { code: 'CS120', name: 'Intro to Python', credits: 1, prerequisites: [] },
    { code: 'CS220', name: 'Data Structures and Algorithms', credits: 1, prerequisites: ['CS120'] },
    { code: 'MATH101', name: 'Calculus I', credits: 1, prerequisites: [] },
    { code: 'PHYS200', name: 'General Physics', credits: 1, corequisites: ['MATH101'] }
  ];

  const emptySchedule = {
    transferCourses: [],
    years: [
      [[], [], []],
      [[], [], []],
      [[], [], []],
      [[], [], []]
    ]
  };

  const scheduleWithPrereqInTerm1 = {
    transferCourses: [],
    years: [
      [[{ code: 'CS120', name: 'Intro to Python', credits: 1 }], [], []],
      [[], [], []],
      [[], [], []],
      [[], [], []]
    ]
  };

  const scheduleWithTransferCredit = {
    transferCourses: [
      { code: 'AP-CALC', name: 'AP Calculus BC', credits: 1, satisfiesCourse: 'MATH101' }
    ],
    years: [
      [[], [], []],
      [[], [], []],
      [[], [], []],
      [[], [], []]
    ]
  };

  it('renders Requirement Audit card with missing status and disables submit button when requirements are unmet', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <AddCourseDialog
        course={sampleCourse}
        schedule={emptySchedule}
        catalogCourses={catalogWithRules}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    // Audit card should show Incomplete
    expect(screen.getByText(/Requirement Audit/i)).toBeInTheDocument();
    expect(screen.getByText(/Requirements Incomplete/i)).toBeInTheDocument();
    expect(screen.getByText(/Prerequisite/i)).toBeInTheDocument();
    expect(screen.getAllByText(/CS120/i).length).toBeGreaterThan(0);

    // Submit button should be disabled
    const submitBtn = screen.getByTestId('submit-add-course-disabled');
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent(/Requires Waiver/i);

    // Checking the waiver checkbox enables the waived submission button
    const checkbox = screen.getByTestId('waiver-checkbox');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    const waivedBtn = screen.getByTestId('submit-add-course-waived');
    expect(waivedBtn).toBeInTheDocument();
    fireEvent.click(waivedBtn);

    expect(onConfirm).toHaveBeenCalledWith([0, 0], expect.objectContaining({
      code: 'CS220',
      isWaived: true
    }));
    expect(onClose).toHaveBeenCalled();
  });

  it('dynamically updates audit card to Eligible and enables standard submission when prereq is fulfilled in target term', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <AddCourseDialog
        course={sampleCourse}
        schedule={scheduleWithPrereqInTerm1}
        catalogCourses={catalogWithRules}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    // Initially in Term 1: CS120 is taken in Term 1, but prereqs must precede Term 1 -> Incomplete
    expect(screen.getByText(/Requirements Incomplete/i)).toBeInTheDocument();

    // Switch to Term 2 (where CS120 was completed in Term 1)
    const termSelect = screen.getByLabelText(/Term:/i);
    fireEvent.change(termSelect, { target: { value: '1' } }); // Term 2 (index 1)

    // Audit card should now show Eligible
    expect(screen.getByText(/Eligible/i)).toBeInTheDocument();
    expect(screen.queryByTestId('waiver-checkbox')).not.toBeInTheDocument();

    const submitBtn = screen.getByTestId('submit-add-course');
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    expect(onConfirm).toHaveBeenCalledWith([0, 1], expect.objectContaining({
      code: 'CS220'
    }));
    expect(onConfirm.mock.calls[0][1].isWaived).toBeFalsy();
    expect(onClose).toHaveBeenCalled();
  });

  it('satisfies requirements in all terms when covered by Pre-College Transfer Credits', () => {
    const onConfirm = vi.fn();

    render(
      <AddCourseDialog
        course={coreqCourse}
        schedule={scheduleWithTransferCredit}
        catalogCourses={catalogWithRules}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    // MATH101 satisfied via AP-CALC
    expect(screen.getByText(/Eligible/i)).toBeInTheDocument();
    expect(screen.getByText('Satisfied (Pre-College / Transfer Credits - AP-CALC)')).toBeInTheDocument();
    expect(screen.queryByTestId('waiver-checkbox')).not.toBeInTheDocument();

    const submitBtn = screen.getByTestId('submit-add-course');
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    expect(onConfirm).toHaveBeenCalledWith([0, 0], expect.objectContaining({
      code: 'PHYS200'
    }));
  });

  it('displays transfer course code and location label when prerequisite is satisfied via equivalency', () => {
    const courseWithPrereq = {
      code: 'MATH201',
      name: 'Calculus II',
      credits: 1,
      prerequisites: ['MATH101']
    };

    render(
      <AddCourseDialog
        course={courseWithPrereq}
        schedule={scheduleWithTransferCredit}
        catalogCourses={catalogWithRules}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText(/Eligible/i)).toBeInTheDocument();
    expect(screen.getByText('Satisfied (Pre-College / Transfer Credits - AP-CALC)')).toBeInTheDocument();
  });

  it('closes dialog when Close button is clicked', () => {
    const onClose = vi.fn();

    render(
      <AddCourseDialog
        course={sampleCourse}
        schedule={emptySchedule}
        catalogCourses={catalogWithRules}
        onClose={onClose}
        onConfirm={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
