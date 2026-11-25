import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CourseCard from '../components/CourseCard';
import { 
  VariantAFlag, 
  VariantBStrip, 
  VariantCChip, 
  RequirementInspectorModal 
} from '../components/prototypes/RequirementFlagVariants';

describe('Requirement Flag Variants', () => {
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

  const course = {
    code: 'CS220',
    name: 'Data Structures and Algorithms',
    credits: 1,
    description: 'In-depth study of algorithms'
  };

  describe('Variant A (Pill & Modal)', () => {
    it('renders unsatisfied rounded pill badge and triggers onInspect on click', () => {
      const onInspect = vi.fn();
      render(<VariantAFlag validation={sampleValidation} course={course} onInspect={onInspect} />);
      const badge = screen.getByText('⚠️ Missing Req');
      expect(badge).toBeInTheDocument();
      expect(badge.tagName).toBe('BUTTON');

      // Click pill to open inspector modal
      fireEvent.click(badge);
      expect(onInspect).toHaveBeenCalledWith(course, sampleValidation);
    });

    it('renders waived pill badge for waived courses', () => {
      render(<VariantAFlag validation={waivedValidation} course={course} />);
      expect(screen.getByText('🏷️ Waived')).toBeInTheDocument();
    });
  });

  describe('Variant B (Banner & Collapsible Drawer)', () => {
    it('renders banner and toggles drawer', () => {
      render(<VariantBStrip validation={sampleValidation} />);
      expect(screen.getByText('⚠️ Unsatisfied Requirements')).toBeInTheDocument();
      
      const toggleBtn = screen.getByRole('button', { name: /Details/i });
      fireEvent.click(toggleBtn);

      expect(screen.getByText(/Prereq: CS120/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Hide/i })).toBeInTheDocument();
    });
  });

  describe('Variant C (Action Chip & Inspector Modal)', () => {
    it('renders action chip and triggers onInspect when clicked', () => {
      const onInspect = vi.fn();
      render(<VariantCChip validation={sampleValidation} course={course} onInspect={onInspect} />);
      
      const chip = screen.getByRole('button', { name: /Missing Requirements/i });
      fireEvent.click(chip);
      expect(onInspect).toHaveBeenCalledWith(course, sampleValidation);
    });

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
      const satisfiedValidation = {
        hasFlag: false,
        overallStatus: 'SATISFIED',
        missingSummary: 'All requirements satisfied',
        prereqResult: { isSatisfied: true, status: 'SATISFIED', missingSummary: 'Fulfilled' },
        coreqResult: { isSatisfied: true, status: 'SATISFIED', missingSummary: 'Fulfilled' }
      };

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
          variant="A"
        />
      );
      expect(container.firstChild).toHaveClass('has-unsatisfied-req');
      expect(screen.getByText('⚠️ Missing Req')).toBeInTheDocument();
    });
  });
});
