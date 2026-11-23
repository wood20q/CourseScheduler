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

describe('Issue #11 - Pre-College Transfer Credits Section & Transfer Course Creation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    scheduleApi.fetchCourses.mockResolvedValue([
      { code: 'CS101', name: 'Intro CS', credits: 3, description: 'Intro' }
    ]);
  });

  it('renders Pre-College Transfer Credits section above Year 1 with empty state placeholder', async () => {
    render(<App />);

    expect(await screen.findByText(/Pre-College \/ Transfer Credits/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Add Transfer Credits/i })).toBeInTheDocument();
    expect(screen.getByText('Year 1')).toBeInTheDocument();
  });

  it('renders "+ Add Transfer Course" button at the top of Available Courses sidebar', async () => {
    render(<App />);

    expect(await screen.findByRole('button', { name: /\+ Add Transfer Course/i })).toBeInTheDocument();
  });

  it('opens Add Transfer Course dialog and allows creating a pre-college transfer course', async () => {
    render(<App />);

    const addTransferBtn = await screen.findByRole('button', { name: /\+ Add Transfer Course/i });
    fireEvent.click(addTransferBtn);

    expect(screen.getByRole('heading', { name: /Add Transfer Course/i })).toBeInTheDocument();

    // Fill in required and optional fields
    fireEvent.change(screen.getByLabelText(/Course Code/i), { target: { value: 'AP-CALC' } });
    fireEvent.change(screen.getByLabelText(/Course Title/i), { target: { value: 'AP Calculus BC' } });
    fireEvent.change(screen.getByLabelText(/Credits/i), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/Originating Institution/i), { target: { value: 'College Board' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Exam score of 5' } });

    // Target location should default to Pre-College
    const locationSelect = screen.getByLabelText(/Target Location/i);
    expect(locationSelect.value).toBe('transfer');

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /^Add Transfer Course$/i }));

    // Course card should appear in the Pre-College section with "Transfer" badge
    await waitFor(() => {
      expect(screen.getByText('AP-CALC')).toBeInTheDocument();
      expect(screen.getByText('AP Calculus BC')).toBeInTheDocument();
      expect(screen.getByText('Transfer')).toBeInTheDocument();
    });

    // Transfer subtotal and total credits should reflect 4 credits
    expect(screen.getByText(/Total Credits:\s*4/i)).toBeInTheDocument();
    expect(screen.getByText(/Transfer Credits:\s*4/i)).toBeInTheDocument();

    // Check persistence in localStorage
    const saved = JSON.parse(localStorage.getItem('course_scheduler_data'));
    expect(saved.transferCourses).toHaveLength(1);
    expect(saved.transferCourses[0].code).toBe('AP-CALC');
    expect(saved.transferCourses[0].isTransfer).toBe(true);
  });

  it('allows creating a transfer course targeted to a regular year and term', async () => {
    render(<App />);

    const addTransferBtn = await screen.findByRole('button', { name: /\+ Add Transfer Course/i });
    fireEvent.click(addTransferBtn);

    fireEvent.change(screen.getByLabelText(/Course Code/i), { target: { value: 'CC-CS1' } });
    fireEvent.change(screen.getByLabelText(/Course Title/i), { target: { value: 'Community College CS' } });
    fireEvent.change(screen.getByLabelText(/Credits/i), { target: { value: '3' } });

    // Select Year 2 Term 3 (1, 2)
    fireEvent.change(screen.getByLabelText(/Target Location/i), { target: { value: '1,2' } });

    fireEvent.click(screen.getByRole('button', { name: /^Add Transfer Course$/i }));

    await waitFor(() => {
      expect(screen.getByText('CC-CS1')).toBeInTheDocument();
      expect(screen.getByText('Transfer')).toBeInTheDocument();
    });

    const saved = JSON.parse(localStorage.getItem('course_scheduler_data'));
    expect(saved.years[1][2]).toHaveLength(1);
    expect(saved.years[1][2][0].code).toBe('CC-CS1');
    expect(saved.years[1][2][0].isTransfer).toBe(true);
  });
});
