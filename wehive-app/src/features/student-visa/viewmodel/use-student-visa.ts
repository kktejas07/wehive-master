import { useState } from 'react';

import { COURSE_CATEGORIES, STUDENT_COUNTRIES, type CourseCategory, type StudentCountry } from '../model/types';

export function useStudentVisa() {
  const [selectedCountry, setSelectedCountry] = useState<StudentCountry | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory | null>(null);

  return {
    countries: STUDENT_COUNTRIES,
    categories: COURSE_CATEGORIES,
    selectedCountry,
    setSelectedCountry,
    selectedCategory,
    setSelectedCategory,
  };
}
