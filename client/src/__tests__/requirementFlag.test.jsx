import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CourseCard from '../components/CourseCard';
import RequirementFlag from '../components/RequirementFlag';
import RequirementInspectorModal from '../components/RequirementInspectorModal';

describe('Requirement Flag & Inspector Modal', () => {
  const sampleValidation = {
    hasFlag: true,
    overallStatus: 'UNSATISFIED',
    missingSummary: 'Prereq: CS120',
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
