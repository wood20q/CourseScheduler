import { describe, it, expect } from 'vitest';
import React from 'react';
import Term from '../components/Term';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

describe('Term component (#26)', () => {
  it('simplifies CourseCard key to course.code', () => {
    const termList = [
      { code: 'CS101', name: 'Intro CS', credits: 3 },
      { code: 'CS120', name: 'Intermediate CS', credits: 4, variant: 'B' }
    ];
    const tree = Term({
      termLabel: 'Term: 1',
      termList,
      yearIndex: 0,
      termIndex: 0
    });
    const courseArea = tree.props.children.find(child => child && child.props && child.props.className === 'courseArea');
    expect(courseArea).toBeDefined();
    const rawChildren = courseArea.props.children;
    expect(rawChildren[0].key).toBe('CS101');
    expect(rawChildren[1].key).toBe('CS120');
  });

  it('renders courses correctly in Term and calculates credits', () => {
    const termList = [
      { code: 'CS101', name: 'Intro CS', credits: 3 },
      { code: 'CS120', name: 'Intermediate CS', credits: 4 }
    ];
    render(
      <Term
        termLabel="Term: 1"
        termList={termList}
        yearIndex={0}
        termIndex={0}
      />
    );
    expect(screen.getByText('Term: 1')).toBeInTheDocument();
    expect(screen.getByText('Credits in Term: 7')).toBeInTheDocument();
    expect(screen.getByText('CS101')).toBeInTheDocument();
    expect(screen.getByText('CS120')).toBeInTheDocument();
  });
});

describe('Residual CSS cleanup (#26)', () => {
  const cssPath = path.resolve(__dirname, '../index.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  it('purges all orphaned .req-popover-* classes and popover keyframes', () => {
    expect(css).not.toMatch(/\.req-popover-/);
    expect(css).not.toMatch(/@keyframes\s+popoverFadeIn/);
  });

  it('purges all orphaned .btn-popover-* classes', () => {
    expect(css).not.toMatch(/\.btn-popover-/);
  });

  it('purges all unused .add-course-variant-* classes', () => {
    expect(css).not.toMatch(/\.add-course-variant-/);
  });

  it('purges all unused .variant-b-* classes', () => {
    expect(css).not.toMatch(/\.variant-b-/);
  });

  it('purges all unused .variant-c-* classes', () => {
    expect(css).not.toMatch(/\.variant-c-/);
  });
});
