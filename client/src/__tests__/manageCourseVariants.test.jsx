import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ManageCourseDialog from '../components/ManageCourseDialog';
import { 
  ManageCourseVariantA, 
  ManageCourseVariantB, 
  ManageCourseVariantC 
} from '../components/prototypes/ManageCourseVariants';

describe('Issue #21 - Downstream Mutation Warnings & Manage Course Waiver Management', () => {
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
        [{ code: 'CS120', name: 'Intro to Python' }],
        [{ code: 'CS220', name: 'Data Structures' }],
        []
      ],
      [[], [], []],
      [[], [], []],
      [[], [], []]
    ]
  };

  describe('Variant A (Inline Accordion & Checkbox)', () => {
    it('detects downstream impact when attempting to move CS120 past CS220 and requires acknowledgment', () => {
      const onMove = vi.fn();
      const course = { code: 'CS120', name: 'Intro to Python', credits: 1, currentTerm: [0, 0] };

      render(
        <ManageCourseVariantA
          course={course}
          schedule={scheduleWithDependencies}
          catalogCourses={catalog}
          onClose={vi.fn()}
          onRemove={vi.fn()}
          onMove={onMove}
          courseValidation={{ overallStatus: 'SATISFIED' }}
        />
      );

      // Select target year: Year 2, Term 1 (after CS220 in Year 1 Term 2)
      const yearSelect = screen.getByLabelText(/Target Year:/i);
      fireEvent.change(yearSelect, { target: { value: '1' } });

      // Warning accordion should appear
      expect(screen.getByText(/Downstream Conflict Warning:/i)).toBeInTheDocument();
      expect(screen.getByText(/downstream scheduled course\(s\)/i)).toBeInTheDocument();

      // Submit button should be disabled until acknowledgment
      const moveBtn = screen.getByRole('button', { name: /Move Course \(With Warnings\)/i });
      expect(moveBtn).toBeDisabled();

      // Check acknowledgment checkbox
      const ackBox = screen.getByLabelText(/I understand affected downstream courses will show ⚠️ Missing Req flags/i);
      fireEvent.click(ackBox);

      // Now button should be enabled
      expect(moveBtn).not.toBeDisabled();
      fireEvent.click(moveBtn);
      expect(onMove).toHaveBeenCalledWith([1, 0], 'CS120');
    });

    it('displays waiver checkbox only when course requirements are unfulfilled', () => {
      const onToggleWaiver = vi.fn();
      const unmetCourse = { code: 'CS220', name: 'Data Structures', credits: 1, currentTerm: [0, 0] };

      const { rerender } = render(
        <ManageCourseVariantA
          course={unmetCourse}
          schedule={{ transferCourses: [], years: [[[], [], []], [[], [], []], [[], [], []], [[], [], []]] }}
          catalogCourses={catalog}
          onClose={vi.fn()}
          onRemove={vi.fn()}
          onMove={vi.fn()}
          onToggleWaiver={onToggleWaiver}
          courseValidation={{ overallStatus: 'UNSATISFIED', missingSummary: 'CS120' }}
        />
      );

      // When unsatisfied, waiver checkbox is present
      const waiverBox = screen.getByLabelText(/Advisor Requirement Waiver/i);
      expect(waiverBox).toBeInTheDocument();
      fireEvent.click(waiverBox);
      expect(onToggleWaiver).toHaveBeenCalledWith('CS220');

      // When requirements are satisfied, waiver checkbox is completely hidden
      rerender(
        <ManageCourseVariantA
          course={unmetCourse}
          schedule={scheduleWithDependencies}
          catalogCourses={catalog}
          onClose={vi.fn()}
          onRemove={vi.fn()}
          onMove={vi.fn()}
          onToggleWaiver={onToggleWaiver}
          courseValidation={{ overallStatus: 'SATISFIED' }}
        />
      );
      expect(screen.queryByLabelText(/Advisor Requirement Waiver/i)).not.toBeInTheDocument();
      expect(screen.getByText(/✅ Requirements Met/i)).toBeInTheDocument();
    });
  });

  describe('Variant B (Interstitial Modal & Audit Card)', () => {
    it('pops up dedicated Interstitial Modal on move conflict with reassurance text', () => {
      const onMove = vi.fn();
      const course = { code: 'CS120', name: 'Intro to Python', credits: 1, currentTerm: [0, 0] };

      render(
        <ManageCourseVariantB
          course={course}
          schedule={scheduleWithDependencies}
          catalogCourses={catalog}
          onClose={vi.fn()}
          onRemove={vi.fn()}
          onMove={onMove}
          courseValidation={{ overallStatus: 'SATISFIED' }}
        />
      );

      // Move to Year 2 Term 1
      fireEvent.change(screen.getByLabelText(/Target Year:/i), { target: { value: '1' } });
      fireEvent.click(screen.getByRole('button', { name: /^Move Course$/i }));

      // Interstitial modal should open
      expect(screen.getByRole('heading', { name: /Downstream Prerequisite Conflict/i })).toBeInTheDocument();
      expect(screen.getByText(/Non-destructive scheduling:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/CS220/i).length).toBeGreaterThan(0);

      // Confirm move in modal
      const confirmBtn = screen.getByRole('button', { name: /Confirm Move & Flag Downstream/i });
      fireEvent.click(confirmBtn);
      expect(onMove).toHaveBeenCalledWith([1, 0], 'CS120');
    });

    it('renders full Requirement Audit card and toggle buttons for unmet courses', () => {
      const onToggleWaiver = vi.fn();
      const cs220 = { code: 'CS220', name: 'Data Structures', credits: 1, currentTerm: [0, 0] };

      render(
        <ManageCourseVariantB
          course={cs220}
          schedule={scheduleWithDependencies}
          catalogCourses={catalog}
          onClose={vi.fn()}
          onRemove={vi.fn()}
          onMove={vi.fn()}
          onToggleWaiver={onToggleWaiver}
          courseValidation={{
            overallStatus: 'UNSATISFIED',
            prereqResult: {
              options: [{ required: ['CS120'], missing: ['CS120'], isSatisfied: false }]
            }
          }}
        />
      );

      expect(screen.getByText(/Requirement Audit/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /⚡ Waive Requirements for this Course/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /⚡ Waive Requirements for this Course/i }));
      expect(onToggleWaiver).toHaveBeenCalledWith('CS220');
    });
  });

  describe('Variant C (Tabbed Console & Impact Timeline)', () => {
    it('switches between Schedule & Location and Requirements & Waivers tabs', () => {
      const course = { code: 'CS120', name: 'Intro to Python', credits: 1, currentTerm: [0, 0] };

      render(
        <ManageCourseVariantC
          course={course}
          schedule={scheduleWithDependencies}
          catalogCourses={catalog}
          onClose={vi.fn()}
          onRemove={vi.fn()}
          onMove={vi.fn()}
          courseValidation={{ overallStatus: 'SATISFIED' }}
        />
      );

      // Default tab is Schedule & Move
      expect(screen.getByRole('heading', { name: /Change Schedule Location/i })).toBeInTheDocument();

      // Switch to Requirements & Waivers tab
      const reqTabBtn = screen.getByRole('button', { name: /📋 Requirements & Waivers/i });
      fireEvent.click(reqTabBtn);

      expect(screen.getByRole('heading', { name: /Prerequisite & Corequisite Diagnostics/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Advisor Waiver Management/i })).toBeInTheDocument();
    });

    it('shows real-time live impact preview timeline when unsafe target location is chosen', () => {
      const course = { code: 'CS120', name: 'Intro to Python', credits: 1, currentTerm: [0, 0] };

      render(
        <ManageCourseVariantC
          course={course}
          schedule={scheduleWithDependencies}
          catalogCourses={catalog}
          onClose={vi.fn()}
          onRemove={vi.fn()}
          onMove={vi.fn()}
          courseValidation={{ overallStatus: 'SATISFIED' }}
        />
      );

      // Initially safe (Year 1 Term 1)
      expect(screen.getByText(/Safe Mutation: No downstream courses affected/i)).toBeInTheDocument();

      // Change target location to Year 2 Term 1
      fireEvent.change(screen.getByLabelText(/Target Year:/i), { target: { value: '1' } });

      // Live timeline lights up
      expect(screen.getByText(/Schedule Impact: 1 Downstream Course\(s\) Broken/i)).toBeInTheDocument();
      expect(screen.getByText(/Allow downstream prerequisite flags/i)).toBeInTheDocument();
    });
  });
});
