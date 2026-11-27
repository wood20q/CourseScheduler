import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CourseCard from '../components/CourseCard';
import RequirementFlag from '../components/RequirementFlag';
import RequirementInspectorModal from '../components/RequirementInspectorModal';
import { validateSchedule } from '../utils/requirementEngine';

describe('Requirement Flag & Inspector Modal', () => {
  const sampleValidation = {
    hasFlag: true,
    overallStatus: 'UNSATISFIED',
    missingSummary: 'Prerequisite: CS120',
    prereqResult: { status: 'UNSATISFIED', missingSummary: 'CS120' },
    coreqResult: { status: 'SATISFIED', missingSummary: 'None' }
  };

  const waivedValidation = {
    hasFlag: true,
    overallStatus: 'WAIVED',
    missingSummary: 'Waived',
    prereqResult: { status: 'WAIVED', missingSummary: 'CS120 (Waived)' },
    coreqResult: { status: 'SATISFIED', missingSummary: 'None' }
  };

  const satisfiedValidation = {
    hasFlag: false,
    overallStatus: 'SATISFIED',
    missingSummary: 'All requirements satisfied',
    prereqResult: { isSatisfied: true, status: 'SATISFIED', missingSummary: 'Fulfilled' },
    coreqResult: { isSatisfied: true, status: 'SATISFIED', missingSummary: 'Fulfilled' }
  };

  const course = {
    code: 'CS220',
    name: 'Data Structures and Algorithms',
    credits: 1,
    description: 'In-depth study of algorithms'
  };

  describe('RequirementFlag Pill', () => {
    it('renders unsatisfied rounded pill badge and triggers onInspect on click', () => {
      const onInspect = vi.fn();
      render(<RequirementFlag validation={sampleValidation} course={course} onInspect={onInspect} />);
      const badge = screen.getByText('⚠️ Missing Req');
      expect(badge).toBeInTheDocument();
      expect(badge.tagName).toBe('BUTTON');

      // Click pill to open inspector modal
      fireEvent.click(badge);
      expect(onInspect).toHaveBeenCalledWith(course, sampleValidation);
    });

    it('renders waived pill badge for waived courses', () => {
      render(<RequirementFlag validation={waivedValidation} course={course} />);
      expect(screen.getByText('🏷️ Waived')).toBeInTheDocument();
    });

    it('does not render pill badge when hasFlag is false', () => {
      const { container } = render(<RequirementFlag validation={satisfiedValidation} course={course} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('RequirementInspectorModal', () => {
    it('renders modal and triggers waiver toggle for unsatisfied course', () => {
      const onToggleWaiver = vi.fn();
      const onClose = vi.fn();

      render(
        <RequirementInspectorModal 
          course={course}
          validation={sampleValidation}
          onClose={onClose}
          onToggleWaiver={onToggleWaiver}
        />
      );

      expect(screen.getByText('Requirement Audit')).toBeInTheDocument();
      const waiveBtn = screen.getByRole('button', { name: /Waive Requirements/i });
      fireEvent.click(waiveBtn);

      expect(onToggleWaiver).toHaveBeenCalledWith('CS220');
      expect(onClose).toHaveBeenCalled();
    });

    it('renders Revoke Requirement Waiver when course has waived status', () => {
      const onToggleWaiver = vi.fn();

      render(
        <RequirementInspectorModal 
          course={course}
          validation={waivedValidation}
          onClose={vi.fn()}
          onToggleWaiver={onToggleWaiver}
        />
      );

      const revokeBtn = screen.getByRole('button', { name: /Revoke Requirement Waiver/i });
      expect(revokeBtn).toBeInTheDocument();
      fireEvent.click(revokeBtn);

      expect(onToggleWaiver).toHaveBeenCalledWith('CS220');
    });

    it('does not render waiver button when requirements are satisfied', () => {
      render(
        <RequirementInspectorModal 
          course={course}
          validation={satisfiedValidation}
          onClose={vi.fn()}
          onToggleWaiver={vi.fn()}
        />
      );

      expect(screen.getByText('Requirement Audit')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Waive Requirements/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Revoke Requirement Waiver/i })).not.toBeInTheDocument();
    });

    it('itemizes specific waived prerequisite and corequisite course codes in modal audit sections', () => {
      const waivedWithBreakdown = {
        hasFlag: true,
        overallStatus: 'WAIVED',
        isWaived: true,
        missingSummary: 'Waived by advisor waiver',
        unfulfilledSummary: 'Prerequisite: CS120; Corequisite: CS125',
        prereqResult: {
          status: 'WAIVED',
          isWaived: true,
          unfulfilledSummary: 'CS120',
          missingSummary: 'Waived by advisor waiver'
        },
        coreqResult: {
          status: 'WAIVED',
          isWaived: true,
          unfulfilledSummary: 'CS125',
          missingSummary: 'Waived by advisor waiver'
        }
      };

      render(
        <RequirementInspectorModal
          course={course}
          validation={waivedWithBreakdown}
          onClose={vi.fn()}
          onToggleWaiver={vi.fn()}
        />
      );

      expect(screen.getByText('CS120 (Waived by Advisor)')).toBeInTheDocument();
      expect(screen.getByText('CS125 (Waived by Advisor)')).toBeInTheDocument();
    });

    it('itemizes waived prerequisite and displays fulfilled for satisfied corequisite', () => {
      const waivedPrereqSatisfiedCoreq = {
        hasFlag: true,
        overallStatus: 'WAIVED',
        isWaived: true,
        missingSummary: 'Waived by advisor waiver',
        unfulfilledSummary: 'Prerequisite: CS120',
        prereqResult: {
          status: 'WAIVED',
          isWaived: true,
          unfulfilledSummary: 'CS120',
          missingSummary: 'Waived by advisor waiver'
        },
        coreqResult: {
          status: 'SATISFIED',
          isWaived: true,
          isSatisfied: true,
          unfulfilledSummary: '',
          missingSummary: 'Fulfilled'
        }
      };

      render(
        <RequirementInspectorModal
          course={course}
          validation={waivedPrereqSatisfiedCoreq}
          onClose={vi.fn()}
          onToggleWaiver={vi.fn()}
        />
      );

      expect(screen.getByText('CS120 (Waived by Advisor)')).toBeInTheDocument();
      expect(screen.getByText('Fulfilled')).toBeInTheDocument();
    });

    it('renders end-to-end audit breakdown from validateSchedule for waived course', () => {
      const catalog = [
        { code: 'CS120', prerequisites: [] },
        { code: 'CS220', prerequisites: ['CS120'], corequisites: [] }
      ];
      const schedule = {
        transferCourses: [],
        years: [
          [
            [{ code: 'CS220', isWaived: true }],
            [],
            []
          ],
          [[], [], []],
          [[], [], []],
          [[], [], []]
        ]
      };
      const validationReport = validateSchedule(schedule, catalog);
      const cs220Diag = validationReport.diagnostics.find(d => d.courseCode === 'CS220');

      render(
        <RequirementInspectorModal
          course={{ code: 'CS220', name: 'Data Structures and Algorithms' }}
          validation={cs220Diag}
          onClose={vi.fn()}
          onToggleWaiver={vi.fn()}
        />
      );

      expect(screen.getByText('CS120 (Waived by Advisor)')).toBeInTheDocument();
      expect(screen.getByText('No requirements needed')).toBeInTheDocument();
    });
  });

  describe('CourseCard Integration', () => {
    it('applies has-unsatisfied-req class when validation is unsatisfied', () => {
      const { container } = render(
        <CourseCard 
          course={course} 
          validation={sampleValidation} 
        />
      );
      expect(container.firstChild).toHaveClass('has-unsatisfied-req');
      expect(screen.getByText('⚠️ Missing Req')).toBeInTheDocument();
    });

    it('does not render flag badge when validation hasFlag is false', () => {
      render(
        <CourseCard 
          course={course} 
          validation={satisfiedValidation} 
        />
      );
      expect(screen.queryByText('⚠️ Missing Req')).not.toBeInTheDocument();
      expect(screen.queryByText('✓ Req Met')).not.toBeInTheDocument();
    });
  });
});
