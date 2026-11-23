import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import * as scheduleApi from '../services/scheduleApi';

vi.mock('../services/scheduleApi', () => ({
  fetchCourses: vi.fn(),
  addCourseToSchedule: vi.fn(),
  removeCourseFromSchedule: vi.fn(),
  moveCourseInSchedule: vi.fn()
}));

describe('Issue #13 - Manage Transfer Courses: Overview Details, Inline Editing, Moving, & Deletion', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    scheduleApi.fetchCourses.mockResolvedValue([
      { code: 'CS101', name: 'Intro CS', credits: 3, description: 'Intro' },
      { code: 'CS120', name: 'Programming II', credits: 4, description: 'Intermediate' }
    ]);
  });

  it('opens Manage Course dialog with full transfer course details when card is clicked', async () => {
    const initialSchedule = {
      transferCourses: [
        {
          code: 'AP-CALC',
          name: 'AP Calculus BC',
          credits: 4,
          institution: 'College Board',
          satisfiesCourse: 'MATH101',
          description: 'Score of 5 on exam',
          isTransfer: true
        }
      ],
      years: Array.from({ length: 4 }, () => Array.from({ length: 3 }, () => []))
    };
    localStorage.setItem('course_scheduler_data', JSON.stringify(initialSchedule));

    render(<App />);

    // Click AP-CALC card in Pre-College section
    const card = await screen.findByText('AP-CALC');
    fireEvent.click(card);

    // Dialog should open
    expect(screen.getByRole('heading', { name: /Course Details/i })).toBeInTheDocument();
    expect(screen.getAllByText(/College Board/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/MATH101/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Score of 5 on exam/i).length).toBeGreaterThan(0);
  });

  it('allows inline editing of transfer course fields and updates schedule', async () => {
    const initialSchedule = {
      transferCourses: [
        {
          code: 'AP-CALC',
          name: 'AP Calculus BC',
          credits: 4,
          institution: 'College Board',
          satisfiesCourse: null,
          description: 'Exam score',
          isTransfer: true
        }
      ],
      years: Array.from({ length: 4 }, () => Array.from({ length: 3 }, () => []))
    };
    localStorage.setItem('course_scheduler_data', JSON.stringify(initialSchedule));

    render(<App />);

    const card = await screen.findByText('AP-CALC');
    fireEvent.click(card);

    // Click Edit Details
    const editBtn = screen.getByRole('button', { name: /Edit Details/i });
    fireEvent.click(editBtn);

    // Change title and credits
    fireEvent.change(screen.getByLabelText(/Edit Title/i), { target: { value: 'AP Calculus AB & BC' } });
    fireEvent.change(screen.getByLabelText(/Edit Credits/i), { target: { value: '5' } });

    // Save changes
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    // Board should update
    await waitFor(() => {
      expect(screen.getByText('AP Calculus AB & BC')).toBeInTheDocument();
      expect(screen.getByText(/Total Credits:\s*5/i)).toBeInTheDocument();
    });

    const saved = JSON.parse(localStorage.getItem('course_scheduler_data'));
    expect(saved.transferCourses[0].name).toBe('AP Calculus AB & BC');
    expect(saved.transferCourses[0].credits).toBe(5);
  });

  it('allows editing transfer course credits to 0.75 and 0.25', async () => {
    const initialSchedule = {
      transferCourses: [
        {
          code: 'LAB-1',
          name: 'Physics Lab',
          credits: 1,
          isTransfer: true
        }
      ],
      years: Array.from({ length: 4 }, () => Array.from({ length: 3 }, () => []))
    };
    localStorage.setItem('course_scheduler_data', JSON.stringify(initialSchedule));

    render(<App />);

    const card = await screen.findByText('LAB-1');
    fireEvent.click(card);

    const editBtn = screen.getByRole('button', { name: /Edit Details/i });
    fireEvent.click(editBtn);

    const creditsInput = screen.getByLabelText(/Edit Credits/i);
    expect(creditsInput).toHaveAttribute('step', '0.25');
    expect(creditsInput).toHaveAttribute('min', '0.25');

    fireEvent.change(creditsInput, { target: { value: '0.75' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/^Credits:\s*0\.75$/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Credits:\s*0\.75/i)).toBeInTheDocument();
    });
  });

  it('moves transfer course between Pre-College and Year/Term slots', async () => {
    const initialSchedule = {
      transferCourses: [
        {
          code: 'AP-CALC',
          name: 'AP Calculus BC',
          credits: 4,
          isTransfer: true
        }
      ],
      years: Array.from({ length: 4 }, () => Array.from({ length: 3 }, () => []))
    };
    localStorage.setItem('course_scheduler_data', JSON.stringify(initialSchedule));

    render(<App />);

    const card = await screen.findByText('AP-CALC');
    fireEvent.click(card);

    // Select Year 3 Term 2 (2, 1) in Move selector
    const locationSelect = screen.getByLabelText(/Target Location:/i);
    fireEvent.change(locationSelect, { target: { value: '2,1' } });

    fireEvent.click(screen.getByRole('button', { name: /^Move Course$/i }));

    // Card should now be in Year 3 Term 2
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('course_scheduler_data'));
      expect(saved.transferCourses).toHaveLength(0);
      expect(saved.years[2][1]).toHaveLength(1);
      expect(saved.years[2][1][0].code).toBe('AP-CALC');
    });
  });

  it('deletes transfer course with confirmation and restores satisfied catalog course', async () => {
    const initialSchedule = {
      transferCourses: [
        {
          code: 'AP-CS',
          name: 'AP Computer Science A',
          credits: 4,
          satisfiesCourse: 'CS101',
          isTransfer: true
        }
      ],
      years: Array.from({ length: 4 }, () => Array.from({ length: 3 }, () => []))
    };
    localStorage.setItem('course_scheduler_data', JSON.stringify(initialSchedule));

    render(<App />);

    // CS101 should be hidden initially
    await waitFor(() => {
      const availableContainer = screen.getByPlaceholderText(/Search courses.../i).closest('.availableCourses');
      expect(availableContainer).not.toHaveTextContent('CS101');
    });

    // Click AP-CS card
    const card = screen.getByText('AP-CS');
    fireEvent.click(card);

    // Click Remove Course from Schedule
    const removeBtn = screen.getByRole('button', { name: /Remove Course/i });
    fireEvent.click(removeBtn);

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: /^Yes, Remove Course$/i });
    fireEvent.click(confirmBtn);

    // AP-CS should be gone
    await waitFor(() => {
      expect(screen.queryByText('AP-CS')).not.toBeInTheDocument();
      expect(screen.getByText(/Total Credits:\s*0/i)).toBeInTheDocument();
    });

    // CS101 should now reappear in Available Courses
    expect(screen.getByText('CS101')).toBeInTheDocument();
  });
});
