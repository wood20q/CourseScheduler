import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ManageCourseDialog from '../components/ManageCourseDialog';

describe('ManageCourseDialog - Finalized Variant D Workflow (Issue #21)', () => {
  const catalog = [
    { code: 'CS120', name: 'Intro to Python', prerequisites: [], corequisites: [] },
    { code: 'CS220', name: 'Data Structures', prerequisites: ['CS120'], corequisites: [] },
    { code: 'CS310', name: 'Databases', prerequisites: ['CS220'], corequisites: [] },
    { code: 'ART110', name: 'Photography', prerequisites: [], corequisites: [] }
  ];

  // CS120 in Year 1 Term 1, CS220 in Year 1 Term 2
  const scheduleWithDependencies = {
    transferCourses: [],
    years: [
      [
        [{ code: 'CS120', name: 'Intro to Python', credits: 1 }],
        [{ code: 'CS220', name: 'Data Structures', credits: 1 }],
        []
      ],
      [[], [], []],
      [[], [], []],
      [[], [], []]
    ]
  };

  it('renders course information, satisfied status, and safe timeline when requirements are met', () => {
    const course = scheduleWithDependencies.years[0][0][0];

    render(
      <ManageCourseDialog
        course={course}
        schedule={scheduleWithDependencies}
        catalogCourses={catalog}
        onClose={vi.fn()}
        onRemove={vi.fn()}
        onMove={vi.fn()}
        onToggleWaiver={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /Course Details/i })).toBeInTheDocument();
    expect(screen.getByText(/CS120:/i)).toBeInTheDocument();
    expect(screen.getByText(/Intro to Python/i)).toBeInTheDocument();
    expect(screen.getByText(/✅ Requirements Met/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Advisor Requirement Waiver/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Safe Mutation: No downstream courses affected/i)).toBeInTheDocument();
  });

  it('displays real-time downstream conflict timeline and requires acknowledgment before moving', () => {
    const onMove = vi.fn();
    const course = scheduleWithDependencies.years[0][0][0];

    render(
      <ManageCourseDialog
        course={course}
        schedule={scheduleWithDependencies}
        catalogCourses={catalog}
        onClose={vi.fn()}
        onRemove={vi.fn()}
        onMove={onMove}
        onToggleWaiver={vi.fn()}
      />
    );

    // Select target year: Year 2 (causes downstream conflict with CS220)
    const yearSelect = screen.getByLabelText(/Target Year:/i);
    fireEvent.change(yearSelect, { target: { value: '1' } });

    // Live timeline should appear
    expect(screen.getByText(/Schedule Impact: 1 Downstream Course\(s\) Broken/i)).toBeInTheDocument();
    expect(screen.getAllByText(/CS220/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Allow downstream prerequisite flags/i)).toBeInTheDocument();

    // Submit button should be disabled until acknowledgment
    const moveBtn = screen.getByRole('button', { name: /⚡ Move Course \(With Warnings\)/i });
    expect(moveBtn).toBeDisabled();

    // Check acknowledgment checkbox
    fireEvent.click(screen.getByLabelText(/Allow downstream prerequisite flags/i));
    expect(moveBtn).not.toBeDisabled();

    fireEvent.click(moveBtn);
    expect(onMove).toHaveBeenCalledWith([1, 0], 'CS120');
  });

  it('displays warning in confirmation box when removing a course with downstream dependents', () => {
    const onRemove = vi.fn();
    const course = scheduleWithDependencies.years[0][0][0];

    render(
      <ManageCourseDialog
        course={course}
        schedule={scheduleWithDependencies}
        catalogCourses={catalog}
        onClose={vi.fn()}
        onRemove={onRemove}
        onMove={vi.fn()}
        onToggleWaiver={vi.fn()}
      />
    );

    // Click remove button
    fireEvent.click(screen.getByRole('button', { name: /Remove Course from Schedule/i }));

    // Warning should appear in delete confirmation
    expect(screen.getByText(/Removing this course invalidates prerequisites for/i)).toBeInTheDocument();
    expect(screen.getByText(/downstream course\(s\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Affected courses will remain on the schedule with ⚠️ Missing Req flags/i)).toBeInTheDocument();

    // Confirm removal
    fireEvent.click(screen.getByRole('button', { name: /Yes, Remove Course/i }));
    expect(onRemove).toHaveBeenCalledWith('CS120');
  });

  it('displays waiver checkbox when course has unmet requirements and calls onToggleWaiver', () => {
    const onToggleWaiver = vi.fn();
    const unmetSchedule = {
      transferCourses: [],
      years: [
        [
          [{ code: 'CS220', name: 'Data Structures', credits: 1 }],
          [],
          []
        ],
        [[], [], []],
        [[], [], []],
        [[], [], []]
      ]
    };

    render(
      <ManageCourseDialog
        course={unmetSchedule.years[0][0][0]}
        schedule={unmetSchedule}
        catalogCourses={catalog}
        onClose={vi.fn()}
        onRemove={vi.fn()}
        onMove={vi.fn()}
        onToggleWaiver={onToggleWaiver}
      />
    );

    expect(screen.getByText(/⚠️ Requirements Incomplete/i)).toBeInTheDocument();
    expect(screen.getByText(/Missing:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/CS120/i).length).toBeGreaterThan(0);

    const waiverBox = screen.getByLabelText(/Advisor Requirement Waiver/i);
    expect(waiverBox).not.toBeChecked();

    fireEvent.click(waiverBox);
    expect(onToggleWaiver).toHaveBeenCalledWith('CS220');
  });

  it('immediately updates UI from waived to incomplete when unchecking waiver without re-opening dialog', () => {
    let currentSchedule = {
      transferCourses: [],
      years: [
        [
          [{ code: 'CS220', name: 'Data Structures', credits: 1, isWaived: true }],
          [],
          []
        ],
        [[], [], []],
        [[], [], []],
        [[], [], []]
      ]
    };

    const handleToggle = vi.fn((code) => {
      currentSchedule = {
        ...currentSchedule,
        years: currentSchedule.years.map(y =>
          y.map(t =>
            t.map(c => (c.code === code ? { ...c, isWaived: !c.isWaived } : c))
          )
        )
      };
    });

    const { rerender } = render(
      <ManageCourseDialog
        course={currentSchedule.years[0][0][0]}
        schedule={currentSchedule}
        catalogCourses={catalog}
        onClose={vi.fn()}
        onRemove={vi.fn()}
        onMove={vi.fn()}
        onToggleWaiver={handleToggle}
      />
    );

    // Initially waived
    expect(screen.getByText(/🏷️ Waived by Override/i)).toBeInTheDocument();
    expect(screen.getByText(/Waived requirement:/i)).toBeInTheDocument();
    const waiverBox = screen.getByLabelText(/Advisor Requirement Waiver/i);
    expect(waiverBox).toBeChecked();

    // Click to uncheck
    fireEvent.click(waiverBox);
    expect(handleToggle).toHaveBeenCalledWith('CS220');

    // Rerender with updated schedule
    rerender(
      <ManageCourseDialog
        course={currentSchedule.years[0][0][0]}
        schedule={currentSchedule}
        catalogCourses={catalog}
        onClose={vi.fn()}
        onRemove={vi.fn()}
        onMove={vi.fn()}
        onToggleWaiver={handleToggle}
      />
    );

    // Status flips immediately to incomplete
    expect(screen.getByText(/⚠️ Requirements Incomplete/i)).toBeInTheDocument();
    expect(screen.getByText(/Missing:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/CS120/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Advisor Requirement Waiver/i)).not.toBeChecked();
  });
});
